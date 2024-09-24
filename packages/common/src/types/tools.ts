export enum PickingMode {
  NONE = 0,
  SINGLE = 1,
  LASSO = 3
}

export type PickResult = {
  assetID: string;
  tileID: number;
  results: { index: number; value: any }[];
};
