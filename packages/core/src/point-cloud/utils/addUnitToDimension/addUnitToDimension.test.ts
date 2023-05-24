import addUnitToDimension from './addUnitToDimension';

describe('addUnitToDimension()', () => {
  it('should add unit to number dimension', () => {
    expect(addUnitToDimension(100, 'rem')).toBe('100rem');
  });

  it('should add px if unit is not set', () => {
    expect(addUnitToDimension(100)).toBe('100px');
  });

  it('should return percentages as it is', () => {
    expect(addUnitToDimension('100%')).toBe('100%');
  });

  it('should append unit to string dimension', () => {
    expect(addUnitToDimension('100', 'px')).toBe('100px');
  });

  it('should return dimension if it has already a unit', () => {
    expect(addUnitToDimension('100px')).toBe('100px');
  });
});
