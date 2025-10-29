import isNumber from './isNumber';
import { describe, it, expect } from 'vitest';

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
