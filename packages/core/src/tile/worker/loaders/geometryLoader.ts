import {
  GeometryPayload,
  GeometryResponse,
  GeometryType,
  TypedArray,
  WorkerResponse
} from '../../types';
import Client, { QueryData, Range } from '@tiledb-inc/tiledb-cloud';
import { Datatype, Layout } from '@tiledb-inc/tiledb-cloud/lib/v2';
import { getQueryDataFromCache, writeToCache } from '../../../utils/cache';
import { RequestType, OutputGeometry } from '../../types';
import proj4 from 'proj4';
import { CancelTokenSource } from 'axios';
import { parsePolygon } from '../parsers';
import { matrix, Matrix, min, max, multiply, add, index, inv } from 'mathjs';
import { Attribute, Feature, FeatureType } from '@tiledb-inc/viz-common';
import { toNumericalArray, transformBufferToInt64 } from './utils';

export async function geometryRequest(
  id: number,
  client: Client,
  tokenSource: CancelTokenSource,
  payload: GeometryPayload
) {
  const [x, y] = payload.index;
  const result: Partial<GeometryResponse> = {
    index: payload.index,
    canceled: false,
    type: GeometryType.POLYGON,
    attributes: {}
  };

  const affineMatrix = matrix(payload.transformation);

  const uniqueAttributes = new Set<string>(
    payload.features.flatMap(x => x.attributes.map(y => y.name))
  );

  const cachedArrays = await loadCachedGeometry(payload.uri, x, y, [
    ...payload.features.filter(x => x.attributes.length).map(x => x.name),
    'positions',
    'ids',
    'indices'
  ]);

  if (cachedArrays) {
    result.attributes = cachedArrays;

    result.position = cachedArrays['positions'] as Float32Array;
    result.indices = cachedArrays['indices'] as Int32Array;

    delete cachedArrays.positions;
    delete cachedArrays.indices;

    return {
      id: id,
      type: RequestType.GEOMETRY,
      response: result
    } as WorkerResponse;
  }

  // Add additional attributes
  uniqueAttributes.add(payload.geometryAttribute.name);

  if (payload.idAttribute) {
    uniqueAttributes.add(payload.idAttribute.name);
  }
  if (payload.heightAttribute) {
    uniqueAttributes.add(payload.heightAttribute.name);
  }

  const isBinary = payload.geometryAttribute.type === Datatype.Blob;
  const ranges = [
    [payload.region[0].min, payload.region[0].max],
    [payload.region[1].min, payload.region[1].max]
  ];

  const query = {
    layout: Layout.Unordered,
    ranges: ranges,
    bufferSize: 20_000_000,
    attributes: Array.from(uniqueAttributes),
    returnRawBuffers: isBinary,
    ignoreOffsets: isBinary,
    returnOffsets: isBinary,
    cancelToken: tokenSource?.token
  } as QueryData;

  const generator = client.query.ReadQuery(
    payload.namespace,
    payload.uri,
    query
  );

  const attributes: Record<string, Attribute> = {};
  attributes.geometry = payload.geometryAttribute;
  if (payload.heightAttribute) {
    attributes.height = payload.heightAttribute;
  }
  if (payload.idAttribute) {
    attributes.id = payload.idAttribute;
  }

  for (const feature of payload.features) {
    for (const attribute of feature.attributes) {
      attributes[attribute.name] = payload.attributes.filter(
        x => x.name === attribute.name
      )[0];
    }
  }

  const geometryOutput = {
    positions: [] as number[],
    normals: [] as number[],
    indices: [] as number[],
    faceMapping: [] as bigint[],
    vertexMap: new Map<bigint, number[]>(),
    features: {}
  };

  const converter =
    payload.targetCRS && payload.sourceCRS
      ? proj4(payload.sourceCRS, payload.targetCRS)
      : null;

  try {
    for await (const result of generator) {
      switch (payload.geometryAttribute.type) {
        case Datatype.Blob:
          loadBinaryGeometry(
            result,
            attributes,
            payload.features,
            payload.type,
            affineMatrix,
            converter,
            geometryOutput
          );
          break;
        case Datatype.StringUtf8:
          loadStringGeometry(
            result,
            attributes,
            payload.features,
            payload.type,
            affineMatrix,
            converter,
            geometryOutput
          );
          break;
        default:
          throw new Error(
            `Unknown geometry attribute "${payload.geometryAttribute.type}"`
          );
      }
    }
  } catch (e) {
    console.log(e);
    throw new Error('Request cancelled by the user');
  }

  const rawPositions = Float32Array.from(geometryOutput.positions);
  const rawIds = BigInt64Array.from(geometryOutput.faceMapping);
  const rawIndices = Int32Array.from(geometryOutput.indices);

  result.attributes = {};
  result.attributes['ids'] = rawIds;

  result.position = rawPositions;
  result.indices = rawIndices;

  for (const feature of payload.features) {
    switch (feature.type) {
      case FeatureType.CATEGORICAL:
        result.attributes[feature.name] = Int32Array.from(
          geometryOutput[feature.name]
        );
        break;
      case FeatureType.FLAT_COLOR:
        // skip
        break;
      default:
        throw new Error(`Unsupported feature type ${feature.type}`);
    }
  }

  await Promise.all(
    Object.entries(result.attributes).map(([name, array]) => {
      return writeToCache(payload.uri, `${name}_${x}_${y}`, array);
    })
  );

  return {
    id: id,
    type: RequestType.GEOMETRY,
    response: result
  } as WorkerResponse;
}

