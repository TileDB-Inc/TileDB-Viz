import { Vector3 } from '@babylonjs/core';
import {
  DataRequest,
  DataResponse,
  IdleResponse,
  InitialRequest,
  SparsePoint,
  SparseResult,
  WorkerResponse,
  WorkerType
} from '../model';
import { MoctreeBlock } from '../octree';
import { HTBlock } from '../octree/heaptree';

class TileDBWorkerPool<BlockType> {
  protected poolSize: number;
  protected workers: Worker[] = [];
  protected callbackFn: (block: BlockType) => void;
  protected mapStatus: Map<string, boolean>;

  constructor(
    initRequest: InitialRequest,
    callbackFn: (block: BlockType) => void,
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

  protected onData(e: MessageEvent) {
    throw Error("TileDBWorkerPool not implemented for this block type");
  }

  public postMessage(request: DataRequest<BlockType>) {
    throw Error("TileDBWorkerPool not implemented for this block type");
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

class TileDBWorkerPoolMoctree extends TileDBWorkerPool<MoctreeBlock> {
  protected onData(e: MessageEvent) {
    const m = e.data as WorkerResponse;
    if (m.type === WorkerType.data) {
      const resp = m as DataResponse<MoctreeBlock>;
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

  public postMessage(request: DataRequest<MoctreeBlock>) {
    // loop over available workers
    for (const [k, v] of this.mapStatus) {
      if (!v) {
        this.workers[parseInt(k)].postMessage(request);
        this.mapStatus.set(k, true);
        break;
      }
    }
  }
}

class TileDBWorkerPoolHeapTree extends TileDBWorkerPool<HTBlock> {
  protected onData(e: MessageEvent) {
    const m = e.data as WorkerResponse;
    if (m.type === WorkerType.data) {
      const resp = m as DataResponse<HTBlock>;
      let block = resp.block;

      // refresh block as it was serialized,
      block = new HTBlock(
        block.lod,
        block.code,
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

  public postMessage(request: DataRequest<HTBlock>) {
    // loop over available workers
    for (const [k, v] of this.mapStatus) {
      if (!v) {
        this.workers[parseInt(k)].postMessage(request);
        this.mapStatus.set(k, true);
        break;
      }
    }
  }
}


export { TileDBWorkerPool, TileDBWorkerPoolMoctree, TileDBWorkerPoolHeapTree };
