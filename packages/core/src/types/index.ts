import { BoundingInfo } from '@babylonjs/core';
import { Matrix } from 'mathjs';

export type TDBNonEmptyDomain = {
  isEmpty: boolean;
  nonEmptyDomain: Record<string, number[]>;
};

export enum DatasetType {
  BIOIMG = 'bioimg',
  RASTER = 'raster',
  SOMA_MULTISCALE_IMAGE = 'SOMAMultiscaleImage'
}

export interface AssetMetadata {
  dataset_type?: DatasetType;
  soma_object_type?: DatasetType;
}

export interface AssetEntry {
  namespace: string;
  name: string;
  arrayID?: string;
  groupID?: string;
}

export interface AssetOptions {
  token: string;
  tiledbEnv?: string;
  namespace: string;
  arrayID?: string;
  groupID?: string;
  geometryArrayID?: string;
  pointGroupID?: string;
  baseGroup?: string;
}

export interface Domain {
  name: string;
  type: string;
  min: number;
  max: number;
}

export interface Dimension {
  name: string;
  value: number;
  min: number;
  max: number;
}

// Experimental

export enum RefineStrategy {
  ADD = 1,
  REPLACE = 2
}

export enum TilingScheme {
  NONE = 0,
  QUADTREE = 2,
  OCTREE = 3
}

export enum TileState {
  LOADING = 1,
  VISIBLE = 2
}

export type FrameDetails = {
  zoom: number;
  level: number;
  prefetchBias: number;
};

export type SceneOptions = {
  /**
   * Global coordinate system of the scene. It will be inherited from the
   * image layer if it exists.
   */
  crs?: string;

  /**
   * Global trnasformation from coordinate system to pixel space. It will be inherited from the
   * image layer if it exists.
   */
  transformation?: Matrix;

  /**
   * The scene's bounding volume to be used for initializing cameras
   */
  extents: BoundingInfo;
};

export type GeometryDataContent = {
  /**
   * The TileDB array uri containing the data
   */
  uri: string;

  /**
   * An array of ranges to slice the array dimensions. Dimension should match the dimension name of the array.
   */
  region: { dimension: string; min: number; max: number }[];
};

export type ImageDataContent = {
  /**
   * The TileDB array uri containing the data
   */
  uri: string;

  /**
   * An array of ranges to slice the array dimensions. Dimension should match the dimension name of the array.
   */
  region: { dimension: string; min: number; max: number }[];
};

export type PointDataContent = {
  /**
   * The TileDB array uri containing the data
   */
  uri: string;

  /**
   * An array of ranges to slice the array dimensions. Dimension should match the dimension name of the array.
   */
  region: { dimension: string; min: number; max: number }[];
};
