import { SparseResult, SparseResultRaw } from '../model';

const buffersToSparseResult = (
  res?: SparseResultRaw
): SparseResult | undefined => {
  if (!res) {
    return undefined;
  }

  const result: SparseResult = {
    X: new Float32Array(res.X),
    Y: new Float32Array(res.Y),
    Z: new Float32Array(res.Z),
    Red: new Uint16Array(res.Red),
    Green: new Uint16Array(res.Green),
    Blue: new Uint16Array(res.Blue)
  };

  if (res.GpsTime) {
    result.GpsTime = new Float64Array(res.GpsTime);
  }
  return result;
};

export default buffersToSparseResult;
