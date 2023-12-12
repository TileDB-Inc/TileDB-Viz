import { FeatureType } from '../../../types';
import { CancelTokenSource } from 'axios';
import Client, { QueryData } from '@tiledb-inc/tiledb-cloud';
import { Layout } from '@tiledb-inc/tiledb-cloud/lib/v2';
import { writeToCache } from '../../../utils/cache';
import {
  PointMessage,
  PointResponse,
  TypedArray,
  WorkerResponse
} from '../../types';
import { RequestType } from '../../types';
import { MathArray, matrix, min, max, multiply, inv } from 'mathjs';
import { concatBuffers } from '../../utils/array-utils';
import { loadCachedGeometry, toTypedArray } from './utils';

export async function pointRequest(
  id: string,
  client: Client,
  tokenSource: CancelTokenSource,
  request: PointMessage
) {
  const mortonIndex = request.index;
  const cacheTableID = request.arrayID;
  const result: PointResponse = {
    index: request.index,
    nonce: request.nonce,
    canceled: false,
    attributes: {}
  };

  const geotransformCoefficients = request.geotransformCoefficients;
  const affineMatrix = matrix([
    [
      geotransformCoefficients[1],
      geotransformCoefficients[2],
      geotransformCoefficients[0]
    ],
    [
      geotransformCoefficients[4],
      -geotransformCoefficients[5],
      geotransformCoefficients[3]
    ],
    [0, 0, geotransformCoefficients[1]]
  ] as MathArray);

  const affineInverted = inv(affineMatrix);

  // The Y and Z dimensions are swap from the octree so we need to swap the back
  let minPoint = multiply(affineMatrix, [
    request.minPoint[0],
    request.minPoint[2],
    request.minPoint[1]
  ]).toArray();
  let maxPoint = multiply(affineMatrix, [
    request.maxPoint[0],
    request.maxPoint[2],
    request.maxPoint[1]
  ]).toArray();

  [minPoint, maxPoint] = [
    matrix(min([minPoint, maxPoint], 0)).toArray(),
    matrix(max([minPoint, maxPoint], 0)).toArray()
  ];

  const uniqueAttributes = new Set<string>(
    request.features.flatMap(x => x.attributes)
  );

  request.domain.forEach(x => uniqueAttributes.add(x.name));

  const cachedArrays = await loadCachedGeometry(
    cacheTableID,
    `${mortonIndex}`,
    [
      ...request.features.filter(x => x.attributes.length).map(x => x.name),
      'position'
    ]
  );

  if (cachedArrays) {
    result.attributes = cachedArrays;

    return {
      id: id,
      type: RequestType.POINT,
      response: result
    } as WorkerResponse;
  }

  const limits: { [domain: string]: { min: number; max: number } } =
    Object.fromEntries(
      request.domain.map(x => {
        return [x.name, { min: x.min, max: x.max }];
      })
    );

  const ranges = [
    [
      Math.max(minPoint[0], limits['X'].min),
      Math.min(maxPoint[0], limits['X'].max)
    ],
    [
      Math.max(minPoint[1], limits['Y'].min),
      Math.min(maxPoint[1], limits['Y'].max)
    ],
    [
      Math.max(minPoint[2], limits['Z'].min),
      Math.min(maxPoint[2], limits['Z'].max)
    ]
  ];

  const query = {
    layout: Layout.Unordered,
    ranges: ranges,
    bufferSize: 20_000_000,
    //attributes: [...Array.from(uniqueAttributes), ...request.domain.map(x => x.name)],
    attributes: Array.from(uniqueAttributes),
    returnRawBuffers: true,
    cancelToken: tokenSource?.token
  } as QueryData;

  const generator = client.query.ReadQuery(
    request.namespace,
    request.arrayID,
    query
    //arraySchema
  );

  const buffers: { [attribute: string]: ArrayBuffer } = {};
  const arrays: { [attribute: string]: TypedArray } = {};

  try {
    for await (const results of generator) {
      for (const attribute of uniqueAttributes) {
        buffers[attribute] = concatBuffers(
          results[attribute],
          buffers[attribute]
        );
      }
    }
  } catch (e) {
    throw new Error('Request cancelled by the user');
  }

  for (const attribute of request.attributes) {
    if (!(attribute.name in buffers)) {
      continue;
    }

    arrays[attribute.name] = toTypedArray(buffers[attribute.name], attribute);
  }

  for (const domain of request.domain) {
    if (!(domain.name in buffers)) {
      continue;
    }

    arrays[domain.name] = toTypedArray(buffers[domain.name], domain);
  }

  // Generate positions buffer
  const elementCount = arrays['X'].length;
  const positions = new Float32Array(3 * elementCount);

  for (let idx = 0; idx < elementCount; ++idx) {
    [positions[3 * idx], positions[3 * idx + 2], positions[3 * idx + 1]] =
      multiply(affineInverted, [
        arrays['X'][idx],
        arrays['Y'][idx],
        arrays['Z'][idx]
      ] as number[]).toArray();
  }

  result.attributes['position'] = positions;

  for (const feature of request.features) {
    if (feature.type === FeatureType.CATEGORICAL) {
      result.attributes[feature.name] = Int32Array.from(
        arrays[feature.attributes[0]] as Exclude<
          TypedArray,
          BigInt64Array | BigUint64Array
        >
      );
    } else {
      if (feature.interleaved) {
        // All attributes should have the same size
        // TODO: Add explicit check
        const elementCount = arrays[feature.attributes[0]].length;
        const attCount = feature.attributes.length;

        // I use an typed array to work on a continuous block of memory
        const interleavedData = new arrays[feature.attributes[0]].constructor(
          attCount * elementCount
        ) as TypedArray;

        for (const [idx, attribute] of feature.attributes.entries()) {
          for (let index = 0; index < elementCount; ++index) {
            interleavedData[index * attCount + idx] = arrays[attribute][index];
          }
        }

        result.attributes[feature.name] = interleavedData;
      } else {
        if (arrays[feature.attributes[0]]) {
          result.attributes[feature.name] = arrays[feature.attributes[0]];
        }
      }
    }
  }

  await Promise.all(
    Object.entries(result.attributes).map(([name, array]) => {
      return writeToCache(cacheTableID, `${name}_${mortonIndex}`, array);
    })
  );

  return {
    id: id,
    type: RequestType.POINT,
    response: result
  } as WorkerResponse;
}
