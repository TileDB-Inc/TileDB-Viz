import {
  GeometryInfoPayload,
  GeometryPayload,
  GeometryResponse,
  GeometryType,
  InfoResponse,
  TypedArray,
  WorkerResponse
} from '../../types';
import Client, { QueryData } from '@tiledb-inc/tiledb-cloud';
import { Datatype, Layout } from '@tiledb-inc/tiledb-cloud/lib/v2';
import { getQueryDataFromCache, writeToCache } from '../../../utils/cache';
import { RequestType, OutputGeometry } from '../../types';
import proj4 from 'proj4';
import { CancelTokenSource } from 'axios';
import { parsePolygon } from '../parsers';
import { matrix, Matrix, identity } from 'mathjs';
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
    attributes: {},
    nonce: payload.nonce
  };

  const CRStoPixel = payload.transformation
    ? matrix(payload.transformation)
    : (identity(4) as Matrix);

  const uniqueAttributes = new Set<string>(
    payload.features.flatMap(x => x.attributes.map(y => y.name))
  );

  const cachedArrays = await loadCachedGeometry(
    payload.uri,
    `${x}_${y}`,
    [
      ...payload.features.filter(x => x.attributes.length).map(x => x.name),
      'positions',
      'indices'
    ],
    ['ids']
  );

  if (cachedArrays) {
    for (const [name, data] of Object.entries(cachedArrays)) {
      result.attributes![name] = data as TypedArray;
    }

    result.position = cachedArrays['positions'] as Float32Array;
    result.indices = cachedArrays['indices'] as Int32Array;
    result.ids = cachedArrays['ids'] as BigInt64Array | undefined;

    delete cachedArrays.positions;
    delete cachedArrays.indices;
    delete cachedArrays.ids;

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
            CRStoPixel,
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
            CRStoPixel,
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

  result.position = Float32Array.from(geometryOutput.positions);
  result.ids = BigInt64Array.from(geometryOutput.faceMapping);
  result.indices = Int32Array.from(geometryOutput.indices);

  result.attributes = {};

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

  await Promise.all([
    ...Object.entries(result.attributes).map(([name, array]) => {
      return writeToCache(payload.uri, `${name}_${x}_${y}`, array);
    }),
    writeToCache(payload.uri, `positions_${x}_${y}`, result.position),
    writeToCache(payload.uri, `indices_${x}_${y}`, result.indices),
    writeToCache(payload.uri, `ids_${x}_${y}`, result.ids)
  ]).catch(() =>
    console.error('Error writing geometry response to IndexedDB.')
  );

  return {
    id: id,
    type: RequestType.GEOMETRY,
    response: result
  } as WorkerResponse;
}

export async function geometryInfoRequest(
  id: number,
  client: Client,
  tokenSource: CancelTokenSource,
  payload: GeometryInfoPayload
) {
  const result: InfoResponse = {
    nonce: payload.nonce,
    ids: [],
    info: []
  };

  const ranges = [
    [payload.region[0].min, payload.region[0].max],
    [payload.region[1].min, payload.region[1].max]
  ];

  const query = {
    layout: Layout.Unordered,
    ranges: ranges,
    bufferSize: 20_000_000,
    cancelToken: tokenSource?.token
  } as QueryData;

  const generator = client.query.ReadQuery(
    payload.namespace,
    payload.uri,
    query
  );

  try {
    for await (const response of generator) {
      if (payload.idAttribute && payload.ids) {
        for (
          let index = 0;
          index < response[payload.idAttribute.name].length &&
          payload.ids.size !== 0;
          ++index
        ) {
          const id = BigInt(response[payload.idAttribute.name][index]);

          if (!payload.ids.has(id)) {
            continue;
          }

          result.ids.push(id);
          payload.ids.delete(id);

          const entry: Record<string, any> = {};
          for (const [key, val] of Object.entries(response)) {
            if (key === payload.geometryAttribute.name) {
              continue;
            }

            entry[key] = val[index];
          }

          result.info.push(entry);
        }
      } else {
        for (
          let index = 0;
          index < Object.values(response)[0].length;
          ++index
        ) {
          const entry: Record<string, any> = {};
          for (const [key, val] of Object.entries(result)) {
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

async function loadCachedGeometry(
  arrayID: string,
  index: string,
  features: string[],
  optionalFeatures: string[] = []
): Promise<{ [attribute: string]: TypedArray | BigInt64Array } | undefined> {
  const cachedArrays = await Promise.all(
    [...features, ...optionalFeatures].map(feature => {
      return getQueryDataFromCache<TypedArray>(arrayID, `${feature}_${index}`);
    })
  );

  if (
    cachedArrays.filter(
      (x: TypedArray | undefined, index: number) =>
        x === undefined && index < features.length
    ).length !== 0
  ) {
    return undefined;
  }

  const result: { [attribute: string]: TypedArray } = {};

  for (const [index, attribute] of [
    ...features,
    ...optionalFeatures
  ].entries()) {
    if (cachedArrays[index]) {
      result[attribute] = cachedArrays[index];
    }
  }

  return result;
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
