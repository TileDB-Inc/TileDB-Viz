import getPointCloudLimits from './getPointCloudLimits';
import pointCloudData from '../../../../../../__mocks__/point-cloud-data.json';

describe('getPointCloudLimits', () => {
  it('returns default rgbMax', () => {
    const result = getPointCloudLimits({}, pointCloudData);
    expect(result.rgbMax).toBe(0.9997567891555735);
  });

  it('returns custom rgbMax', () => {
    const result = getPointCloudLimits({ rgbMax: 0.5 }, pointCloudData);
    expect(result.rgbMax).toBe(0.5);
  });

  it('returns xyz', () => {
    const result = getPointCloudLimits({}, pointCloudData);
    expect(result.xmax).toBe(129.668742200572);
    expect(result.xmin).toBe(-129.70648948476708);
    expect(result.ymax).toBe(199.722338900622);
    expect(result.ymin).toBe(-199.7475562612052);
    expect(result.zmax).toBe(-0.00720828164805809);
    expect(result.zmin).toBe(-4.998283069447389);
  });

  it('returns xyz of custom bbox', () => {
    const result = getPointCloudLimits(
      { bbox: { X: [1, 2, 3], Y: [4, 5, 6], Z: [7, 8, 9] } },
      pointCloudData
    );

    expect(result.xmax).toBe(2);
    expect(result.xmin).toBe(1);
    expect(result.ymax).toBe(5);
    expect(result.ymin).toBe(4);
    expect(result.zmax).toBe(8);
    expect(result.zmin).toBe(7);
  });

  it('returns xyz with custom bbox and pointShift', () => {
    const result = getPointCloudLimits(
      {
        bbox: { X: [1, 2, 3], Y: [4, 5, 6], Z: [7, 8, 9] },
        pointShift: [5, 4, 3]
      },
      pointCloudData
    );
    expect(result.xmax).toBe(7);
    expect(result.xmin).toBe(6);
    expect(result.ymax).toBe(9);
    expect(result.ymin).toBe(8);
    expect(result.zmax).toBe(11);
    expect(result.zmin).toBe(10);
  });
});
