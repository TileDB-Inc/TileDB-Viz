import {
  DataRequest,
  InitializeMessage,
  RequestType,
  WorkerResponse,
  ImageResponse,
  ResponseCallback
} from '../types';

export interface WorkerPoolOptions {
  token?: string;
  basePath?: string;
  poolSize?: number;
  callbacks?: ResponseCallback;
}

export class WorkerPool {
  private scriptPath: string;
  private poolSize: number;
  public callbacks: ResponseCallback;
  private workers: Worker[] = [];
  private status: boolean[] = [];
  private taskMap: Map<string, number>;
  private messageQueue: DataRequest[] = [];
  private initilizeMessage: DataRequest;

  constructor(scriptPath: string, options?: WorkerPoolOptions) {
    this.scriptPath = scriptPath;
    this.poolSize = options?.poolSize ?? window.navigator.hardwareConcurrency;
    this.callbacks = options?.callbacks ?? {};
    this.taskMap = new Map<string, number>();
    this.initilizeMessage = {
      type: RequestType.INITIALIZE,
      request: {
        token: options?.token ?? '',
        basePath: options?.basePath
      } as InitializeMessage
    } as DataRequest;

    for (let index = 0; index < this.poolSize; index++) {
      const worker = new Worker(new URL('tiledb.worker', import.meta.url), {
        type: 'module',
        name: `Worker ${index}`
      });

      worker.onmessage = this.onMessage.bind(this);
      worker.postMessage(this.initilizeMessage);
      this.workers.push(worker);
      this.status.push(false);
    }
  }

  private async onMessage(event: MessageEvent<WorkerResponse>) {
    const response = event.data;
    const workerIndex = this.taskMap.get(response.id)!;

    switch (response.type) {
      case RequestType.IMAGE:
        if (this.callbacks.image) {
          this.callbacks.image(response.id, response.response as ImageResponse);
        }
        break;
      // case RequestType.GEOMETRY:
      //   this.callbacks.get(RequestType.GEOMETRY)(response.response as GeometryResponse);
      //   break;
      case RequestType.CANCEL:
        break;
      default:
        console.warn(`Unknown response type ${response.type}`);
    }

    if (this.messageQueue.length > 0) {
      const request = this.messageQueue.pop()!;

      this.workers[workerIndex].postMessage(request);
      this.taskMap.set(request?.id, workerIndex);
    } else {
      this.status[workerIndex] = false;
    }
  }

  public cancelRequest(request: DataRequest) {
    const workerIndex = this.taskMap.get(request.id);

    if (workerIndex !== undefined) {
      this.workers[workerIndex].postMessage({
        id: request.id,
        type: RequestType.CANCEL
      } as DataRequest);
    } else {
      const index = this.messageQueue.findIndex(
        (item: DataRequest) => item.id === request.id
      );
      this.messageQueue.splice(index, 1);
    }
  }

  public postMessage(request: DataRequest) {
    let dispached = false;
    for (const [index, status] of this.status.entries()) {
      if (!status) {
        this.workers[index].postMessage(request);
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

  public async cleanUp() {
    // terminate only busy workers
    for (const [index, status] of this.status.entries()) {
      if (!status) {
        this.workers[index].terminate();

        const newWorker = new Worker(
          new URL(this.scriptPath, import.meta.url),
          {
            type: 'module',
            name: `Worker ${index}`
          }
        );

        newWorker.postMessage(this.initilizeMessage); // message to initalize the tiledb client
        newWorker.onmessage = this.onMessage.bind(this);
        this.workers[index] = newWorker;
        this.status[index] = false;
      }
    }
  }

  public numActive() {
    return this.status.filter(status => status).length;
  }

  public isReady() {
    return this.numActive() === this.workers.length;
  }
}
