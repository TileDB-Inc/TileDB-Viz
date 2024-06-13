import { TileDBVisualizationBaseOptions } from '../../base';
import { Constants, Texture } from '@babylonjs/core';
import {
  Dimension,
  AssetMetadata,
  Domain,
  GeometryDataContent,
  PointDataContent,
  ImageDataContent
} from '../../types';
import { SceneConfig } from '@tiledb-inc/viz-common';
import { OperationResult } from '@tiledb-inc/viz-common';
import { Feature, Attribute } from '@tiledb-inc/viz-common';
import { Matrix } from 'mathjs';
import { ArraySchema } from '@tiledb-inc/tiledb-cloud/lib/v2';
import { GeometryContent } from '../model/geometry/geometryContent';
import { Tile } from '../model/tile';
import { PointTileContent } from '../model/point/pointContent';
import { ImageContent } from '../model/image/imageContent';
import { TDB3DTileContent } from '../model/3d/3DTileContent';

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
  tileUris?: string[];
}

export interface Channel {
  color: { red: number; green: number; blue: number; alpha: number };
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
  channels: Record<string, Channel[]>;
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

export type ImageMetadataV2 = {
  /**
   * Unique dataset id.
   */
  id: string;

  /**
   * Image dataset display name.
   */
  name: string;

  /**
   * The root of the image tileset
   */
  root: Tile<ImageDataContent, ImageContent>;

  /**
   * A map between attribute name and channel information
   */
  channels: Map<string, Channel[]>;

  /**
   * The list of available attributes able to deisplay
   */
  attributes: Attribute[];

  /**
   * Additional dimensions available for preview one slice at a time
   */
  extraDimensions: Dimension[];

  /**
   * The coordinate system of the image
   */
  crs?: string;

  /**
   * An affine matrix to convert from pixel coordinates back to physical coordinates
   */
  pixelToCRS?: Matrix;

  /**
   * Cnfiguration options for loading the tiles
   */
  loaderMetadata?: Map<string, ImageLoaderMetadata>;
};

export type GeometryMetadata = {
  /**
   * The display name of the geometry asset.
   */
  name: string;

  /**
   * The root of the geomemtry tileset.
   */
  root: Tile<GeometryDataContent, GeometryContent>;

  /**
   * The available renderable features of the dataset.
   */
  features: Feature[];

  geometryAttribute: Attribute;
  idAttribute?: Attribute;
  extrudeAttribute?: Attribute;
  crs?: string;
  type: string;

  /**
   * The list af all available attributes to fetch when loading geometry features.
   */
  attributes: Attribute[];

  /**
   * A map between enumeration names and string values
   */
  categories: Map<string, string[]>;

  /**
   * Geometry loader specific metadata.
   */
  loaderMetadata?: GeometryLoaderMetadata;
};

export type PointCloudMetadata = {
  id: string;
  /**
   * The display anme of the point cloud asset.
   */
  name: string;

  /**
   * The root of the point cloud tileset.
   */
  root: Tile<PointDataContent, PointTileContent>;

  /**
   * An attribute containing a unique number per polygon to use for picking, if it exists
   */
  idAttribute?: Attribute;

  /**
   * A map between enumeration names and string values
   */
  categories: Map<string, string[]>;

  /**
   *
   */
  features: Feature[];

  /**
   * The list af all available attributes to fetch when loading point cloud features.
   */
  attributes: Attribute[];

  /**
   * Point cloud loader specific metadata.
   */
  loaderMetadata: PointCloudLoaderMetadata;

  /**
   * The coordinate system of the point cloud
   */
  crs?: string;

  domain: Domain[];
};

export type ImageLoaderMetadata = {
  /**
   * TileDB array schemas of all arrays of the image.
   */
  schema: ArraySchema;

  /**
   * The dimension of each image array in the order that exist in each image.
   */
  dimensions: string[];

  /**
   * If true, the image array has a single channel which is ommited.
   */
  implicitChannel: boolean;

  /**
   * if true, the image array is WebP compressed and follows a known 2D schema.
   */
  isWebPCompressed: boolean;
};

export type GeometryLoaderMetadata = {
  /**
   *
   */
  type: string;

  /**
   *
   */
  sourceCRS?: string;

  /**
   * the padding of the internal R-Tree.
   */
  pad: [number, number];

  /**
   * The unique identifier attribute for each geometric feature.
   */
  idAttribute: Attribute;

  /**
   * The attribute containing the geometric data in WKB or WKT encoding.
   */
  geometryAttribute: Attribute;

  /**
   * Optional height attribute to extrude each geometry feature.
   */
  heightAttribute?: Attribute;

  /**
   * Optional attribute with additional renderable properties for each geometry features.
   */
  additionalAttributes?: Attribute[];
};

export type PointCloudLoaderMetadata = {
  // TODO: move crs and attributes here
};

export type TDB3DTileMetadata = {
  /**
   * Session unique dataset identifier.
   */
  id: string;

  /**
   * THe root of the 3D Tiles tileset.
   */
  root: Tile<string, TDB3DTileContent>;

  /**
   * The dispay name of the 3D Tile dataset.
   */
  name: string;

  /**
   * The base url for all assets of the 3D Tile dataset.
   */
  baseUrl: string;

  /**
   * The coordinate system of the 3D Tiles dataset.
   */
  crs?: string;
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

export const types = {
  uint8: {
    bytes: Uint8Array.BYTES_PER_ELEMENT,
    format: Constants.TEXTUREFORMAT_RED_INTEGER,
    type: Constants.TEXTURETYPE_UNSIGNED_BYTE,
    filtering: Texture.NEAREST_SAMPLINGMODE,
    samplerType: 'usampler2DArray',
    webGPUSampleType: 'u32',
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
    webGPUSampleType: 'i32',
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
    webGPUSampleType: 'u32',
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
    webGPUSampleType: 'f32',
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
    webGPUSampleType: 'f32',
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
  id: number;
  payload?: any;
}

export interface InitializationPayload {
  token: string;
  basePath?: string;
}

export type AssetInitializationRequest = {
  loaderMetadata: ImageLoaderMetadata[];
};

export type ImagePayload = {
  uri: string;
  region: { dimension: string; min: number; max: number }[];
  index: number[];
  namespace: string;
  channelRanges: number[];
  channelMapping: number[];
  attribute: Attribute;
  token: string;
  basePath: string;
  dimensions: Dimension[];
  nonce: number;
  loaderOptions: ImageLoaderMetadata;
};

export type GeometryPayload = {
  uri: string;
  region: { dimension: string; min: number; max: number }[];
  index: number[];
  namespace: string;

  type: string;
  features: Feature[];
  geometryAttribute: Attribute;
  idAttribute?: Attribute;
  heightAttribute?: Attribute;
  attributes: Attribute[];

  sourceCRS?: string;
  targetCRS?: string;
  transformation: number[];
};

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

export interface PointCloudPayload {
  index: number[];
  arrayID: string;
  namespace: string;
  region: {
    dimension: string;
    min: number;
    max: number;
  }[];
  imageCRS?: string;
  pointCRS?: string;
  geotransformCoefficients: number[][];
  features: Feature[];
  attributes: Attribute[];
  nonce: number;
  domain: Domain[];
}

export interface PointInfoMessage {
  namespace: string;
  imageCRS?: string;
  pointCRS?: string;
  geotransformCoefficients: number[];
  idAttribute: string;
  levels: string[];
  bbox: number[];
  domain: Domain[];
  ids: BigInt64Array;
  nonce: number;
}

export interface WorkerResponse {
  type: RequestType;
  id: number;
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
  position: Float32Array;
  indices: Int32Array;
  attributes: { [attribute: string]: TypedArray };
}

export interface PointResponse extends BaseResponse {
  position: Float32Array;
  attributes: { [attribute: string]: TypedArray };
}

export interface InfoResponse {
  info: any[];
  ids: bigint[];
}

export interface ResponseCallback {
  image: { (id: string, response: ImageResponse): void }[];
  geometry: { (id: string, response: GeometryResponse): void }[];
  point: { (id: string, response: PointResponse): void }[];
  pointOperation: { (id: string, response: OperationResult): void }[];
  info: { (id: string, response: InfoResponse): void }[];
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
