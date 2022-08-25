import reduceArrays from '../reduceArrays';

function reduceDataArrays(data: any, showFraction: number) {
  const GpsTime = data.GpsTime;
  const X = data.X;
  const Y = data.Y;
  const Z = data.Z;
  const Red = data.Red;
  const Green = data.Green;
  const Blue = data.Blue;

  const reducedData = reduceArrays(
    { GpsTime, X, Y, Z, Red, Green, Blue },
    showFraction
  );

  return reducedData;
}

export default reduceDataArrays;
