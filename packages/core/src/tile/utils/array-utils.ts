import { TypedArray, TypedArrayInterface } from '../types';

export class Axes {
  baseAxes: Array<string>;
  targetAxes: Array<string>;
  permutationMatrix: Array<number>;

  constructor(baseAxes: Array<string>, targetAxes: Array<string>) {
    this.baseAxes = baseAxes;
    this.targetAxes = targetAxes;
    this.permutationMatrix = new Array(baseAxes.length);

    for (let index = 0; index < this.baseAxes.length; ++index) {
      const target_index = this.targetAxes.indexOf(this.baseAxes[index]);

      this.permutationMatrix[index] = target_index;
    }
  }

  reshape(shape: Array<number>) {
    const target_shape = new Array(this.baseAxes.length);

    for (let index = 0; index < this.baseAxes.length; ++index) {
      const target_index = this.targetAxes.indexOf(this.baseAxes[index]);

      target_shape[target_index] = shape[index];
    }

    return target_shape;
  }
}

export function transpose(
  array: TypedArray,
  axes: Axes,
  shape: Array<number>,
  downsample: Array<number>
): TypedArray {
  if (
    axes.baseAxes.toString() === axes.targetAxes.toString() &&
    Math.max(...downsample) === 1
  ) {
    return array;
  }

  const transposedShape = axes.reshape(shape);
  const transposedDownsample = axes.reshape(downsample);

  let transposedSize = 1;
  for (let index = 0; index < transposedShape.length; ++index) {
    transposedShape[index] = ~~(
      transposedShape[index] / transposedDownsample[index]
    );

    transposedSize *= transposedShape[index];
  }

  const result = new (array.constructor as TypedArrayInterface)(transposedSize);

  const stride = new Array(axes.baseAxes.length + 1)
    .fill(Number.MAX_SAFE_INTEGER, 0, 1)
    .fill(1, 1);
  const transposedStride = new Array(axes.baseAxes.length).fill(1);

  for (let strideIndex = 0; strideIndex < shape.length; ++strideIndex) {
    for (
      let shapeIndex = strideIndex + 1;
      shapeIndex < shape.length;
      ++shapeIndex
    ) {
      stride[strideIndex + 1] *= shape[shapeIndex];
      transposedStride[strideIndex] *= transposedShape[shapeIndex];
    }
  }

  let transposedPosition = 0;
  const averagingFactor = downsample.reduce((a: number, b: number) => a * b, 1);
  const indices = new Array(axes.baseAxes.length);

  for (let position = 0; position < array.length; ++position) {
    transposedPosition = 0;
    for (let j = 0; j < stride.length - 1; ++j) {
      indices[j] = ~~((position % stride[j]) / stride[j + 1]);
      transposedPosition +=
        ~~(indices[j] / transposedDownsample[axes.permutationMatrix[j]]) *
        transposedStride[axes.permutationMatrix[j]];
    }

    result[transposedPosition] += array[position] / averagingFactor;
  }

  return result;
}

export function packRange(
  array: Array<number>
): [Array<number> | Array<Array<number>>, number] {
  if (array.length === 0) {
    throw new RangeError('Input array is empty.');
  }

  if (array.length % 2 === 1) {
    throw new RangeError('Input array should have an even number of elements.');
  }

  if (array.length === 2) {
    return [array, array[1] - array[0] + 1];
  }

  const result: number[][] = [];
  let size = 0;

  for (let index = 0; index < array.length; index += 2) {
    result.push([array[index], array[index + 1]]);
    size += array[index + 1] - array[index] + 1;
  }

  return [result, size];
}

function cartesian(...args: number[][]) {
  const r: number[][] = [],
    max = args.length - 1;

  function helper(arr: number[], i: number) {
    for (let j = 0, l = args[i].length; j < l; j++) {
      const a = arr.slice(0); // clone arr
      a.push(args[i][j]);
      if (i === max) {
        r.push(a);
      } else {
        helper(a, i + 1);
      }
    }
  }
  helper([], 0);
  return r;
}

function consecutiveRanges(positions: Array<number>) {
  let length = 1;
  const list: Array<Array<number>> = [];

  if (positions.length === 0) {
    return list;
  }

  for (let i = 1; i <= positions.length; i++) {
    if (i === positions.length || positions[i] - positions[i - 1] !== 1) {
      if (length === 1) {
        list.push([positions[i - length], positions[i - length]]);
      } else {
        list.push([positions[i - length], positions[i - 1]]);
      }

      length = 1;
    } else {
      length++;
    }
  }

  return list;
}

