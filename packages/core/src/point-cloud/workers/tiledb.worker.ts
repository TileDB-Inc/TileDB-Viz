import TileDBClient, { TileDBQuery, QueryData } from '@tiledb-inc/tiledb-cloud';
import { getQueryDataFromCache, writeToCache } from '../../utils/cache';

import {
  BoundsDataRequest,
  BoundsSetDataRequest,
  DataRequest,
  IdleResponse,
  InitialRequest,
  SparseResult,
  WorkerRequest,
  WorkerType
} from '../model';
import { MoctreeBlock, BoundsRequest, DataBlock } from '../octree';

let namespace = '';
let arrayName = '';
let translateX = 0;
let translateY = 0;
let translateZ = 0;
let bufferSize = 200000000;

let tiledbQuery: TileDBQuery;

self.onmessage = async (e: MessageEvent) => {
  const m = e.data as WorkerRequest;
  // console.log('window recv message: msg');
  if (m.type === WorkerType.init) {
    const o = m as InitialRequest;
    namespace = o.namespace;
    arrayName = o.arrayName;
    translateX = o.translateX;
    translateY = o.translateY;
    translateZ = o.translateZ;
    bufferSize = o.bufferSize;

    const tiledbClient = new TileDBClient({
      apiKey: o.token
    });
    tiledbQuery = tiledbClient.query;
  }

  // if (m.type === WorkerType.data) {
  //   const o = m as DataRequest;
  //   fetchData(o.block);
  // }
  if (m.type === WorkerType.boundsData) {
    const o = m as BoundsDataRequest;
    fetchBoundsData(o.bounds);
  }
  if (m.type === WorkerType.boundsSetData) {
    const o = m as BoundsSetDataRequest;
    const boundsSet = o.boundsSet;
    // fetchBoundsSetData(boundsSet);
    for (let bounds of boundsSet) {
      fetchBoundsData(bounds);
    }
  }
};

function returnDataBlock(block: DataBlock) {
  // block.entries = block.entries;
  // block.heapIdx = block.heapIdx;
  self.postMessage({type: WorkerType.boundsData, block: block, name: self.name});
}

function returnDataBlockSet(blocks: DataBlock[]) {
  self.postMessage({type: WorkerType.boundsSetData, blocks: blocks, name: self.name});
}

async function fetchBoundsData(bounds: BoundsRequest) {
  console.log('fetchBoundsData: bounds: heapIdx: ', bounds.heapIdx);
  let queryCacheKey = bounds.heapIdx;
  if (queryCacheKey === 0) queryCacheKey = 2396746; // > level 8
  const storeName = `${namespace}:${arrayName}`;
  // we might have the data cached
  const dataFromCache = await getQueryDataFromCache(storeName, queryCacheKey);
  const block = new DataBlock();
  block.heapIdx = bounds.heapIdx;
  if (dataFromCache) {
    console.log('dataFromCache');
    block.entries = dataFromCache as SparseResult;
    returnDataBlock(block);
  } else {
    // load points into block, block is now just a serialized json object, no methods so use private accessors
    const ranges = [
      [bounds.minPoint._x + translateX, bounds.maxPoint._x + translateX],
      [bounds.minPoint._z + translateZ, bounds.maxPoint._z + translateZ], // Y is Z,
      [bounds.minPoint._y + translateY, bounds.maxPoint._y + translateY]
    ];

    const queryData = {
      layout: 'row-major',
      ranges: ranges,
      attributes: ['X', 'Y', 'Z', 'Red', 'Green', 'Blue'], // choose a subset of attributes
      bufferSize: bufferSize
    } as QueryData;

    // console.log('query name: ', arrayName + '_' + bounds.lod);
    for await (const results of tiledbQuery.ReadQuery(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      namespace,
      arrayName + '_' + bounds.lod.toString(),
      queryData
    )) {
      // console.log('results: ', results);
      block.entries = results as SparseResult;
      returnDataBlock(block);
      await writeToCache(storeName, queryCacheKey, results);
    }
  }
  // console.log('worker name: ', self.name);
    self.postMessage({
      type: WorkerType.idle,
      name: self.name,
      idle: true
    } as IdleResponse);
}

async function fetchBoundsSetData(boundsSet: BoundsRequest[]) {
  console.log('fetchBoundsSetData: boundsSet: ', boundsSet);
  const blocks: DataBlock[] = [];
  for (let bounds of boundsSet) {
    let queryCacheKey = bounds.heapIdx;
    if (queryCacheKey === 0) queryCacheKey = 2396746; // > level 8
    const storeName = `${namespace}:${arrayName}`;
    // we might have the data cached
    const dataFromCache = await getQueryDataFromCache(storeName, queryCacheKey);
    const block = new DataBlock();
    block.heapIdx = bounds.heapIdx;
    if (dataFromCache) {
      console.log('dataFromCache');
      block.entries = dataFromCache as SparseResult;
      blocks.push(block);
      // returnDataBlock(block);
    } else {
      // load points into block, block is now just a serialized json object, no methods so use private accessors
      const ranges = [
        [bounds.minPoint._x + translateX, bounds.maxPoint._x + translateX],
        [bounds.minPoint._z + translateZ, bounds.maxPoint._z + translateZ], // Y is Z,
        [bounds.minPoint._y + translateY, bounds.maxPoint._y + translateY]
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
        arrayName + '_' + bounds.lod.toString(),
        queryData
      )) {
        block.entries = results as SparseResult;
        blocks.push(block) // assumes copy in push
        // returnDataBlock(block);
        await writeToCache(storeName, queryCacheKey, results);
      }
    }
  }
  if (blocks.length) {
    returnDataBlockSet(blocks);
  }
  
  // console.log('worker name: ', self.name);
  self.postMessage({
    type: WorkerType.idle,
    name: self.name,
    idle: true
  } as IdleResponse);
}

