export interface AssetMetadata {
  dataset_type: string;
}

export interface AssetEntry {
  namespace: string;
  name: string;
  id: string;
}

export interface AssetOptions {
  token: string;
  tiledbEnv?: string;
  namespace: string;
  assetID: string;
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
