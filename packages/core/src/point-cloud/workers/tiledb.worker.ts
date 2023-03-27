import TileDBClient, { TileDBQuery, QueryData } from '@tiledb-inc/tiledb-cloud';
import { ArraySchema, Layout } from '@tiledb-inc/tiledb-cloud/lib/v1';
import { SparseResult, TransformedResult } from '../model/sparse-result';

import {
  DataRequest,
  InitialRequest,
  SparseResultRaw,
  WorkerRequest,
  WorkerType
} from '../model/sparse-result';
import { MoctreeBlock } from '../octree';
import buffersToSparseResult from '../utils/buffersToSparseResult';

let namespace = '';
let groupName = '';
let arraySchema: ArraySchema;
let translateX = 0;
let translateY = 0;
let translateZ = 0;
let zScale = 1;
let rgbMax = 255;
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
    zScale = o.zScale;
    rgbMax = o.rgbMax;
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
  // Transform the raw buffers to the position and color arrays to use directly
  // for the PCS initialization. This operation is perfromed on the the worker to avoid
  // CPU intensive work on the main thread.

  const result: SparseResult = buffersToSparseResult(rawEntries);

  const entries = {
    Position: new Float32Array(result.X.length * 3),
    Color: new Float32Array(result.X.length * 4),
    GpsTime: result.GpsTime || new Float64Array()
  } as TransformedResult;

  for (let i = 0; i < result.X.length; ++i) {
    entries.Position[3 * i] = result.X[i] - translateX;
    entries.Position[3 * i + 1] = (result.Z[i] - translateY) * zScale;
    entries.Position[3 * i + 2] = result.Y[i] - translateZ;

    entries.Color[4 * i] = result.Red[i] / rgbMax;
    entries.Color[4 * i + 1] = result.Green[i] / rgbMax;
    entries.Color[4 * i + 2] = result.Blue[i] / rgbMax;
    entries.Color[4 * i + 3] = 1;
  }

  self.postMessage(
    {
      type: WorkerType.data,
      block: block,
      entries: entries,
      name: self.name
    },
    [
      entries.Position.buffer,
      entries.Color.buffer,
      entries.GpsTime.buffer
    ] as any
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
    layout: Layout.Unordered,
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
