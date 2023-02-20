import TileDBClient, { TileDBQuery, QueryData } from '@tiledb-inc/tiledb-cloud';
import { ArraySchema } from '@tiledb-inc/tiledb-cloud/lib/v1';

import {
  DataRequest,
  InitialRequest,
  SparseResultRaw,
  WorkerRequest,
  WorkerType
} from '../model/sparse-result';
import { MoctreeBlock } from '../octree';

let namespace = '';
let groupName = '';
let arraySchema: ArraySchema;
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
    groupName = o.groupName;
    arraySchema = o.arraySchema;
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
    const o = m as DataRequest;
    fetchData(o.block);
  }
};

function returnData(block: MoctreeBlock, rawEntries: SparseResultRaw) {
  self.postMessage(
    {
      type: WorkerType.data,
      block: block,
      entries: rawEntries,
      name: self.name
    },
    Object.values(rawEntries) as any
  );
}

async function fetchData(block: MoctreeBlock) {
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
    bufferSize: bufferSize,
    returnRawBuffers: true
  } as QueryData;

  for await (const results of tiledbQuery.ReadQuery(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    namespace,
    groupName + '_' + block.lod,
    queryData,
    arraySchema
  )) {
    returnData(block, results as SparseResultRaw);
  }

  self.postMessage({
    type: WorkerType.idle,
    name: self.name,
    idle: true
  });
}
