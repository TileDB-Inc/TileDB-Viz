import { Vector3 } from '@babylonjs/core';
import { Datatype } from '@tiledb-inc/tiledb-cloud/lib/v2';

export type octreeIndex = `${number}-${number}-${number}-${number}`;

export type AssetMetadata = {
  dataset_type: string;
};

export type GeometryMetadata = {
  name: string;
  type: string;
  idAttribute: Attribute;
  geometryAttribute: Attribute;
  categories: Map<string, string[]>;
  crs?: string;
  extent: number[]; // [minX, minY, maxX, maxY]
  pad: number[]; // [padX, padY]
  attributes: Attribute[];
  features: Feature[];
};

export type PointCloudMetadata = {
  minPoint: Vector3;
  maxPoint: Vector3;

  minPointConforming?: Vector3;
  maxPointConforming?: Vector3;

  octreeData: { [index: octreeIndex]: number };

  name: string;
  groupID: string;
  levels: string[];
  categories: Map<string, string[]>;
  attributes: Attribute[];
  domain: Domain[];
  features: Feature[];
  crs?: string;
};

export enum FeatureType {
  NON_RENDERABLE = 0,
  RGB = 1,
  CATEGORICAL = 2,
  FLAT_COLOR = 3
}

export type Feature = {
  name: string;
  type: FeatureType;
  attributes: string[];
  interleaved: boolean;
};

export type AssetEntry = {
  namespace: string;
  name: string;
  arrayID?: string;
  groupID?: string;
};

export type AssetOptions = {
  token: string;
  tiledbEnv?: string;
  namespace: string;
  arrayID?: string;
  groupID?: string;
  geometryArrayID?: string;
  pointGroupID?: string;
  baseGroup?: string;
};

export type Attribute = {
  name: string;
  type: string;
  visible: boolean;
  enumeration?: string;
};

export type Domain = {
  name: string;
  type: string;
  min: number;
  max: number;
};

export type Dimension = {
  name: string;
  value: number;
  min: number;
  max: number;
};

export type Channel = {
  color: number[];
  id: string;
  intensity: number;
  max: number;
  min: number;
  visible: boolean;
  name: string | null;
  emissionWavelength?: number;
  emissionWavelengthUnit?: string;
};

export type AxesMetadata = {
  originalShape: number[];
  originalAxes: string[];
  storedShape: number[];
  storedAxes: string[];
  axesMapping: Map<string, Array<string>>;
  axesTranslation?: Map<string, string>;
  axesOffset?: number[];
};

export type LevelRecord = {
  id: string;
  zoomLevel: number;
  downsample: number;
  dimensions: Array<number>;
  axes: Array<string>;
  arrayExtends: Array<number>;
  arrayAxes: Array<string>;
  arrayOffset: Array<number>;
  axesMapping: Map<string, Array<string>>;
};

export type BiomedicalAssetMetadata = AssetMetadata & {
  fmt_version: number;
  metadata?: string;

  //Legacy properties
  pixel_depth?: number;
  levels?: string;
};

export type RasterAssetMetadata = AssetMetadata & {
  metadata: string;
  _gdal?: string;
};

export type ImageMetadata = AssetMetadata & {
  channels: Map<string, Channel[]>;
  physicalSizeX?: number;
  physicalSizeY?: number;
  physicalSizeZ?: number;
  physicalSizeXUnit?: string;
  physicalSizeYUnit?: string;
  physicalSizeZUnit?: string;
  timeIncrement?: number;
  timeIncrementUnit?: string;
  crs?: string;
  transformationCoefficients?: number[];
  axes: Array<AxesMetadata>;
};

// Fallback support types for fmt_version 1 groups

export interface LevelFallback {
  axes: string;
  level: number;
  name: string;
  shape: Array<number>;
}

export type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Uint8ClampedArray
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

export type TypedArrayInterface =
  | typeof Int8Array
  | typeof Uint8Array
  | typeof Int16Array
  | typeof Uint16Array
  | typeof Int32Array
  | typeof Uint32Array
  | typeof Uint8ClampedArray
  | typeof Float32Array
  | typeof Float64Array
  | typeof BigInt64Array
  | typeof BigUint64Array;

export enum RequestType {
  CANCEL = 0,
  IMAGE = 1,
  GEOMETRY = 2,
  GEOMETRY_INFO = 3,
  POINT = 4,
  POINT_INFO = 5,

  INITIALIZE = 100
}

