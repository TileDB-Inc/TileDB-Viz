interface GetPointCloudLimitsOptions {
  bbox?: { X: number[]; Y: number[]; Z: number[] };
  point_shift?: number[];
  rgb_max?: number;
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
    if (values.point_shift) {
      const [x, y, z] = values.point_shift;
      xmin = values.bbox.X[0] + x;
      xmax = values.bbox.X[1] + x;
      ymin = values.bbox.Y[0] + y;
      ymax = values.bbox.Y[1] + y;
      zmin = values.bbox.Z[0] + z;
      zmax = values.bbox.Z[1] + z;
    } else {
      xmin = values.bbox.X[0];
      xmax = values.bbox.X[1];
      ymin = values.bbox.Y[0];
      ymax = values.bbox.Y[1];
      zmin = values.bbox.Z[0];
      zmax = values.bbox.Z[1];
    }
  } else {
    xmin = data.X.reduce((accum: number, currentNumber: number) =>
      Math.min(accum, currentNumber)
    );
    xmax = data.X.reduce((accum: number, currentNumber: number) =>
      Math.max(accum, currentNumber)
    );
    ymin = data.Y.reduce((accum: number, currentNumber: number) =>
      Math.min(accum, currentNumber)
    );
    ymax = data.Y.reduce((accum: number, currentNumber: number) =>
      Math.max(accum, currentNumber)
    );
    zmin = data.Z.reduce((accum: number, currentNumber: number) =>
      Math.min(accum, currentNumber)
    );
    zmax = data.Z.reduce((accum: number, currentNumber: number) =>
      Math.max(accum, currentNumber)
    );
  }

  if (values.rgb_max) {
    rgbMax = values.rgb_max;
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
