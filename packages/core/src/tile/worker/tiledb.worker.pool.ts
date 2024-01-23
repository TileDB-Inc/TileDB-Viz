import { OperationResult, PointCloudOperation } from '@tiledb-inc/viz-common';
import {
  DataRequest,
  InitializeMessage,
  RequestType,
  WorkerResponse,
  ImageResponse,
  ResponseCallback,
  GeometryResponse,
  InfoResponse,
  PointResponse
} from '../types';

export interface WorkerPoolOptions {
  token?: string;
  basePath?: string;
  poolSize?: number;
  callbacks?: ResponseCallback;
}

export class WorkerPool {
  public callbacks: ResponseCallback;

  private poolSize: number;
  private workers: Worker[] = [];
  private operationsQueue: PointCloudOperation[] = [];
  private status: boolean[] = [];
  private taskMap: Map<string, number>;
  private messageQueue: DataRequest[] = [];
  private initilizeMessage: DataRequest;

  constructor(options?: WorkerPoolOptions) {
    this.poolSize = options?.poolSize ?? window.navigator.hardwareConcurrency;
    this.callbacks = options?.callbacks ?? {
      image: [],
      geometry: [],
      point: [],
      pointOperation: [],
      info: [],
      cancel: []
    };
    this.taskMap = new Map<string, number>();
    this.initilizeMessage = {
      type: RequestType.INITIALIZE,
      request: {
        token: options?.token ?? '',
        basePath: options?.basePath
      } as InitializeMessage
    } as DataRequest;

    for (let index = 0; index < this.poolSize - 1; index++) {
      const worker = new Worker(new URL('tiledb.worker', import.meta.url), {
        type: 'module',
        name: `Worker ${index}`
      });

      worker.onmessage = this.onMessage.bind(this);
      worker.postMessage(this.initilizeMessage);
      this.workers.push(worker);
      this.status.push(false);
    }

    const worker = new Worker(
      new URL('tiledb.worker.pointcloud', import.meta.url),
      {
        type: 'module',
        name: 'Point Cloud Operations Worker'
      }
    );

    worker.onmessage = this.operationOnMessage.bind(this);
    this.workers.push(worker);
    this.status.push(false);
  }

  private async onMessage(event: MessageEvent<WorkerResponse>) {
    const response = event.data;
    const workerIndex = this.taskMap.get(response.id);

    if (workerIndex === undefined) {
      console.error(`Task ${response.id} assigned to unknown worker`);
      return;
    }

    switch (response.type) {
      case RequestType.IMAGE:
        for (const callback of this.callbacks.image) {
          callback(response.id, response.response as ImageResponse);
        }
        break;
      case RequestType.GEOMETRY:
        for (const callback of this.callbacks.geometry) {
          callback(response.id, response.response as GeometryResponse);
        }
        break;
      case RequestType.GEOMETRY_INFO:
      case RequestType.POINT_INFO:
        for (const callback of this.callbacks.info) {
          callback(response.id, response.response as InfoResponse);
        }
        break;
      case RequestType.POINT:
        for (const callback of this.callbacks.point) {
          callback(response.id, response.response as PointResponse);
        }
        break;
      case RequestType.CANCEL:
        for (const callback of this.callbacks.cancel) {
          callback(response.id, response.response);
        }
        break;
      default:
        console.warn(`Unknown response type ${response.type}`);
    }

    const request = this.messageQueue.pop();

    if (request) {
      this.workers[workerIndex].postMessage(request);
      this.taskMap.set(request?.id, workerIndex);
    } else {
      this.status[workerIndex] = false;
    }
  }

  public cancelRequest(request: DataRequest) {
    const workerIndex = this.taskMap.get(request.id);
    const index = this.messageQueue.findIndex(
      (item: DataRequest) => item.id === request.id
    );

    if (workerIndex !== undefined) {
      this.workers[workerIndex].postMessage({
        id: request.id,
        type: RequestType.CANCEL
      } as DataRequest);
    }

    if (index !== -1) {
      this.messageQueue.splice(index, 1);
    }
  }

  public postMessage(request: DataRequest, transferables?: Transferable[]) {
    let dispached = false;
    for (const [index, status] of this.status.entries()) {
      if (!status && index !== this.poolSize - 1) {
        this.workers[index].postMessage(request, transferables ?? []);
        this.status[index] = true;
        this.taskMap.set(request.id, index);

        dispached = true;
        break;
      }
    }

    if (!dispached) {
      this.messageQueue.push(request);
    }
  }

  public cleanUp() {
    // terminate only busy workers
    for (const [index, status] of this.status.entries()) {
      if (!status) {
        this.workers[index].terminate();

        const newWorker = new Worker(
          new URL('tiledb.worker', import.meta.url),
          {
            type: 'module',
            name: `Worker ${index}`
          }
        );

        newWorker.postMessage(this.initilizeMessage);
        newWorker.onmessage = this.onMessage.bind(this);
        this.workers[index] = newWorker;
        this.status[index] = false;
      }
    }
  }

  public dispose() {
    for (const [index] of this.status.entries()) {
      this.workers[index].terminate();
    }
  }

  public numActive() {
    return this.status.filter(status => status).length;
  }

  public isReady() {
    return this.numActive() === this.workers.length;
  }

  public postOperation(operation: PointCloudOperation) {
    if (!this.status[this.poolSize - 1]) {
      this.workers[this.poolSize - 1].postMessage(operation);
    } else {
      this.operationsQueue.push(operation);
    }
  }

  private async operationOnMessage(event: MessageEvent<OperationResult>) {
    const response = event.data;

    for (const callback of this.callbacks.pointOperation) {
      callback(response.id, response);
    }

    const request = this.operationsQueue.pop();

    if (request) {
      this.workers[this.poolSize - 1].postMessage(request);
    } else {
      this.status[this.poolSize - 1] = false;
    }
  }
}
