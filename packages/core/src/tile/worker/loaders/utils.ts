import { Domain } from '../../../types';
import { Datatype } from '@tiledb-inc/tiledb-cloud/lib/v2';
import { getQueryDataFromCache } from '../../../utils/cache';
import { TypedArray } from '../../types';
import { Attribute } from '@tiledb-inc/viz-common';

export function transformBufferToInt64(
  buffer: ArrayBuffer,
  attribute: Attribute
): BigInt64Array {
  switch (attribute.type) {
    case Datatype.Int32:
      return BigInt64Array.from(
        Array.from(new Int32Array(buffer)).map(x => BigInt(x))
      );
    case Datatype.Int64:
      return new BigInt64Array(buffer);
    default:
      throw new TypeError('Unsupported type to cast to BigInt');
  }
}

export function toNumericalArray(
  buffer: ArrayBuffer,
  attribute: Attribute
): number[] {
  switch (attribute.type) {
    case Datatype.Uint8:
      return Array.from(new Uint8Array(buffer));
    case Datatype.Uint16:
      return Array.from(new Uint16Array(buffer));
    case Datatype.Uint32:
      return Array.from(new Uint32Array(buffer));
    case Datatype.Int8:
      return Array.from(new Int8Array(buffer));
    case Datatype.Int16:
      return Array.from(new Int16Array(buffer));
    case Datatype.Int32:
      return Array.from(new Int32Array(buffer));
    case Datatype.Float32:
      return Array.from(new Float32Array(buffer));
    case Datatype.Float64:
      return Array.from(new Float64Array(buffer));
    default:
      throw new TypeError(`Cannot convert ${attribute.type} to 'Number'`);
  }
}

export function toTypedArray(
  buffer: ArrayBuffer,
  attribute: Attribute | Domain
): TypedArray {
  switch (attribute.type) {
    case Datatype.Int8:
      return new Int8Array(buffer);
    case Datatype.Uint8:
      return new Uint8Array(buffer);
    case Datatype.Int16:
      return new Int16Array(buffer);
    case Datatype.Uint16:
      return new Uint16Array(buffer);
    case Datatype.Int32:
      return new Int32Array(buffer);
    case Datatype.Uint32:
      return new Uint32Array(buffer);
    case Datatype.Int64:
      return new BigInt64Array(buffer);
    case Datatype.Uint64:
      return new BigUint64Array(buffer);
    case Datatype.Float32:
      return new Float32Array(buffer);
    case Datatype.Float64:
      return new Float64Array(buffer);
    default:
      console.warn(`Unsupported buffer type ${attribute.type.toLowerCase()}`);
      return new Uint8Array();
  }
}

export async function loadCachedGeometry(
  arrayID: string,
  index: string,
  features: string[]
): Promise<{ [attribute: string]: TypedArray } | undefined> {
  const cachedArrays = await Promise.all(
    features.map(feature => {
      return getQueryDataFromCache(arrayID, `${feature}_${index}`);
    })
  );

  if (cachedArrays.some(x => x === undefined)) {
    return undefined;
  }

  const result: { [attribute: string]: TypedArray } = {};

  for (const [index, attribute] of features.entries()) {
    result[attribute] = cachedArrays[index];
  }

  return result;
}

export function getNormalizationWindow(
  types: Datatype[],
  windows: Array<{ min: number; max: number } | undefined>
): { min: number; max: number }[] {
  const result: { min: number; max: number }[] = [];

  for (const [index, type] of types.entries()) {
    if (windows[index]) {
      result.push(windows[index]);
    } else {
      switch (type) {
        case Datatype.Uint8:
          result.push({ min: 0, max: 2 ** 8 - 1 });
          break;
        case Datatype.Uint16:
          result.push({ min: 0, max: 2 ** 16 - 1 });
          break;
        case Datatype.Uint32:
          result.push({ min: 0, max: 2 ** 32 - 1 });
          break;
        case Datatype.Int8:
          result.push({ min: -(2 ** 7), max: 2 ** 7 - 1 });
          break;
        case Datatype.Int16:
          result.push({ min: -(2 ** 15), max: 2 ** 15 - 1 });
          break;
        case Datatype.Int32:
          result.push({ min: -(2 ** 31), max: 2 ** 31 - 1 });
          break;
        default:
          console.error('Unsupported data type for RGB feature');
          break;
      }
    }
  }

  return result;
}

export function createRGB(
  input: TypedArray[],
  normalizationWindows: Array<{ min: number; max: number } | undefined>
): Float32Array {
  const output = new Float32Array(3 * input[0].length);

  for (const [channel, array] of input.entries()) {
    const normalizationWindow = normalizationWindows[channel];

    for (let index = 0; index < array.length; ++index) {
      if (normalizationWindow) {
        output[index * 3 + channel] = Math.min(
          Math.max(
            (array[index] - normalizationWindow.min) /
              (normalizationWindow.max - normalizationWindow.min),
            0
          ),
          1
        );
      } else {
        output[index * 3 + channel] = Number(array[index]);
      }
    }
  }

  return output;
}

export function getWebPRanges(
  range: [number, number],
  channelCount: number,
  channelRanges: number[]
): number[][] {
  const result: number[][] = [];

  for (let x = range[0]; x < range[1]; ++x) {
    for (let idx = 0; idx < channelRanges.length; idx += 2) {
      result.push([
        x * channelCount + channelRanges[idx + 0],
        x * channelCount + channelRanges[idx + 1]
      ]);
    }
  }

  return result;
}
