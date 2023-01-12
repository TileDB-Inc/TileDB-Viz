import { Vector3 } from '@babylonjs/core';
import {
  DataRequest,
  DataResponse,
  InitialRequest,
  WorkerResponse,
  WorkerType
} from '../model';
import { MoctreeBlock } from '../octree';

class TileDBWorkerPool {
  private poolSize: number;
  private workers: Worker[] = [];
  private callbackFn: (block: MoctreeBlock) => void;
  private mapStatus: Map<Worker, boolean>;

  constructor(
    initRequest: InitialRequest,
    callbackFn: (block: MoctreeBlock) => void,
    poolSize: number
  ) {
    this.poolSize = poolSize || 5;
    this.callbackFn = callbackFn;
    this.mapStatus = new Map<Worker, boolean>();

    for (let w = 0; w < this.poolSize; w++) {
      const worker = new Worker(new URL('tiledb.worker', import.meta.url), {
        type: 'module'
      });
      worker.onmessage = this.onData(worker);
      worker.postMessage(initRequest);
      this.workers.push(worker);
      this.mapStatus.set(worker, false);
    }
  }

  private onData = (workerInstance: Worker) => (e: MessageEvent) => {
    const m = e.data as WorkerResponse;
    if (m.type === WorkerType.data) {
      const resp = m as DataResponse;
      let block = resp.block;

      // refresh block as it was serialized,
      block = new MoctreeBlock(
        block.lod,
        block.mortonNumber,
        new Vector3(block.minPoint._x, block.minPoint._y, block.minPoint._z),
        new Vector3(block.maxPoint._x, block.maxPoint._y, block.maxPoint._z),
        block.entries
      );
      this.callbackFn(block);
    } else if (m.type === WorkerType.idle) {
      this.mapStatus.set(workerInstance, false);
    }
  };

  public postMessage(request: DataRequest) {
    // loop over available workers
    for (const [worker, v] of this.mapStatus) {
      if (!v) {
        worker.postMessage(request);
        this.mapStatus.set(worker, true);
        break;
      }
    }
  }

  public numActive() {
    let c = 0;
    this.mapStatus.forEach(v => {
      if (v === true) {
        c++;
      }
    });
    return c;
  }

  public isReady() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_, value] of this.mapStatus) {
      if (value === false) {
        return true;
      }
    }
    return false;
  }
}

export { TileDBWorkerPool };
