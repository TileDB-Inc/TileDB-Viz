import getPointCloudLimits from '../getPointCloudLimits';
import loadPointCloud from '../loadPointCloud';
import reduceDataArrays from '../reduceDataArrays';
import sortDataArrays from '../sortDataArrays';

async function getPointCloud(values: any) {
  let dataIn: any;
  let data: any;

  if (values.source === 'cloud') {
    const dataUnsorted = await loadPointCloud(values);
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
    values,
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
  if (values.point_shift[0]) {
    data.X = data.X.map((n: any) => n + values.point_shift[0]);
    data.Y = data.Y.map((n: any) => n + values.point_shift[1]);
    data.Z = data.Z.map((n: any) => n + values.point_shift[2]);
    xmin = xmin + values.point_shift[0];
    xmax = xmax + values.point_shift[0];
    ymin = ymin + values.point_shift[1];
    ymax = ymax + values.point_shift[1];
    zmin = zmin + values.point_shift[2];
    zmax = zmax + values.point_shift[2];
  }

  return { data, xmin, xmax, ymin, ymax, zmin, zmax, rgbMax };
}

export default getPointCloud;
