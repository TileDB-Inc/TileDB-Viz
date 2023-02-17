import { Vector3 } from '@babylonjs/core';
import { writeToCache } from '../../utils/cache';
import {
  DataRequest,
  DataResponse,
  IdleResponse,
  InitialRequest,
  WorkerResponse,
  WorkerType
} from '../model';
import { MoctreeBlock } from '../octree';
import buffersToSparseResult from '../utils/buffersToSparseResult';

class TileDBWorkerPool {
  private poolSize: number;
  private workers: Worker[] = [];
  private callbackFn: (block: MoctreeBlock) => void;
  private mapStatus: Map<string, boolean>;
  private initRequest: InitialRequest;

  constructor(
    initRequest: InitialRequest,
    callbackFn: (block: MoctreeBlock) => void,
    poolSize: number
  ) {
    this.poolSize = poolSize || 5;
    this.callbackFn = callbackFn;
    this.mapStatus = new Map<string, boolean>();
    this.initRequest = initRequest;

    for (let w = 0; w < this.poolSize; w++) {
      const worker = new Worker(new URL('tiledb.worker', import.meta.url), {
        type: 'module',
        name: w.toString()
      });
      worker.onmessage = this.onData.bind(this);
      worker.postMessage(this.initRequest);
      this.workers.push(worker);
      this.mapStatus.set(w.toString(), false);
    }
  }

  private async onData(e: MessageEvent) {
    const m = e.data as WorkerResponse;
    if (m.type === WorkerType.data) {
      const resp = m as DataResponse;
      let block = resp.block;
      const { entries } = resp;

      // refresh block as it was serialized,
      block = new MoctreeBlock(
        block.lod,
        block.mortonNumber,
        new Vector3(block.minPoint._x, block.minPoint._y, block.minPoint._z),
        new Vector3(block.maxPoint._x, block.maxPoint._y, block.maxPoint._z),
        block.entries
      );

      block.entries = buffersToSparseResult(entries);

      const queryCacheKey = block.mortonNumber;
      const storeName = `${this.initRequest.namespace}:${this.initRequest.groupName}`;
      this.callbackFn(block);

      await writeToCache(storeName, queryCacheKey, block);
    } else if (m.type === WorkerType.idle) {
      const idleMessage = m as IdleResponse;
      this.mapStatus.set(idleMessage.name, false);
    }
  }

  public async postMessage(request: DataRequest) {
    // loop over available workers
    for (const [k, v] of this.mapStatus) {
      if (!v) {
        this.workers[parseInt(k)].postMessage(request);
        this.mapStatus.set(k, true);
        break;
      }
    }
  }

  public async cleanUp() {
    // terminate only busy workers
    for (const [k, v] of this.mapStatus) {
      if (!v) {
        this.workers[parseInt(k)].terminate();
        const newWorker = new Worker(
          new URL('tiledb.worker', import.meta.url),
          {
            type: 'module',
            name: k
          }
        );
        newWorker.postMessage(this.initRequest); // message to initalize the tiledb client
        newWorker.onmessage = this.onData.bind(this);
        this.workers[parseInt(k)] = newWorker;
        this.mapStatus.set(k, false);
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