export function sliceRanges(
  originalShape: Array<number>,
  originalAxes: Array<string>,
  storedAxes: Array<string>,
  dimensionMap: Map<string, string[]>,
  calculatedRanges: Map<any, any>,
  arrayExtends: Array<number>,
  arrayOffset: Array<number>
): [Array<Array<number> | Array<Array<number>>>, number] {
  const ranges: Array<Array<Array<number>> | Array<number>> = [];
  let size = 1;

  for (const [idx, dim] of storedAxes.entries()) {
    const value = dimensionMap.get(dim) ?? '';

    if (value.length === 1) {
      const [subrange, subsize] = packRange(
        calculatedRanges.get(value[0]).map(index => index + arrayOffset[idx])
      );

      ranges.push(subrange);
      size *= subsize;
    } else {
      // We need to calculate the sub array shape and stride in order to produce the indexes
      // of the slices

      const arrayShape: Array<number> = [];

      for (const axis of value) {
        arrayShape.push(originalShape[originalAxes.indexOf(axis)]);
      }

      // Since step is always 1 the stride of the subarray is the same with the original array
      const stride = new Array(value.length).fill(1);

      for (
        let strideIndex = 0;
        strideIndex < arrayShape.length;
        ++strideIndex
      ) {
        for (
          let shapeIndex = strideIndex + 1;
          shapeIndex < arrayShape.length;
          ++shapeIndex
        ) {
          stride[strideIndex] *= arrayShape[shapeIndex];
        }
      }

      // Find all possible simple slices which are the combination of ranges in each dimension
      const combinations: number[][] = [];
      const startIndexes: number[][] = [];

      for (const axis of value) {
        const sliceLengths: Array<number> = [];
        const sliceStarts: Array<number> = [];
        const range = calculatedRanges.get(axis);

        for (let index = 0; index < range.length; index += 2) {
          sliceLengths.push(range[index + 1] - range[index] + 1);
          sliceStarts.push(range[index]);
        }

        combinations.push(sliceLengths);
        startIndexes.push(sliceStarts);
      }

      const subarrayShapes = cartesian(...combinations);
      const subarrayStartIndices = cartesian(...startIndexes);
      const subarrayOffsets: Array<number> = [];
      const subarrayStrides: Array<Array<number>> = [];

      for (const startIndices of subarrayStartIndices) {
        let offset = 0;

        for (let index = 0; index < startIndices.length; ++index) {
          offset += startIndices[index] * stride[index];
        }

        subarrayOffsets.push(offset);
      }

      for (const shape of subarrayShapes) {
        const subarrayStride: Array<number> = new Array(value.length + 1)
          .fill(Number.MAX_SAFE_INTEGER, 0, 1)
          .fill(1, 1);

        for (let strideIndex = 0; strideIndex < shape.length; ++strideIndex) {
          for (
            let shapeIndex = strideIndex + 1;
            shapeIndex < shape.length;
            ++shapeIndex
          ) {
            subarrayStride[strideIndex + 1] *= shape[shapeIndex];
          }
        }

        subarrayStrides.push(subarrayStride);
      }

      let transposedPosition = 0;
      const indices = new Array(value.length);
      const positions: Array<number> = [];

      const max = arrayExtends[storedAxes.indexOf(dim)];

      for (let index = 0; index < subarrayShapes.length; ++index) {
        const shape = subarrayShapes[index];
        const subarrayLength = shape.reduce((a: number, b: number) => a * b, 1);

        for (let position = 0; position < subarrayLength; ++position) {
          transposedPosition = subarrayOffsets[index];
          for (let j = 0; j < subarrayStrides[index].length - 1; ++j) {
            indices[j] = ~~(
              (position % subarrayStrides[index][j]) /
              subarrayStrides[index][j + 1]
            );
            transposedPosition += indices[j] * stride[j];
          }

          if (transposedPosition >= max) {
            console.error('OOB');
            return [[], 0];
          }

          positions.push(transposedPosition + arrayOffset[idx]);
        }
      }

      positions.sort((a, b) => a - b);

      ranges.push(consecutiveRanges(positions));
      size *= positions.length;
    }
  }

  return [ranges, size];
}
