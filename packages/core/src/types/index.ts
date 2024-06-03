import { Matrix } from 'mathjs';

export interface AssetMetadata {
  dataset_type: string;
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

export enum TillingScheme {
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
};

export type GeometryDataContent = {
  dimension: string;
  min: number;
  max: number;
};

export type ImageDataContent = {
  uri: string;
  region: {
    dimension: string;
    min: number;
    max: number;
  }[];
};

export type PointDataContent = {
  uri: string;
  region: {
    dimension: string;
    min: number;
    max: number;
  }[];
};
