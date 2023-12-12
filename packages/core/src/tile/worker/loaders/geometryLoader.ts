import {
  GeometryMessage,
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
import {
  MathArray,
  matrix,
  Matrix,
  min,
  max,
  multiply,
  add,
  index,
  inv
} from 'mathjs';
import { Attribute, Feature, FeatureType } from '../../../types';
import { toNumericalArray, transformBufferToInt64 } from './utils';

export async function geometryRequest(
  id: string,
  client: Client,
  tokenSource: CancelTokenSource,
  request: GeometryMessage
) {
  const [x, y] = request.index;
  const tileSize = request.tileSize;
  const cacheTableID = `${request.arrayID}_${tileSize}`;
  const result: GeometryResponse = {
    index: request.index,
    nonce: request.nonce,
    canceled: false,
    type: GeometryType.POLYGON,
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
      geotransformCoefficients[5],
      geotransformCoefficients[3]
    ],
    [0, 0, 1]
  ] as MathArray);

  const uniqueAttributes = new Set<string>(
    request.features.flatMap(x => x.attributes)
  );

  const cachedArrays = await loadCachedGeometry(cacheTableID, x, y, [
    ...request.features.filter(x => x.attributes.length).map(x => x.name),
    'positions',
    'ids',
    'indices'
  ]);

  if (cachedArrays) {
    result.attributes = cachedArrays;

    return {
      id: id,
      type: RequestType.GEOMETRY,
      response: result
    } as WorkerResponse;
  }

  const ranges = calculateQueryRanges(
    request.index,
    tileSize,
    affineMatrix,
    request.imageCRS,
    request.geometryCRS
  );

  // Add additional attributes
  uniqueAttributes.add(request.geometryAttribute.name);
  uniqueAttributes.add(request.idAttribute.name);
  if (request.heightAttribute) {
    uniqueAttributes.add(request.heightAttribute.name);
  }

  const isBinary = request.geometryAttribute.type === Datatype.Blob;

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
    request.namespace,
    request.arrayID,
    query
  );

  const attributes = {
    geometry: request.geometryAttribute,
    height: request.heightAttribute,
    id: request.idAttribute
  };

  for (const feature of request.features) {
    for (const attribute of feature.attributes) {
      attributes[attribute] = request.additionalAttributes?.filter(
        x => x.name === attribute
      )[0];
    }
  }

  const geometryOutput = {
    positions: [] as number[],
    normals: [] as number[],
    indices: [] as number[],
    faceMapping: [] as bigint[],
    vertexMap: new Map<bigint, number[]>()
  };

  try {
    for await (const result of generator) {
      switch (request.geometryAttribute.type) {
        case Datatype.Blob:
          loadBinaryGeometry(
            result,
            attributes,
            request.features,
            request.type,
            inv(affineMatrix),
            geometryOutput
          );
          break;
        case Datatype.StringUtf8:
          loadStringGeometry(
            result,
            attributes,
            request.features,
            request.type,
            inv(affineMatrix),
            geometryOutput
          );
          break;
        default:
          throw new Error(
            `Unknown geometry attribute "${request.geometryAttribute.type}"`
          );
      }
    }
  } catch (e) {
    throw new Error('Request cancelled by the user');
  }

  const rawPositions = Float32Array.from(geometryOutput.positions);
  const rawIds = BigInt64Array.from(geometryOutput.faceMapping);
  const rawIndices = Int32Array.from(geometryOutput.indices);

  result.attributes['positions'] = rawPositions;
  result.attributes['ids'] = rawIds;
  result.attributes['indices'] = rawIndices;

  for (const feature of request.features) {
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
      return writeToCache(cacheTableID, `${name}_${x}_${y}`, array);
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

  minPoint = multiply(minPoint, affineMatrix);
  maxPoint = multiply(maxPoint, affineMatrix);

  if (baseCRS && sourceCRS) {
    const converter = proj4(baseCRS, sourceCRS);

    minPoint.subset(
      index([true, true, false]),
      converter.forward(minPoint.subset(index([true, true, false])).toArray())
    );
    maxPoint.subset(
      index([true, true, false]),
      converter.forward(maxPoint.subset(index([true, true, false])).toArray())
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
  outputGeometry: OutputGeometry
) {
  const offsets = data['__offsets'][attributes.geometry.name] as BigUint64Array;

  if (!offsets) {
    return;
  }

  const extraAttributes: Record<string, number[]> = {};
  const featureData: Record<string, number[]> = {};

  for (const feature of features) {
    for (const attribute of feature.attributes) {
      if (attribute in extraAttributes) {
        continue;
      }

      extraAttributes[attribute] = toNumericalArray(
        data[attribute],
        attributes[attribute]
      );
    }

    if (feature.interleaved) {
      // All attributes should have the same size
      // TODO: Add explicit check
      const elementCount = extraAttributes[feature.attributes[0]].length;
      const attCount = feature.attributes.length;

      // I use an typed array to work on a continuous block of memory
      const interleavedData = new Float64Array(
        elementCount * feature.attributes.length
      );

      for (const [idx, attribute] of feature.attributes.entries()) {
        for (let index = 0; index < elementCount; ++index) {
          interleavedData[index * attCount + idx] =
            extraAttributes[attribute][index];
        }
      }

      featureData[feature.name] = Array.from(interleavedData);
    } else {
      if (extraAttributes[feature.attributes[0]]) {
        featureData[feature.name] = extraAttributes[feature.attributes[0]];
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
        affineTransform
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
    for (const attribute of feature.attributes) {
      if (attribute in extraAttributes) {
        continue;
      }

      extraAttributes[attribute] = toNumericalArray(
        data[attribute],
        attributes[attribute]
      );
    }

    if (feature.interleaved) {
      // All attributes should have the same size
      // TODO: Add explicit check
      const elementCount = extraAttributes[feature.attributes[0]].length;
      const attCount = feature.attributes.length;

      // I use an typed array to work on a continuous block of memory
      const interleavedData = new Float64Array(
        elementCount * feature.attributes.length
      );

      for (const [idx, attribute] of feature.attributes.entries()) {
        for (let index = 0; index < elementCount; ++index) {
          interleavedData[index * attCount + idx] =
            extraAttributes[attribute][index];
        }
      }

      featureData[feature.name] = Array.from(interleavedData);
    } else {
      if (extraAttributes[feature.attributes[0]]) {
        featureData[feature.name] = extraAttributes[feature.attributes[0]];
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
        affineTransform
      );
      break;
    default:
      throw new TypeError(`Unsupported geometry type ${geometryType}`);
  }
}
