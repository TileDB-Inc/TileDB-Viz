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
  X: Array<number>;
  Y: Array<number>;
  Z: Array<number>;
  Red: Array<number>;
  Green: Array<number>;
  Blue: Array<number>;
  GpsTime?: Array<number>;
}

enum WorkerType {
  init,
  data
}

interface WorkerRequest {
  type: WorkerType;
}

interface InitialRequest extends WorkerRequest {
  namespace: string;
  arrayName: string;
  token: string;
  translateX: number;
  translateY: number;
  translateZ: number;
  bufferSize: number;
}

interface DataRequest extends WorkerRequest {
  block: MoctreeBlock;
}

export {
  DataRequest,
  InitialRequest,
  SparsePoint,
  SparseResult,
  WorkerRequest,
  WorkerType
};
