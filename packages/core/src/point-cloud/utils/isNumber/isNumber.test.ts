import isNumber from './isNumber';

describe('isNumber()', () => {
  it('should return true if argument is number', () => {
    const result = isNumber(123);

    expect(result).toBe(true);
  });

  it('should return false if argument is not a number', () => {
    const result = isNumber('123');

    expect(result).toBe(false);
  });
});
