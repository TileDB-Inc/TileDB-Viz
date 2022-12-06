import { Vector3 } from '@babylonjs/core';
import {
  DataRequest,
  DataResponse,
  IdleResponse,
  InitialRequest,
  WorkerResponse,
  WorkerType
} from '../model';
import { MoctreeBlock } from '../octree';

class TileDBWorkerPool {
  private poolSize: number;
  private workers: Worker[] = [];
  private callbackFn: (block: MoctreeBlock) => void;
  private mapStatus: Map<string, boolean>;

  constructor(
    initRequest: InitialRequest,
    callbackFn: (block: MoctreeBlock) => void,
    poolSize: number
  ) {
    this.poolSize = poolSize || 5;
    this.callbackFn = callbackFn;
    this.mapStatus = new Map<string, boolean>();

    for (let w = 0; w < this.poolSize; w++) {
      const worker = new Worker(new URL('tiledb.worker', import.meta.url), {
        type: 'module',
        name: w.toString()
      });
      worker.onmessage = this.onData.bind(this);
      worker.postMessage(initRequest);
      this.workers.push(worker);
      this.mapStatus.set(w.toString(), false);
    }
  }

  private onData(e: MessageEvent) {
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
      const idleMessage = m as IdleResponse;
      this.mapStatus.set(idleMessage.name, false);
    }
  }

  public postMessage(request: DataRequest) {
    // loop over available workers
    for (const [k, v] of this.mapStatus) {
      if (!v) {
        this.workers[parseInt(k)].postMessage(request);
        this.mapStatus.set(k, true);
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