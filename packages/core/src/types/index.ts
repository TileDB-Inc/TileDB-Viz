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
