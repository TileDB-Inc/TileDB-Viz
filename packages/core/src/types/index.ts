import { Vector3 } from '@babylonjs/core';

type octreeIndex = `${number}-${number}-${number}-${number}`;

export type SceneMetadata = {
  crs?: string;
  transformation?: number[];
};

export interface AssetMetadata {
  dataset_type: string;
}

export interface GeometryMetadata {
  type: string;
  idAttribute: string;
  geometryAttribute: string;
  crs?: string;
  extent: number[]; // [minX, minY, maxX, maxY]
  pad: number[]; // [padX, padY]
}

export type PointCloudMetadata = {
  minPoint: Vector3;
  maxPoint: Vector3;

  minPointConforming?: Vector3;
  maxPointConforming?: Vector3;

  octreeData: { [index: octreeIndex]: number };

  attributes: Map<string, Attribute>;
  uris: string[];
};

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
  pointCloudArrayID?: string;
  pointCloudGroupID?: string;
  baseGroup?: string;
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
