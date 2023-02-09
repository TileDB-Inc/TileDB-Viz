import TileDBClient, { TileDBQuery, QueryData } from '@tiledb-inc/tiledb-cloud';
import { getQueryDataFromCache, writeToCache } from '../../utils/cache';

import {
  DataRequest,
  InitialRequest,
  SparseResult,
  WorkerRequest,
  WorkerType
} from '../model';
import { MoctreeBlock } from '../octree';
import { HTBlock } from '../octree/heaptree';
import { onmessage } from '../../constants';

let namespace = '';
let groupName = '';
let translateX = 0;
let translateY = 0;
let translateZ = 0;
let bufferSize = 200000000;

let tiledbQuery: TileDBQuery;

interface OnMessage<BlockType> {
  (e: MessageEvent): void;
}

async function onmessageMoctree(e: MessageEvent) {
  const m = e.data as WorkerRequest;
  if (m.type === WorkerType.init) {
    const o = m as InitialRequest;
    namespace = o.namespace;
    groupName = o.groupName;
    translateX = o.translateX;
    translateY = o.translateY;
    translateZ = o.translateZ;
    bufferSize = o.bufferSize;

    const tiledbClient = new TileDBClient({
      apiKey: o.token,
      ...(o.tiledbEnv ? { basePath: o.tiledbEnv } : {})
    });
    tiledbQuery = tiledbClient.query;
  }

  if (m.type === WorkerType.data) {
    const o = m as DataRequest<MoctreeBlock>;
    fetchDataMoctree(o.block);
  }
};

async function onmessageHeapTree(e: MessageEvent) {
  const m = e.data as WorkerRequest;
  if (m.type === WorkerType.init) {
    const o = m as InitialRequest;
    namespace = o.namespace;
    groupName = o.groupName;
    translateX = o.translateX;
    translateY = o.translateY;
    translateZ = o.translateZ;
    bufferSize = o.bufferSize;

    const tiledbClient = new TileDBClient({
      apiKey: o.token,
      ...(o.tiledbEnv ? { basePath: o.tiledbEnv } : {})
    });
    tiledbQuery = tiledbClient.query;
  }

  if (m.type === WorkerType.data) {
    const o = m as DataRequest<HTBlock>;
    fetchDataHeapTree(o.block);
  }
};

self.onmessage = onmessage;

function returnData<BlockType>(block: BlockType) {
  // TODO use transferable objects
  self.postMessage({
    type: WorkerType.data,
    block: block,
    name: self.name
  });
}

async function fetchDataMoctree(block: MoctreeBlock) {
  const queryCacheKey = block.mortonNumber;
  const storeName = `${namespace}:${groupName}`;

  // we might have the data cached
  const dataFromCache = await getQueryDataFromCache(storeName, queryCacheKey);

  if (dataFromCache) {
    block.entries = dataFromCache as SparseResult;
    returnData(block);
    self.postMessage({
      type: WorkerType.idle,
      name: self.name,
      idle: true
    });
  } else {
    // load points into block, block is now just a serialized json object, no methods so use private accessors
    const ranges = [
      [block.minPoint._x + translateX, block.maxPoint._x + translateX],
      [block.minPoint._z + translateZ, block.maxPoint._z + translateZ], // Y is Z,
      [block.minPoint._y + translateY, block.maxPoint._y + translateY]
    ];

    const queryData = {
      layout: 'row-major',
      ranges: ranges,
      attributes: ['X', 'Y', 'Z', 'Red', 'Green', 'Blue'], // choose a subset of attributes
      bufferSize: bufferSize
    } as QueryData;

    for await (const results of tiledbQuery.ReadQuery(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      namespace,
      groupName + '_' + block.lod,
      queryData
    )) {
      block.entries = results as SparseResult;
      returnData(block);
      await writeToCache(storeName, queryCacheKey, results);
      self.postMessage({
        type: WorkerType.idle,
        name: self.name,
        idle: true
      });
    }
  }
}

async function fetchDataHeapTree(block: HTBlock) {
  let queryCacheKey = block.code;
  if (block.code === 0) {
    queryCacheKey = 4_000_000;
  }
  const storeName = `${namespace}:${groupName}`;

  // we might have the data cached
  const dataFromCache = await getQueryDataFromCache(storeName, queryCacheKey);

  if (dataFromCache) {
    block.entries = dataFromCache as SparseResult;
    returnData(block);
    self.postMessage({
      type: WorkerType.idle,
      name: self.name,
      idle: true
    });
  } else {
    // load points into block, block is now just a serialized json object, no methods so use private accessors
    const ranges = [
      [block.code, block.code]
    ];

    const queryData = {
      layout: 'row-major',
      ranges: ranges,
      attributes: ['X', 'Y', 'Z', 'Red', 'Green', 'Blue'], // choose a subset of attributes
      bufferSize: bufferSize
    } as QueryData;

    for await (const results of tiledbQuery.ReadQuery(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      namespace,
      groupName,
      queryData
    )) {
      block.entries = results as SparseResult;
      returnData(block);
      await writeToCache(storeName, queryCacheKey, results);
      self.postMessage({
        type: WorkerType.idle,
        name: self.name,
        idle: true
      });
    }
  }
}

export { OnMessage, onmessageMoctree, onmessageHeapTree };