import { ArraySchema } from '@tiledb-inc/tiledb-cloud/lib/v1';
import { MoctreeBlock } from '../octree';

interface SparsePoint {
  x: number;
  y: number;
  z: number;
  red: number;
  green: number;
  blue: number;
  gpsTime?: number;
}

interface SparseResult {
  X: Float32Array;
  Y: Float32Array;
  Z: Float32Array;
  Red: Uint16Array;
  Green: Uint16Array;
  Blue: Uint16Array;
  GpsTime?: Float64Array;
}

interface TransformedResult {
  Position: Float32Array;
  Color: Float32Array;
  GpsTime?: Float64Array;
}

export interface SparseResultRaw {
  X: ArrayBuffer;
  Y: ArrayBuffer;
  Z: ArrayBuffer;
  Red: ArrayBuffer;
  Green: ArrayBuffer;
  Blue: ArrayBuffer;
  GpsTime?: ArrayBuffer;
}

enum WorkerType {
  init,
  data,
  idle
}

interface WorkerRequest {
  type: WorkerType;
}

interface WorkerResponse {
  type: WorkerType;
  name: string;
}

interface InitialRequest extends WorkerRequest {
  namespace: string;
  groupName: string;
  arraySchema: ArraySchema;
  tiledbEnv: string;
  token: string;
  translateX: number;
  translateY: number;
  translateZ: number;
  zScale: number;
  rgbMax: number;
  bufferSize: number;
  id?: number;
}

interface DataRequest extends WorkerRequest {
  block: MoctreeBlock;
}

interface DataResponse extends WorkerResponse {
  block: MoctreeBlock;
  entries: TransformedResult;
}

interface IdleResponse extends WorkerResponse {
  idle: boolean;
}

export {
  DataRequest,
  DataResponse,
  IdleResponse,
  InitialRequest,
  SparsePoint,
  SparseResult,
  TransformedResult,
  WorkerRequest,
  WorkerResponse,
  WorkerType
};
