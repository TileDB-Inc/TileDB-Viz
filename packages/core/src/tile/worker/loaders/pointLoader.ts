import { FeatureType } from '@tiledb-inc/viz-common';
import { CancelTokenSource } from 'axios';
import Client, { QueryData } from '@tiledb-inc/tiledb-cloud';
import { Layout, Datatype } from '@tiledb-inc/tiledb-cloud/lib/v2';
import { writeToCache } from '../../../utils/cache';
import {
  InfoResponse,
  PointCloudInfoPayload,
  PointCloudPayload,
  PointResponse,
  TypedArray,
  WorkerResponse
} from '../../types';
import { RequestType } from '../../types';
import { matrix, multiply, Matrix, identity } from 'mathjs';
import { concatBuffers } from '../../utils/array-utils';
import {
  createRGB,
  getNormalizationWindow,
  loadCachedData,
  toTypedArray,
  transformBufferToInt64
} from './utils';
import proj4 from 'proj4';

export async function pointRequest(
  id: number,
  client: Client,
  tokenSource: CancelTokenSource,
  request: PointCloudPayload
) {
  const mortonIndex = request.index[0];
  const result: Partial<PointResponse> = {
    index: request.index,
    nonce: request.nonce,
    canceled: false,
    attributes: {}
  };
  const CRStoPixel = request.transformation
    ? matrix(request.transformation)
    : (identity(4) as Matrix);

  const uniqueAttributes = new Set<string>(
    request.features.flatMap(x => x.attributes.map(y => y.name))
  );

  // Add additional attributes
  if (request.idAttribute) {
    uniqueAttributes.add(request.idAttribute.name);
  }

  request.domain.forEach(x => uniqueAttributes.add(x.name));

  const cachedArrays = await loadCachedData(
    request.uri,
    mortonIndex.toString(),
    [
      ...request.features.filter(x => x.attributes.length).map(x => x.name),
      'position'
    ],
    ['ids']
  );

  if (cachedArrays) {
    for (const [name, data] of Object.entries(cachedArrays)) {
      result.attributes![name] = data as TypedArray;
    }

    result.position = cachedArrays['position'] as Float32Array;
    result.ids = cachedArrays['ids'] as BigInt64Array | undefined;

    delete cachedArrays.positions;
    delete cachedArrays.ids;

    return {
      id: id,
      type: RequestType.POINT,
      response: result
    } as WorkerResponse;
  }

  const ranges = [
    [request.region[0].min, request.region[0].max],
    [request.region[1].min, request.region[1].max],
    [request.region[2].min, request.region[2].max]
  ];

  const query = {
    layout: Layout.Unordered,
    ranges: ranges,
    bufferSize: 20_000_000,
    attributes: Array.from(uniqueAttributes),
    returnRawBuffers: true,
    cancelToken: tokenSource?.token
  } as QueryData;

  const generator = client.query.ReadQuery(
    request.namespace,
    request.uri,
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
    console.log(e);
    throw new Error('Request cancelled by the user');
  }

  for (const attribute of request.attributes) {
    if (!(attribute.name in buffers)) {
      continue;
    }

    arrays[attribute.name] = toTypedArray(buffers[attribute.name], attribute);
  }

  if (request.idAttribute && request.idAttribute.name in buffers) {
    result.ids = transformBufferToInt64(
      buffers[request.idAttribute.name],
      request.idAttribute
    );
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

  const converter =
    request.sourceCRS &&
    request.targetCRS &&
    request.sourceCRS !== request.targetCRS
      ? proj4(request.sourceCRS, request.targetCRS)
      : undefined;
  for (let idx = 0; idx < elementCount; ++idx) {
    if (converter) {
      [arrays['X'][idx], arrays['Y'][idx], arrays['Z'][idx]] =
        converter.forward([
          arrays['X'][idx],
          arrays['Y'][idx],
          arrays['Z'][idx]
        ] as number[]);
    }

    // Apply the inverted transform and swap Y-Z axes
    [positions[3 * idx], positions[3 * idx + 2], positions[3 * idx + 1]] =
      multiply(CRStoPixel, [
        arrays['X'][idx],
        arrays['Y'][idx],
        arrays['Z'][idx],
        1
      ] as number[]).toArray() as number[];

    // Invert Z component
    positions[3 * idx + 2] = -positions[3 * idx + 2];
  }

  result.position = positions;
  result.attributes = {};

  for (const feature of request.features) {
    if (!feature.attributes.length) {
      continue;
    }

    switch (feature.type) {
      case FeatureType.CATEGORICAL:
        result.attributes[feature.name] = Int32Array.from(
          arrays[feature.attributes[0].name] as Exclude<
            TypedArray,
            BigInt64Array | BigUint64Array
          >
        );
        break;
      case FeatureType.RGB:
        {
          const normalizationWindows = getNormalizationWindow(
            feature.attributes.map(x => {
              return request.attributes.find(attr => attr.name === x.name)
                ?.type;
            }) as Datatype[],
            feature.attributes.map(x => x.normalizationWindow)
          );

          result.attributes[feature.name] = createRGB(
            feature.attributes.map(x => arrays[x.name]),
            feature.attributes.map((x, idx) =>
              x.normalize ? normalizationWindows[idx] : undefined
            )
          );
        }
        break;
      default:
        if (feature.interleaved) {
          // All attributes should have the same size and same type
          // TODO: Add explicit check
          const elementCount = arrays[feature.attributes[0].name].length;
          const attCount = feature.attributes.length;

          // I use a typed array to work on a continuous block of memory
          const interleavedData = new arrays[
            feature.attributes[0].name
          ].constructor(attCount * elementCount) as TypedArray;

          for (const [idx, attribute] of feature.attributes.entries()) {
            for (let index = 0; index < elementCount; ++index) {
              interleavedData[index * attCount + idx] =
                arrays[attribute.name][index];
            }
          }

          result.attributes[feature.name] = interleavedData;
        } else {
          if (arrays[feature.attributes[0].name]) {
            result.attributes[feature.name] =
              arrays[feature.attributes[0].name];
          }
        }
        break;
    }
  }

  await Promise.all([
    ...Object.entries(result.attributes).map(([name, array]) => {
      return writeToCache(request.uri, `${name}_${mortonIndex}`, array);
    }),
    writeToCache(request.uri, `position_${mortonIndex}`, result.position),
    writeToCache(request.uri, `ids_${mortonIndex}`, result.ids)
  ]).catch(() => console.error('Error writing point response to IndexedDB.'));

  return {
    id: id,
    type: RequestType.POINT,
    response: result
  } as WorkerResponse;
}

export async function pointInfoRequest(
  id: number,
  client: Client,
  tokenSource: CancelTokenSource,
  request: PointCloudInfoPayload
) {
  const result: InfoResponse = {
    nonce: request.nonce,
    ids: [],
    info: []
  };

  const ranges = [
    [request.region[0].min, request.region[0].max],
    [request.region[1].min, request.region[1].max],
    [request.region[2].min, request.region[2].max]
  ];

  const query = {
    layout: Layout.Unordered,
    ranges: ranges,
    bufferSize: 20_000_000,
    cancelToken: tokenSource?.token
  };

  const generator = client.query.ReadQuery(
    request.namespace,
    request.uri,
    query
  );
  try {
    for await (const response of generator) {
      if (request.idAttribute !== undefined && request.ids !== undefined) {
        for (
          let index = 0;
          index < (response as any)[request.idAttribute.name].length &&
          request.ids.size !== 0;
          ++index
        ) {
          const id = BigInt(response[request.idAttribute.name][index]);

          if (!request.ids.has(id)) {
            continue;
          }

          result.ids.push(id);
          request.ids.delete(id);

          const entry: Record<string, any> = {};
          for (const [key, val] of Object.entries(response)) {
            entry[key] = val[index];
          }

          result.info.push(entry);
        }
      }
    }
  } catch (e) {
    console.log(e);
    throw new Error('Request cancelled by the user');
  }

  return {
    id: id,
    type: RequestType.INFO,
    response: result
  } as WorkerResponse;
}
