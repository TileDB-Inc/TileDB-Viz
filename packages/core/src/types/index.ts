export interface AssetMetadata {
  dataset_type: string;
}

export interface GeometryMetadata {
  type: string;
  attribute: string;
  crs?: string;
  extent: number[]; // [minX, minY, maxX, maxY]
  pad: number[]; // [padX, padY]
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
