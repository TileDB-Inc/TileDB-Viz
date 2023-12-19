import { TileDBVisualizationBaseOptions } from '../../base';

export interface TileDBTileImageOptions extends TileDBVisualizationBaseOptions {
  namespace: string;
  arrayID?: string;
  groupID?: string;
  geometryArrayID?: string[];
  pointGroupID?: string[];
  baseGroup?: string;
  token: string;
  tiledbEnv?: string;
  defaultChannels?: {
    index: number;
    color?: { r: number; g: number; b: number };
    intensity?: number;
  }[];
  features?: Feature[];
}
