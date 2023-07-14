import { TileDBVisualizationBaseOptions } from '../../base';
import { Constants, Texture } from '@babylonjs/core';

export interface TileDBTileImageOptions extends TileDBVisualizationBaseOptions {
  namespace: string;
  assetID: string;
  rootGroup: string;
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

export interface Attribute {
  name: string;
  type: string;
  visible: boolean;
}

export interface Dimension {
  name: string;
  value: number;
  min: number;
  max: number;
}

export interface Metadata {
  channels: Map<string, Channel[]>;
  physicalSizeX?: number;
  physicalSizeY?: number;
  physicalSizeZ?: number;
  physicalSizeXUnit?: string;
  physicalSizeYUnit?: string;
  physicalSizeZUnit?: string;
  timeIncrement?: number;
  timeIncrementUnit?: string;
  axes: Array<AxesMetadata>;
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

export interface QueryMessage {
  index: { x: number; y: number; z: number };
  tileSize: number;
  channels: number;
  levelRecord: LevelRecord;
  namespace: string;
  channelRanges: number[];
  channelMapping: number[];
  attribute: Attribute;
  token: string;
  basePath: string;
  dimensions: Dimension[];
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

export interface AssetMetadata {
  dataset_type: string;
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
    type: Constants.TEXTURETYPE_BYTE,
    filtering: Texture.NEAREST_SAMPLINGMODE,
    samplerType: 'usampler2DArray',
    create: function (size: number) {
      return new Uint8Array(size);
    }
  },
  uint16: {
    bytes: Uint16Array.BYTES_PER_ELEMENT,
    format: Constants.TEXTUREFORMAT_RED_INTEGER,
    type: Constants.TEXTURETYPE_SHORT,
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
