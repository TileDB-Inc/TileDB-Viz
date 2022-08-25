import getPointCloudLimits from '../getPointCloudLimits';
import loadPointCloud, { LoadPointCloudOptions } from '../loadPointCloud';
import reduceDataArrays from '../reduceDataArrays';
import sortDataArrays from '../sortDataArrays';

interface GetPointCloudOptions {
  source: string;
  mode: string;
  data: any;
  show_fraction?: number;
  point_shift?: number[];
  namespace?: string;
  arrayName?: string;
  token?: string;
  bbox?: { X: number[]; Y: number[]; Z: number[] };
  tiledb_env?: string;
  rgb_max?: number;
}

async function getPointCloud(values: GetPointCloudOptions) {
  let dataIn: any;
  let data: any;

  if (values.source === 'cloud') {
    const dataUnsorted = await loadPointCloud({
      namespace: values.namespace,
      arrayName: values.arrayName,
      token: values.token,
      bbox: values.bbox
    } as LoadPointCloudOptions);
    if (values.mode === 'time') {
      dataIn = sortDataArrays(dataUnsorted);
    } else {
      dataIn = dataUnsorted;
    }
  } else {
    dataIn = values.data;
  }

  if (values.show_fraction) {
    data = reduceDataArrays(dataIn, values.show_fraction);
  } else {
    data = dataIn;
  }

  // eslint-disable-next-line
  let { xmin, xmax, ymin, ymax, zmin, zmax, rgbMax } = getPointCloudLimits(
    {
      bbox: values.bbox,
      point_shift: values.point_shift,
      rgb_max: values.rgb_max
    },
    data
  );

  // shift points to new origin of [0,0,0] with [xmin,ymin,zmin]
  data.X = data.X.map((n: any) => n - xmin);
  data.Y = data.Y.map((n: any) => n - ymin);
  data.Z = data.Z.map((n: any) => n - zmin);
  xmax = xmax - xmin;
  xmin = 0;
  ymax = ymax - ymin;
  ymin = 0;
  zmax = zmax - zmin;
  zmin = 0;

  // shift points with user defined values (optional)
  if (values.point_shift) {
    const [x, y, z] = values.point_shift;
    data.X = data.X.map((n: any) => n + x);
    data.Y = data.Y.map((n: any) => n + y);
    data.Z = data.Z.map((n: any) => n + z);
    xmin = xmin + x;
    xmax = xmax + x;
    ymin = ymin + y;
    ymax = ymax + y;
    zmin = zmin + z;
    zmax = zmax + z;
  }

  return { data, xmin, xmax, ymin, ymax, zmin, zmax, rgbMax };
}

export default getPointCloud;
