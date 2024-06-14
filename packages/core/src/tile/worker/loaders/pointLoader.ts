import { FeatureType } from '@tiledb-inc/viz-common';
import { CancelTokenSource } from 'axios';
import Client, { QueryData, Range } from '@tiledb-inc/tiledb-cloud';
import { Layout, Datatype } from '@tiledb-inc/tiledb-cloud/lib/v2';
import { writeToCache } from '../../../utils/cache';
import {
  InfoResponse,
  PointCloudPayload,
  PointInfoMessage,
  PointResponse,
  TypedArray,
  WorkerResponse
} from '../../types';
import { RequestType } from '../../types';
import { MathArray, matrix, min, max, multiply, Matrix, index } from 'mathjs';
import { concatBuffers } from '../../utils/array-utils';
import {
  createRGB,
  getNormalizationWindow,
  loadCachedGeometry,
  toTypedArray
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
  const affineInverted = matrix(request.geotransformCoefficients);

  const uniqueAttributes = new Set<string>(
    request.features.flatMap(x => x.attributes.map(y => y.name))
  );

  request.domain.forEach(x => uniqueAttributes.add(x.name));

  const cachedArrays = await loadCachedGeometry(
    request.arrayID,
    mortonIndex.toString(),
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
    console.log(e);
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

  const converter =
    request.imageCRS &&
    request.pointCRS &&
    request.imageCRS !== request.pointCRS
      ? proj4(request.pointCRS, request.imageCRS)
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
      multiply(affineInverted, [
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

  await Promise.all(
    Object.entries(result.attributes).map(([name, array]) => {
      return writeToCache(request.arrayID, `${name}_${mortonIndex}`, array);
    })
  );

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
  request: PointInfoMessage
) {
  const geotransformCoefficients = request.geotransformCoefficients;
  const affineMatrix = matrix([
    [geotransformCoefficients[1], 0, 0, geotransformCoefficients[0]],
    [0, -geotransformCoefficients[5], 0, geotransformCoefficients[3]],
    [0, 0, geotransformCoefficients[1], 0],
    [0, 0, 0, 1]
  ] as MathArray);

  const limits: { [domain: string]: { min: number; max: number } } =
    Object.fromEntries(
      request.domain.map(x => {
        return [x.name, { min: x.min, max: x.max }];
      })
    );

  const ranges = calculateQueryRanges(
    [request.bbox[0], request.bbox[1], request.bbox[2]],
    [request.bbox[3], request.bbox[4], request.bbox[5]],
    limits,
    affineMatrix,
    request.imageCRS,
    request.pointCRS
  );

  const ids = new Set(request.ids);
  const pickedResult: any[] = [];
  const pickedIds: bigint[] = [];

  for (const level of request.levels) {
    const query = {
      layout: Layout.Unordered,
      ranges: ranges,
      bufferSize: 20_000_000,
      cancelToken: tokenSource?.token
    };

    const generator = client.query.ReadQuery(request.namespace, level, query);
    try {
      for await (const result of generator) {
        for (
          let index = 0;
          index < (result as any)[request.idAttribute].length;
          ++index
        ) {
          const entryID = BigInt((result as any)[request.idAttribute][index]);
          if (!ids.has(entryID)) {
            continue;
          }

          pickedIds.push(entryID);
          ids.delete(entryID);

          const info = {};
          for (const [key, val] of Object.entries(result)) {
            info[key] = val[index];
          }

          pickedResult.push(info);

          if (ids.size === 0) {
            break;
          }
        }
      }
    } catch (e) {
      self.postMessage({
        id: id,
        type: RequestType.CANCEL,
        response: { nonce: request.nonce } as PointInfoResponse
      } as WorkerResponse);
      return;
    }
  }

  self.postMessage({
    id: id,
    type: RequestType.POINT_INFO,
    response: {
      ids: pickedIds,
      info: pickedResult
    } as InfoResponse
  } as WorkerResponse);
}

function calculateQueryRanges(
  bboxMin: number[],
  bboxMax: number[],
  limits: { [domain: string]: { min: number; max: number } },
  affineMatrix: Matrix,
  baseCRS?: string,
  sourceCRS?: string
): (Range | Range[])[] {
  // The Y and Z dimensions are swap from the octree so we need to swap the back
  let minPoint = multiply(affineMatrix, [
    bboxMin[0],
    bboxMin[2],
    bboxMin[1],
    1
  ]);
  let maxPoint = multiply(affineMatrix, [
    bboxMax[0],
    bboxMax[2],
    bboxMax[1],
    1
  ]);

  [minPoint, maxPoint] = [
    matrix(min([minPoint.toArray(), maxPoint.toArray()], 0)),
    matrix(max([minPoint.toArray(), maxPoint.toArray()], 0))
  ];

  if (baseCRS && sourceCRS && baseCRS !== sourceCRS) {
    const converter = proj4(baseCRS, sourceCRS);

    minPoint.subset(
      index([true, true, true, false]),
      converter.forward(minPoint.toArray().slice(0, 3) as number[])
    );
    maxPoint.subset(
      index([true, true, true, false]),
      converter.forward(maxPoint.toArray().slice(0, 3) as number[])
    );
  }

  [minPoint, maxPoint] = [
    matrix(min([minPoint.toArray(), maxPoint.toArray()], 0)),
    matrix(max([minPoint.toArray(), maxPoint.toArray()], 0))
  ];

  return [
    [
      Math.max(minPoint.get([0]), limits['X'].min),
      Math.min(maxPoint.get([0]), limits['X'].max)
    ],
    [
      Math.max(minPoint.get([1]), limits['Y'].min),
      Math.min(maxPoint.get([1]), limits['Y'].max)
    ],
    [
      Math.max(minPoint.get([2]), limits['Z'].min),
      Math.min(maxPoint.get([2]), limits['Z'].max)
    ]
  ];
}
