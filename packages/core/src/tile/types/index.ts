import { TileDBVisualizationBaseOptions } from '../../base';
import { Constants, Texture } from '@babylonjs/core';
import {
  Attribute,
  Dimension,
  AssetMetadata,
  Feature,
  Domain
} from '../../types';
import { SceneConfig } from '@tiledb-inc/viz-common';

export interface TileDBTileImageOptions extends TileDBVisualizationBaseOptions {
  namespace: string;
  arrayID?: string;
  groupID?: string;
  geometryArrayID?: string[];
  pointGroupID?: string[];
  baseGroup?: string;
  token: string;
  tiledbEnv?: string;
  defaultChannels?: {
    index: number;
    color?: { r: number; g: number; b: number };
    intensity?: number;
  }[];
  features?: Feature[];
  sceneConfig?: SceneConfig;
}

export interface Channel {
  color: number[];
  id: string;
  intensity: number;
  max: number;
  min: number;
  visible: boolean;
  name: string | null;
  emissionWavelength?: number;
  emissionWavelengthUnit?: string;
}

export interface AxesMetadata {
  originalShape: number[];
  originalAxes: string[];
  storedShape: number[];
  storedAxes: string[];
  axesMapping: Map<string, Array<string>>;
  axesTranslation?: Map<string, string>;
  axesOffset?: number[];
}

export interface LevelRecord {
  id: string;
  zoomLevel: number;
  downsample: number;
  dimensions: Array<number>;
  axes: Array<string>;
  arrayExtends: Array<number>;
  arrayAxes: Array<string>;
  arrayOffset: Array<number>;
  axesMapping: Map<string, Array<string>>;
}

export interface BiomedicalAssetMetadata extends AssetMetadata {
  fmt_version: number;
  metadata?: string;

  //Legacy properties
  pixel_depth?: number;
  levels?: string;
}

export interface RasterAssetMetadata extends AssetMetadata {
  metadata: string;
  _gdal?: string;
}

export interface ImageMetadata extends AssetMetadata {
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
}

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

export const types = {
  uint8: {
    bytes: Uint8Array.BYTES_PER_ELEMENT,
    format: Constants.TEXTUREFORMAT_RED_INTEGER,
    type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
    filtering: Texture.NEAREST_SAMPLINGMODE,
    samplerType: 'usampler2DArray',
    create: function (size: number) {
      return new Uint8Array(size);
    }
  },
  int8: {
    bytes: Int8Array.BYTES_PER_ELEMENT,
    format: Constants.TEXTUREFORMAT_RED_INTEGER,
    type: Constants.TEXTURETYPE_BYTE,
    filtering: Texture.NEAREST_SAMPLINGMODE,
    samplerType: 'isampler2DArray',
    create: function (size: number) {
      return new Int8Array(size);
    }
  },
  uint16: {
    bytes: Uint16Array.BYTES_PER_ELEMENT,
    format: Constants.TEXTUREFORMAT_RED_INTEGER,
    type: Constants.TEXTURETYPE_UNSIGNED_SHORT,
    filtering: Texture.NEAREST_SAMPLINGMODE,
    samplerType: 'usampler2DArray',
    create: function (size: number) {
      return new Uint16Array(size);
    }
  },
  float16: {
    bytes: Float32Array.BYTES_PER_ELEMENT,
    format: Constants.TEXTUREFORMAT_RED,
    type: Constants.TEXTURETYPE_HALF_FLOAT,
    filtering: Texture.NEAREST_SAMPLINGMODE,
    samplerType: 'sampler2DArray',
    create: function (size: number) {
      return new Float32Array(size);
    }
  },
  float32: {
    bytes: Float32Array.BYTES_PER_ELEMENT,
    format: Constants.TEXTUREFORMAT_RED,
    type: Constants.TEXTURETYPE_FLOAT,
    filtering: Texture.NEAREST_SAMPLINGMODE,
    samplerType: 'sampler2DArray',
    create: function (size: number) {
      return new Float32Array(size);
    }
  }
};

export const enum RequestType {
  CANCEL = 0,
  IMAGE = 1,
  GEOMETRY = 2,
  GEOMETRY_INFO = 3,
  POINT = 4,
  POINT_INFO = 5,

  INITIALIZE = 100
}

export interface DataRequest {
  type: RequestType;
  id: string;
  request: any;
}

export interface InitializeMessage {
  token: string;
  basePath?: string;
}

export interface ImageMessage {
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
}

export interface GeometryMessage {
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
}

export interface GeometryInfoMessage {
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
}

export interface PointMessage {
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
}

export interface PointInfoMessage {
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
}

export interface WorkerResponse {
  type: RequestType;
  id: string;
  response: any;
}

export interface BaseResponse {
  index: number[];
  canceled: boolean;
  nonce: number;
}

export interface ImageResponse extends BaseResponse {
  data: TypedArray;
  width: number;
  height: number;
  channels: number;
  dtype: keyof typeof types;
}

export interface GeometryResponse extends BaseResponse {
  type: GeometryType;
  attributes: { [attribute: string]: TypedArray };
}

export interface PointResponse extends BaseResponse {
  attributes: { [attribute: string]: TypedArray };
}

export interface GeometryInfoResponse {
  info: any[];
  ids: bigint[];
}

export interface PointInfoResponse {
  info: any[];
}

export interface ResponseCallback {
  image: { (id: string, response: ImageResponse): void }[];
  geometry: { (id: string, response: GeometryResponse): void }[];
  point: { (id: string, response: PointResponse): void }[];
  pointInfo: { (id: string, response: PointInfoResponse): void }[];
  info: { (id: string, response: GeometryInfoResponse): void }[];
  cancel: { (id: string, response: BaseResponse): void }[];
}

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

export const colorScheme = [
  '#20603D',
  '#9E9764',
  '#F4A900',
  '#FF2301',
  '#434B4D',
  '#A18594',
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
];
