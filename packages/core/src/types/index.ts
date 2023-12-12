import { Vector3 } from '@babylonjs/core';

type octreeIndex = `${number}-${number}-${number}-${number}`;

export interface AssetMetadata {
  dataset_type: string;
}

export interface GeometryMetadata {
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
}

export interface PointCloudMetadata {
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
}

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

export interface Attribute {
  name: string;
  type: string;
  visible: boolean;
  enumeration?: string;
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
