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
import stringifyQuery from '../utils/stringifyQuery';

let namespace = '';
let arrayName = '';
let translateX = 0;
let translateY = 0;
let translateZ = 0;
let bufferSize = 200000000;

let tiledbQuery: TileDBQuery;

self.onmessage = async (e: MessageEvent) => {
  const m = e.data as WorkerRequest;
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

  if (m.type === WorkerType.data) {
    const o = m as DataRequest;
    fetchData(o.block);
  }
};

function returnData(block: MoctreeBlock) {
  // post block back
  if (block.entries) {
    // TODO use transferable objects
    self.postMessage(block);
  }
}

async function fetchData(block: MoctreeBlock) {
  const queryCacheKey = stringifyQuery(
    block.mortonNumber,
    namespace as string,
    arrayName + '_' + block.lod
  );
  const storeName = namespace + ':' + arrayName;
  // we might have the data cached
  const dataFromCache = await getQueryDataFromCache(storeName, queryCacheKey);

  if (dataFromCache) {
    block.entries = dataFromCache as SparseResult;
    returnData(block);
  } else {
    // load points into block
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
      arrayName + '_' + block.lod,
      queryData
    )) {
      block.entries = results as SparseResult;

      returnData(block);
      await writeToCache(storeName, queryCacheKey, results);
    }
  }
}
