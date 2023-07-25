export interface AssetMetadata {
  dataset_type: string;
}

export interface AssetOptions {
  token: string;
  tiledbEnv?: string;
  namespace: string;
  assetID: string;
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