export type DataRequest = {
  type: RequestType;
  id: string;
  request: any;
};

export type InitializeMessage = {
  token: string;
  basePath?: string;
};

export type ImageMessage = {
  index: number[];
  tileSize: number;
  levelRecord: LevelRecord;
  namespace: string;
  channelRanges: number[];
  channelMapping: number[];
  attribute: Attribute;
  token: string;
  basePath: string;
  dimensions: Dimension[];
  nonce: number;
};

export type GeometryMessage = {
  index: number[];
  tileSize: number;
  arrayID: string;
  namespace: string;
  idAttribute: Attribute;
  geometryAttribute: Attribute;
  heightAttribute?: Attribute;
  pad: number[];
  additionalAttributes?: Attribute[];
  type: string;
  imageCRS?: string;
  geometryCRS?: string;
  geotransformCoefficients: number[];
  metersPerUnit: number;
  nonce: number;
  features: Feature[];
};

export type GeometryInfoMessage = {
  tileSize: number;
  texture: Uint32Array;
  worldBbox: number[];
  screenBbox: number[];
  selectionPath?: number[];
  arrayID: string;
  namespace: string;
  idAttribute: Attribute;
  pad: number[];
  imageCRS?: string;
  geometryCRS?: string;
  tiles?: number[][];
  geotransformCoefficients: number[];
};

export type PointMessage = {
  index: number[];
  arrayID: string;
  namespace: string;
  imageCRS?: string;
  pointCRS?: string;
  geotransformCoefficients: number[];
  features: Feature[];
  attributes: Attribute[];
  nonce: number;
  minPoint: number[];
  maxPoint: number[];
  domain: Domain[];
};

export type PointInfoMessage = {
  namespace: string;
  imageCRS?: string;
  pointCRS?: string;
  geotransformCoefficients: number[];
  levels: string[];
  worldBbox: number[];
  screenBbox: number[];
  selectionPath?: number[];
  domain: Domain[];
  nonce: number;
};

export type WorkerResponse = {
  type: RequestType;
  id: string;
  response: any;
};

export type BaseResponse = {
  index: number[];
  canceled: boolean;
  nonce: number;
};

export type ImageResponse = BaseResponse & {
  data: TypedArray;
  width: number;
  height: number;
  channels: number;
  dtype: Datatype;
};

export type GeometryResponse = BaseResponse & {
  type: GeometryType;
  attributes: { [attribute: string]: TypedArray };
};

export type PointResponse = BaseResponse & {
  attributes: { [attribute: string]: TypedArray };
};

export interface GeometryInfoResponse {
  info: any[];
  ids: bigint[];
}

export interface PointInfoResponse {
  info: any[];
}

export type ResponseCallback = {
  image: { (id: string, response: ImageResponse): void }[];
  geometry: { (id: string, response: GeometryResponse): void }[];
  point: { (id: string, response: PointResponse): void }[];
  pointInfo: { (id: string, response: PointInfoResponse): void }[];
  info: { (id: string, response: GeometryInfoResponse): void }[];
  cancel: { (id: string, response: BaseResponse): void }[];
};

export enum GeometryType {
  NONE = 0,
  POLYGON = 1,
  POLYGON_3D = 2
}

export enum PointShape {
  SQUARE = 0b1,
  CIRCLE = 0b10,
  PARABOLA = 0b100
}

export enum GeometryStyle {
  FILLED = 0b01,
  OUTLINED = 0b10,
  FILLED_OUTLINED = 0b11
}

export type OutputGeometry = {
  positions: number[];
  indices: number[];
  faceMapping: bigint[];
  vertexMap: Map<bigint, number[]>;
  features: Record<string, number[]>;
};

export enum colorScheme {
  '#20603D',
  '#9B9764',
  '#F4A900',
  '#FF2301',
  '#434B4D',
  '#A1F594',
  '#252850',
  '#A5A5A5',
  '#C51D34',
  '#4D5645',
  '#FF7514',
  '#79553D',
  '#31372B',
  '#9E9764',
  '#E7EBDA',
  '#212121',
  '#464531',
  '#84C3BE',
  '#B44C43',
  '#A18594',
  '#193737',
  '#20214F',
  '#1D1E33',
  '#316650',
  '#474B4E',
  '#403A3A',
  '#5D9B9B',
  '#1C542D',
  '#D84B20',
  '#5E2129',
  '#2A6478',
  '#BDECB6'
}
