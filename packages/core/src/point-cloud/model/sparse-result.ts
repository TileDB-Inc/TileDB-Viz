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
  X: number[];
  Y: number[];
  Z: number[];
  Red: number[];
  Green: number[];
  Blue: number[];
  GpsTime?: number[];
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

interface DataRequest extends WorkerRequest {
  block: MoctreeBlock;
}

interface DataResponse extends WorkerResponse {
  block: MoctreeBlock;
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
