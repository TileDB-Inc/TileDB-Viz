import { Vector3 } from '@babylonjs/core';
import {
  BoundsDataRequest,
  DataRequest,
  DataResponse,
  BlockDataResponse,
  IdleResponse,
  InitialRequest,
  WorkerResponse,
  WorkerType,
  WorkerRequest,
  BlockSetDataResponse
} from '../model';
import { MoctreeBlock, DataBlock } from '../octree';

class TileDBWorkerPool {
  private poolSize: number;
  private workers: Worker[] = [];
  private callbackFn: (block: DataBlock) => void;
  private blockSetLoader: (blocks: DataBlock[]) => void;
  private mapStatus: Map<string, boolean>;

  constructor(
    initRequest: InitialRequest,
    callbackFn: (block: DataBlock) => void,
    blockSetLoader: (blocks: DataBlock[]) => void,
    poolSize: number
  ) {
    this.poolSize = poolSize || 40;
    this.callbackFn = callbackFn;
    this.blockSetLoader = blockSetLoader;
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
    if (m.type == WorkerType.init) {
      for (let w = 0; w < this.poolSize; ++w) {
        const worker = this.workers[w];
        worker.postMessage(m);
        this.mapStatus.set(w.toString(), false);
      }
      return;
    }
    // console.log('worker recv resp: data: ', m);
    if (m.type === WorkerType.boundsData) {
      const resp = m as BlockDataResponse;
      let oldBlock = resp.block;
      let block = new DataBlock();
      block.entries = oldBlock.entries;
      block.heapIdx = oldBlock.heapIdx;
      this.callbackFn(block);
    } else if (m.type === WorkerType.boundsSetData) {
      const resp = m as BlockSetDataResponse;
      this.blockSetLoader(resp.blocks);
    } else if (m.type === WorkerType.idle) {
      const idleMessage = m as IdleResponse;
      console.log('idle response from: ', idleMessage.name);
      this.mapStatus.set(idleMessage.name, false);
    }
  }

  public postMessage(request: WorkerRequest) {
    if (request.type === WorkerType.init) {
      for (let w = 0; w < this.poolSize; ++w) {
        const worker = this.workers[w];
        worker.postMessage(request);
        this.mapStatus.set(w.toString(), false);
      }
      return;
    }
    for (const [k, v] of this.mapStatus) {
      if (!v) {
        this.workers[parseInt(k)].postMessage(request);
        this.mapStatus.set(k, true);
        return;
      } 
    }
    // this.postMessage(request);
  }

  // public postMessage(request: DataRequest) {
  //   // loop over available workers
  //   for (const [k, v] of this.mapStatus) {
  //     if (!v) {
  //       this.workers[parseInt(k)].postMessage(request);
  //       this.mapStatus.set(k, true);
  //       break;
  //     }
  //   }
  // }

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

  public full() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const minActive = this.poolSize/4;
    let count = 0;
    for (const [_, value] of this.mapStatus) {
      if (value === false) {
        ++count;
      }
      if (count === minActive) {
        return false;
      }
    }
    return true;
  }
}

export { TileDBWorkerPool };
