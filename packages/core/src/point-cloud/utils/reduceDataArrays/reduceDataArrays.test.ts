import reduceDataArrays from './reduceDataArrays';

const data = {
  GpsTime: [
    248679.0639641689, 248679.0639641689, 248679.0639641689, 248679.06420830952,
    248679.06664971577, 248679.06664971577, 248679.06664971577,
    248679.06664971577, 248679.06664971577, 248679.06664971577
  ],

  X: [
    603.5, 601.9400000000605, 603.7299999999814, 606.0700000000652,
    604.8200000000652, 605.4700000000885, 602.390000000014, 606.2600000000093,
    603.9600000000792, 603.0700000000652
  ],
  Y: [
    928.0500000000466, 935.9500000000698, 926.9600000000792, 915.2900000000373,
    921.5600000000559, 918.4100000000326, 933.6600000000326, 914.3000000000466,
    925.8200000000652, 930.2800000000279
  ],
  Z: [
    12.120000000000005, 12.269999999999982, 12.170000000000016,
    11.899999999999977, 12.100000000000023, 11.970000000000027,
    12.199999999999989, 12, 12.170000000000016, 12.329999999999984
  ],
  Red: [25856, 24320, 24832, 29696, 25600, 27392, 25344, 30464, 24832, 29952],
  Green: [36352, 33536, 33792, 33792, 36864, 34048, 34816, 33792, 36352, 34048],
  Blue: [31488, 32000, 31744, 35840, 32512, 33792, 32000, 34816, 31744, 31488]
};

describe('reduceDataArrays', () => {
  it('return only a fraction of points', () => {
    const { GpsTime, X, Y, Z, Red, Green, Blue } = data;
    const reducedData = reduceDataArrays(data, 5);

    // GpsTime
    expect(GpsTime.length).toBe(10);
    expect(GpsTime).toMatchSnapshot();
    expect(reducedData.GpsTime.length).toBe(2);
    expect(reducedData.GpsTime).toMatchSnapshot();

    // X
    expect(X.length).toBe(10);
    expect(X).toMatchSnapshot();
    expect(reducedData.X.length).toBe(2);
    expect(reducedData.X).toMatchSnapshot();

    // Y
    expect(Y.length).toBe(10);
    expect(Y).toMatchSnapshot();
    expect(reducedData.Y.length).toBe(2);
    expect(reducedData.Y).toMatchSnapshot();

    // Z
    expect(Z.length).toBe(10);
    expect(Z).toMatchSnapshot();
    expect(reducedData.Z.length).toBe(2);
    expect(reducedData.Z).toMatchSnapshot();

    // Red
    expect(Red.length).toBe(10);
    expect(Red).toMatchSnapshot();
    expect(reducedData.Red.length).toBe(2);
    expect(reducedData.Red).toMatchSnapshot();

    // Green
    expect(Green.length).toBe(10);
    expect(Green).toMatchSnapshot();
    expect(reducedData.Green.length).toBe(2);
    expect(reducedData.Green).toMatchSnapshot();

    // Blue
    expect(Blue.length).toBe(10);
    expect(Blue).toMatchSnapshot();
    expect(reducedData.Blue.length).toBe(2);
    expect(reducedData.Blue).toMatchSnapshot();
  });
});
