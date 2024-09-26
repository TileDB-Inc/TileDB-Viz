import { Datatype } from '@tiledb-inc/tiledb-cloud/lib/v2';

export type TileDBScene = {
  /**
   * Scene name
   */
  name?: string;

  /**
   * Scene description
   */
  description?: string;

  /**
   * The list of image assets of the scene
   */
  images?: string[];

  /**
   * The list of geometry assets of the scene
   */
  geometries?: string[];

  /**
   * The list of point cloud assets of the scene
   */
  pointClouds?: string[];
};

export type Asset = {
  /**
   * The uri of the asset registered to TileDB Cloud
   */
  tileDBUri: string;
};

export type SceneConfig = {
  name?: string;
  description?: string;

  imageConfigs?: ImageConfig[];
  geometryConfigs?: GeometryConfig[];
  pointConfigs?: PointConfig[];
};

export type AssetConfig = {
  /**
   * Asset display name
   */
  name?: string;

  /**
   * Asset short description
   */
  description?: string;

  /**
   * Asset specific translation to overwrite any calculated translation at runtime
   */
  translation?: { x: number; y: number; z: number };

  /**
   * Asset specific rotation to overwrite any calculated rotation at runtime
   */
  rotation?: {
    /**
     * Axis of rotation
     */
    axis: { x: number; y: number; z: number };

    /**
     * Angle of rotation in radians
     */
    angle: number;
  };

  /**
   * Asset specific scaling to overwrite any calculated scaling at runtime
   */
  scaling?: { x: number; y: number; z: number };

  /**
   * Specify whether this asset supports picking
   */
  pickable?: boolean;

  /**
   * The attribute to be used as the unique identifier for picking. Must be numerical
   */
  pickAttribute?: string;

  /**
   * Additional user defined display features
   */
  features?: Feature[];
};

export type ImageConfig = AssetConfig & {
  isRegularPyramidalImage?: boolean;
};

export type GeometryConfig = AssetConfig & {
  /**
   * The attribute that stores the geometry data. Only WKB and WKT are supported
   */
  geometryAttribute?: string;

  /**
   * Specify whether the 2D geometry should be extruded
   */
  extrude?: boolean;

  /**
   * The attribute storing the extrusion values per geometry
   */
  extrudeAttribute?: string;
};

export type PointConfig = AssetConfig;

export enum FeatureType {
  NON_RENDERABLE = 0,
  RGB = 1,
  CATEGORICAL = 2,
  FLAT_COLOR = 3
}

export type Feature = {
  /**
   * The feature display name
   */
  name: string;

  /**
   * The feature type to inform the engine how to render the set of attributes
   */
  type: FeatureType;

  /**
   * The list of attributes required to render the feature
   */
  attributes: {
    /**
     * The attribute name
     */
    name: string;

    /**
     * Whether to normalize the attribute values to [0, 1] range.
     * Floating point attributes need an explict window specified.
     */
    normalize?: boolean;

    /**
     * The range to normalize attribute values
     */
    normalizationWindow?: { min: number; max: number };
  }[];

  /**
   * Whether to interleave the attributes into a single buffer
   */
  interleaved: boolean;
};

export type Attribute = {
  name: string;
  type: Datatype;
  visible: boolean;
  enumeration?: string;
};

export type Domain = {
  name: string;
  type: string;
  min: number;
  max: number;
};

export enum PointShape {
  SQUARE = 0b1,
  CIRCLE = 0b10,
  PARABOLA = 0b100
}

export enum GeometryStyle {
  FILLED = 0b1,
  OUTLINED = 0b10,
  FILLED_OUTLINED = 0b11
}

//#region Point Cloud Operations

export type PointCloudOperation = {
  operation: 'INITIALIZE' | 'ADD' | 'DELETE' | 'INTERSECT';
  id: string;
};

export type InitializeOctreeOperation = PointCloudOperation & {
  operation: 'INITIALIZE';
  minPoint: number[];
  maxPoint: number[];
  maxDepth: number;
  blocks: { [index: `${number}-${number}-${number}-${number}`]: number };
};

export type AddOctreeNodeOperation = PointCloudOperation & {
  operation: 'ADD';
  mortonCode: number;
  data: Float32Array;
  ids: BigInt64Array;
};

export type DeleteOctreeNodeOperation = PointCloudOperation & {
  operation: 'DELETE';
  mortonCode: number;
};

export type IntersectOperation = PointCloudOperation & {
  operation: 'INTERSECT';
  positions: Float32Array;
  indices: Int32Array;
};

export type OperationResult = {
  operation: 'INITIALIZE' | 'ADD' | 'DELETE' | 'INTERSECT';
  id: string;
  done: boolean;
};

export type IntersectionResult = OperationResult & {
  operation: 'INTERSECT';
  bbox: number[];
  levelIncides: number[];
  ids: BigInt64Array;
};

//#endregion

//#region Common Enums

export enum RefineStrategy {
  /**
   * Maintain parent tile when rendering child tiles
   */
  ADD = 1,

  /**
   * Replace parent tile with child tiles when rendering.
   * Parent tile should unload once all requested child tiles have loaded to avoid holes.
   */
  REPLACE = 2
}

export enum TilingScheme {
  /**
   * Unstructured tiling scheme
   */
  NONE = 0b1,

  /**
   * Quadtree tiling scheme. Each tile has 4 child tiles
   */
  QUADTREE = 0b10,

  /**
   * Octree tiling scheme. Each tile has 8 child tiles
   */
  OCTREE = 0b100
}

//#endregion
