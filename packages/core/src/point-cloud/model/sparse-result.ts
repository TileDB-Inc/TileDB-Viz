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
  tiledbEnv: string;
  token: string;
  translateX: number;
  translateY: number;
  translateZ: number;
  bufferSize: number;
  id?: number;
}

interface DataRequest<BlockType> extends WorkerRequest {
  block: BlockType;
}

interface DataResponse<BlockType> extends WorkerResponse {
  block: BlockType;
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
  WorkerRequest,
  WorkerResponse,
  WorkerType
};
