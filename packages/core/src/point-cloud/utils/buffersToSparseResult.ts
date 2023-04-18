import { SparseResult, SparseResultRaw, TransformedResult } from '../model';

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

  return result;
};

export default buffersToSparseResult;

export function buffersToTransformedResult(
  data: SparseResult,
  translateX: number,
  translateY: number,
  translateZ: number,
  zScale: number,
  rgbMax: number
): TransformedResult | undefined {
  if (!data) {
    return undefined;
  }

  const entries: TransformedResult = {
    Position: new Float32Array(data.X.length * 3),
    Color: new Float32Array(data.X.length * 4)
  };

  for (let i = 0; i < data.X.length; ++i) {
    entries.Position[3 * i] = data.X[i] - translateX;
    entries.Position[3 * i + 1] = (data.Z[i] - translateY) * zScale;
    entries.Position[3 * i + 2] = data.Y[i] - translateZ;

    entries.Color[4 * i] = data.Red[i] / rgbMax;
    entries.Color[4 * i + 1] = data.Green[i] / rgbMax;
    entries.Color[4 * i + 2] = data.Blue[i] / rgbMax;
    entries.Color[4 * i + 3] = 1;
  }

  return entries;
}
