import getArrayBounds from '../../../utils/getArrayBounds';
import { PointCloudBBox } from '../../point-cloud';

interface GetPointCloudLimitsOptions {
  bbox?: PointCloudBBox;
  pointShift?: number[];
  rgbMax?: number;
}

function getPointCloudLimits(values: GetPointCloudLimitsOptions, data: any) {
  let xmin: number;
  let xmax: number;
  let ymin: number;
  let ymax: number;
  let zmin: number;
  let zmax: number;
  let rgbMax: number;

  if (values.bbox) {
    /**
     * In case pointShift exists add them to the respected values,
     * otherwise default to zero.
     */
    const [x = 0, y = 0, z = 0] = values.pointShift || [];
    xmin = values.bbox.X[0] + x;
    xmax = values.bbox.X[1] + x;
    ymin = values.bbox.Y[0] + y;
    ymax = values.bbox.Y[1] + y;
    zmin = values.bbox.Z[0] + z;
    zmax = values.bbox.Z[1] + z;
  } else {
    const xBounds = getArrayBounds(data.X);
    const yBounds = getArrayBounds(data.Y);
    const zBounds = getArrayBounds(data.Z);

    xmin = xBounds[0];
    xmax = xBounds[1];
    ymin = yBounds[0];
    ymax = yBounds[1];
    zmin = zBounds[0];
    zmax = zBounds[1];
  }

  if (values.rgbMax) {
    rgbMax = values.rgbMax;
  } else {
    const redmax = data.Red.reduce((accum: number, currentNumber: number) =>
      Math.max(accum, currentNumber)
    );
    const greenmax = data.Green.reduce((accum: number, currentNumber: number) =>
      Math.max(accum, currentNumber)
    );
    const bluemax = data.Blue.reduce((accum: number, currentNumber: number) =>
      Math.max(accum, currentNumber)
    );
    rgbMax = Math.max(redmax, greenmax, bluemax);
  }

  return { xmin, xmax, ymin, ymax, zmin, zmax, rgbMax };
}

export default getPointCloudLimits;
