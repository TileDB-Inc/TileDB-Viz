import getArrayBounds from './getArrayBounds';
import data from '../../../../../__mocks__/point-cloud-data.json';

describe('getArrayBounds', () => {
  it('returns array bounds', () => {
    const [xmin, xmax] = getArrayBounds(data.X);
    expect(xmin).toBe(-129.70648948476708);
    expect(xmax).toBe(129.668742200572);
  });
});
