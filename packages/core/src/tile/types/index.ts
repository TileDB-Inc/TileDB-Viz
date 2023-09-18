import { TileDBVisualizationBaseOptions } from '../../base';
import { Constants, Texture } from '@babylonjs/core';
import { Attribute, Dimension, AssetMetadata } from '../../types';

export interface TileDBTileImageOptions extends TileDBVisualizationBaseOptions {
  namespace: string;
  arrayID?: string;
  groupID?: string;
  geometryArrayID?: string;
  baseGroup?: string;
  token: string;
  tiledbEnv?: string;
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
  | Float64Array;

export type TypedArrayInterface =
  | typeof Int8Array
  | typeof Uint8Array
  | typeof Int16Array
  | typeof Uint16Array
  | typeof Int32Array
  | typeof Uint32Array
  | typeof Uint8ClampedArray
  | typeof Float32Array
  | typeof Float64Array;

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
}

export interface GeometryMessage {
  index: number[];
  tileSize: number;
  arrayID: string;
  namespace: string;
  idAttribute: string;
  geometryAttribute: string;
  pad: number[];
  extraAttributes?: string[];
  type: string;
  imageCRS: string;
  geometryCRS: string;
  geotransformCoefficients: number[];
}

export interface GeometryInfoMessage {
  id: bigint;
  index: number[];
  tileSize: number;
  arrayID: string;
  namespace: string;
  idAttribute: string;
  geometryAttribute: string;
  imageCRS: string;
  geometryCRS: string;
  geotransformCoefficients: number[];
}

export interface WorkerResponse {
  type: RequestType;
  id: string;
  response: any;
}

export interface BaseResponse {
  index: number[];
  canceled: boolean;
}

export interface ImageResponse extends BaseResponse {
  data: TypedArray;
  width: number;
  height: number;
  channels: number;
  dtype: keyof typeof types;
}

export interface GeometryResponse extends BaseResponse {
  positions: Float32Array;
  ids: BigInt64Array;
  indices: Int32Array;
  gtype: string;
}

export interface GeometryInfoResponse extends BaseResponse {
  info: any;
  positions: Float32Array;
  indices: Int32Array;
}

export interface ResponseCallback {
  image: { (id: string, response: ImageResponse): void }[];
  geometry: { (id: string, response: GeometryResponse): void }[];
  info: { (id: string, response: GeometryInfoResponse): void }[];
}
