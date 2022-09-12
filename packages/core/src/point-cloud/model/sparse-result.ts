interface SparsePoint {
  x: number;
  y: number;
  z: number;
  red: number;
  green: number;
  blue: number;
  gpsTime?: number;
}

interface SparseResult {
  X: Array<number>;
  Y: Array<number>;
  Z: Array<number>;
  Red: Array<number>;
  Green: Array<number>;
  Blue: Array<number>;
  GpsTime?: Array<number>;
}

export { SparsePoint, SparseResult };
