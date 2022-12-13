import { BoundsRequest, DataBlock, MoctreeBlock } from '../octree';

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
  boundsData,
  boundsSetData,
  dataBlock,
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
  arrayName: string;
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

interface BoundsDataRequest extends WorkerRequest {
  bounds: BoundsRequest;
}

interface BoundsSetDataRequest extends WorkerRequest {
  boundsSet: BoundsRequest[]; 
}

interface DataResponse extends WorkerResponse {
  block: MoctreeBlock;
}

interface BlockDataResponse extends WorkerResponse {
  block: DataBlock;
}

interface BlockSetDataResponse extends WorkerResponse {
  blocks: DataBlock[];
}

interface IdleResponse extends WorkerResponse {
  idle: boolean;
}

export {
  DataRequest,
  BoundsDataRequest,
  BoundsSetDataRequest,
  BlockDataResponse,
  BlockSetDataResponse,
  DataResponse,
  IdleResponse,
  InitialRequest,
  SparsePoint,
  SparseResult,
  WorkerRequest,
  WorkerResponse,
  WorkerType
};