async function loadCachedGeometry(
  arrayID: string,
  x: number,
  y: number,
  features: string[]
): Promise<{ [attribute: string]: TypedArray } | undefined> {
  const cachedArrays = await Promise.all(
    features.map(feature => {
      return getQueryDataFromCache(arrayID, `${feature}_${x}_${y}`);
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

function calculateQueryRanges(
  tileIndex: number[],
  tilesize: number,
  affineMatrix: Matrix,
  pad?: number[],
  baseCRS?: string,
  sourceCRS?: string
): (Range | Range[])[] {
  const [x, y] = tileIndex;

  let minPoint = matrix([x * tilesize, y * tilesize, 1]);
  let maxPoint = matrix([(x + 1) * tilesize, (y + 1) * tilesize, 1]);

  minPoint = multiply(affineMatrix, minPoint);
  maxPoint = multiply(affineMatrix, maxPoint);

  if (baseCRS && sourceCRS) {
    const converter = proj4(baseCRS, sourceCRS);

    minPoint.subset(
      index([true, true, false]),
      converter.forward(
        minPoint.subset(index([true, true, false])).toArray() as number[]
      )
    );
    maxPoint.subset(
      index([true, true, false]),
      converter.forward(
        maxPoint.subset(index([true, true, false])).toArray() as number[]
      )
    );
  }

  [minPoint, maxPoint] = [
    matrix(min([minPoint.toArray(), maxPoint.toArray()], 0)),
    matrix(max([minPoint.toArray(), maxPoint.toArray()], 0))
  ];

  if (pad) {
    minPoint.subset(
      index([true, true, false]),
      add(
        minPoint.subset(index([true, true, false])),
        matrix([-pad[0], -pad[1]])
      )
    );
    maxPoint.subset(
      index([true, true, false]),
      add(maxPoint.subset(index([true, true, false])), matrix([pad[0], pad[1]]))
    );
  }

  return [
    [minPoint.get([0]), maxPoint.get([0])],
    [minPoint.get([1]), maxPoint.get([1])]
  ];
}

function loadBinaryGeometry(
  data: Record<string, any>,
  attributes: Record<string, Attribute>,
  features: Feature[],
  geometryType: string,
  affineTransform: Matrix,
  converter: any | undefined,
  outputGeometry: OutputGeometry
) {
  const offsets = data['__offsets'][attributes.geometry.name] as BigUint64Array;

  if (!offsets) {
    return;
  }

  const extraAttributes: Record<string, number[]> = {};
  const featureData: Record<string, number[]> = {};

  for (const feature of features) {
    if (!feature.attributes.length) {
      continue;
    }

    for (const attribute of feature.attributes) {
      if (attribute.name in extraAttributes) {
        continue;
      }

      extraAttributes[attribute.name] = toNumericalArray(
        data[attribute.name],
        attributes[attribute.name]
      );
    }

    if (feature.interleaved) {
      // All attributes should have the same size
      // TODO: Add explicit check
      const elementCount = extraAttributes[feature.attributes[0].name].length;
      const attCount = feature.attributes.length;

      // I use an typed array to work on a continuous block of memory
      const interleavedData = new Float64Array(
        elementCount * feature.attributes.length
      );

      for (const [idx, attribute] of feature.attributes.entries()) {
        for (let index = 0; index < elementCount; ++index) {
          interleavedData[index * attCount + idx] =
            extraAttributes[attribute.name][index];
        }
      }

      featureData[feature.name] = Array.from(interleavedData);
    } else {
      if (extraAttributes[feature.attributes[0].name]) {
        featureData[feature.name] = extraAttributes[feature.attributes[0].name];
      }
    }
  }

  const wkb = data[attributes.geometry.name] as ArrayBuffer;
  const id = transformBufferToInt64(data[attributes.id.name], attributes.id);
  const height = new Float64Array(
    attributes.height ? data[attributes.height.name] : undefined
  );

  switch (geometryType) {
    case 'Polygon':
      parsePolygon(
        wkb,
        height,
        offsets,
        id,
        outputGeometry,
        featureData,
        affineTransform,
        converter
      );
      break;
    default:
      throw new TypeError(`Unsupported geometry type ${geometryType}`);
  }
}

function loadStringGeometry(
  data: Record<string, any>,
  attributes: Record<string, Attribute>,
  features: Feature[],
  geometryType: string,
  affineTransform: Matrix,
  converter: any | undefined,
  outputGeometry: OutputGeometry
) {
  const wkt = data[attributes.geometry.name] as string[];
  const id = transformBufferToInt64(data[attributes.id.name], attributes.id);
  const height = new Float64Array(
    attributes.height ? data[attributes.height.name] : undefined
  );

  const extraAttributes: Record<string, number[]> = {};
  const featureData: Record<string, number[]> = {};

  for (const feature of features) {
    if (!feature.attributes.length) {
      continue;
    }

    for (const attribute of feature.attributes) {
      if (attribute.name in extraAttributes) {
        continue;
      }

      extraAttributes[attribute.name] = toNumericalArray(
        data[attribute.name],
        attributes[attribute.name]
      );
    }

    if (feature.interleaved) {
      // All attributes should have the same size
      // TODO: Add explicit check
      const elementCount = extraAttributes[feature.attributes[0].name].length;
      const attCount = feature.attributes.length;

      // I use an typed array to work on a continuous block of memory
      const interleavedData = new Float64Array(
        elementCount * feature.attributes.length
      );

      for (const [idx, attribute] of feature.attributes.entries()) {
        for (let index = 0; index < elementCount; ++index) {
          interleavedData[index * attCount + idx] =
            extraAttributes[attribute.name][index];
        }
      }

      featureData[feature.name] = Array.from(interleavedData);
    } else {
      if (extraAttributes[feature.attributes[0].name]) {
        featureData[feature.name] = extraAttributes[feature.attributes[0].name];
      }
    }
  }

  switch (geometryType) {
    case 'Polygon':
      parsePolygon(
        wkt,
        height,
        new BigUint64Array(),
        id,
        outputGeometry,
        featureData,
        affineTransform,
        converter
      );
      break;
    default:
      throw new TypeError(`Unsupported geometry type ${geometryType}`);
  }
}
