import sortArrays from '../sortArrays';

function sortDataArrays(data: any) {
  const GpsTime = data.GpsTime;
  const X = data.X;
  const Y = data.Y;
  const Z = data.Z;
  const Red = data.Red;
  const Green = data.Green;
  const Blue = data.Blue;

  const sortedData = sortArrays({ GpsTime, X, Y, Z, Red, Green, Blue });

  return sortedData;
}

export default sortDataArrays;
