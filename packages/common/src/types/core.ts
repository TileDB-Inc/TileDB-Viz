export type SceneConfig = {
  name?: string;
  description?: string;
};

export type AssetConfig = {
  /**
   * Asset display name
   */
  name: string;

  /**
   * Asset short description
   */
  description: string;

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
    angle: number
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
};

export type ImageConfig = AssetConfig;

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
}

export type PointConfig = AssetConfig;

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

export interface Attribute {
  name: string;
  type: string;
  visible: boolean;
  enumeration?: string;
}
