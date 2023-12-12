import { Attribute, Domain } from '../../../types';
import { Datatype } from '@tiledb-inc/tiledb-cloud/lib/v2';
import { getQueryDataFromCache } from '../../../utils/cache';
import { TypedArray } from '../../types';

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

  if (cachedArrays.filter(x => x === undefined).length) {
    return undefined;
  }

  const result: { [attribute: string]: TypedArray } = {};

  for (const [index, attribute] of features.entries()) {
    result[attribute] = cachedArrays[index];
  }

  return result;
}
