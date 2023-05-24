import isNumber from '../isNumber';

const addUnitToDimension = (dim: number | string, unit = 'px') => {
  if (isNumber(dim)) {
    return `${dim}${unit}`;
  }

  if (Number(dim)) {
    return `${dim}${unit}`;
  }

  return dim;
};

export default addUnitToDimension;
