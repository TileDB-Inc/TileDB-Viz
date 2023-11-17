import {
  GeometryMessage,
  GeometryResponse,
  GeometryType,
  WorkerResponse
} from '../../types';
import Client, { QueryData, Range } from '@tiledb-inc/tiledb-cloud';
import { Datatype, Layout } from '@tiledb-inc/tiledb-cloud/lib/v2';
import { getQueryDataFromCache, writeToCache } from '../../../utils/cache';
import { RequestType } from '../../types';
import proj4 from 'proj4';
import { CancelTokenSource } from 'axios';
import {
  parsePolygon,
  parsePolygonExtruded,
  parseStringPolygon
} from '../parsers';

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
    type: request.heightAttribute
      ? GeometryType.POLYGON_3D
      : GeometryType.POLYGON,
    attributes: {}
  };

  const cachedPositions = await getQueryDataFromCache(
    cacheTableID,
    `${'position'}_${x}_${y}`
  );

  if (cachedPositions) {
    const [cachedNormals, cachedIds, cachedIndices] = await Promise.all([
      getQueryDataFromCache(cacheTableID, `${'normal'}_${x}_${y}`),
      getQueryDataFromCache(cacheTableID, `${'ids'}_${x}_${y}`),
      getQueryDataFromCache(cacheTableID, `${'indices'}_${x}_${y}`)
    ]);

    result.attributes['positions'] = cachedPositions;
    result.attributes['ids'] = cachedIds;
    result.attributes['indices'] = cachedIndices;

    if (cachedNormals) {
      result.attributes['normals'] = cachedNormals;
      result.type = GeometryType.POLYGON_3D;
    } else {
      result.type = GeometryType.POLYGON;
    }

    return {
      id: id,
      type: RequestType.GEOMETRY,
      response: result
    } as WorkerResponse;
  }

  const xPixelLimits = [x * tileSize, (x + 1) * tileSize];
  const yPixelLimits = [y * tileSize, (y + 1) * tileSize];

  let ranges: (Range | Range[])[] = [];
  let converter = undefined;
  const geotransformCoefficients = request.geotransformCoefficients!;

  let geoXMin =
    geotransformCoefficients[0] +
    geotransformCoefficients[1] * xPixelLimits[0] +
    geotransformCoefficients[2] * yPixelLimits[0];
  let geoYMin =
    geotransformCoefficients[3] +
    geotransformCoefficients[4] * xPixelLimits[0] +
    geotransformCoefficients[5] * yPixelLimits[0];
  let geoXMax =
    geotransformCoefficients[0] +
    geotransformCoefficients[1] * xPixelLimits[1] +
    geotransformCoefficients[2] * yPixelLimits[1];
  let geoYMax =
    geotransformCoefficients[3] +
    geotransformCoefficients[4] * xPixelLimits[1] +
    geotransformCoefficients[5] * yPixelLimits[1];

  if (request.geometryCRS) {
    converter = proj4(request.geometryCRS, request.imageCRS);

    [geoXMin, geoYMin] = converter.inverse([geoXMin, geoYMin]);
    [geoXMax, geoYMax] = converter.inverse([geoXMax, geoYMax]);
  }

  const xRange = [geoXMin, geoXMax].sort();
  const yRange = [geoYMin, geoYMax].sort();

  // ranges = [
  //   [xRange[0] - request.pad[0], xRange[1] + request.pad[0]],
  //   [yRange[0] - request.pad[1], yRange[1] + request.pad[1]]
  // ];
  // Remove padding to avoid overlapping polygon when using transparency

  ranges = [
    [xRange[0], xRange[1]],
    [yRange[0], yRange[1]]
  ];

  const query = {
    layout: Layout.Unordered,
    ranges: ranges,
    bufferSize: 20_000_000,
    attributes: [
      request.geometryAttribute.name,
      request.idAttribute.name,
      ...(request.heightAttribute ? [request.heightAttribute.name] : [])
    ],
    returnRawBuffers: request.geometryAttribute.type === Datatype.Blob,
    ignoreOffsets: request.geometryAttribute.type === Datatype.Blob,
    returnOffsets: request.geometryAttribute.type === Datatype.Blob,
    cancelToken: tokenSource?.token
  } as QueryData;

  const generator = client.query.ReadQuery(
    request.namespace,
    request.arrayID,
    query
  );

  const vertexMap: Map<bigint, number[]> = new Map<bigint, number[]>();

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const faceMapping: bigint[] = [];

  try {
    for await (const result of generator) {
      if (request.geometryAttribute.type === Datatype.Blob) {
        if ((result as any)['__offsets'][request.geometryAttribute.name]) {
          const ids = new BigInt64Array(
            (result as any)[request.idAttribute.name]
          );
          const wkbs = (result as any)[
            request.geometryAttribute.name
          ] as ArrayBuffer;
          const offsets = (result as any)['__offsets'][
            request.geometryAttribute.name
          ];

          switch (request.type) {
            case 'Polygon':
              if (
                request.heightAttribute &&
                request.heightAttribute?.name in result
              ) {
                const heights = Array.from(
                  new Float64Array(
                    (result as any)[request.heightAttribute.name]
                  )
                );
                parsePolygonExtruded(
                  wkbs,
                  heights,
                  offsets,
                  ids,
                  positions,
                  normals,
                  indices,
                  faceMapping,
                  vertexMap,
                  geotransformCoefficients,
                  converter
                );
              } else {
                parsePolygon(
                  wkbs,
                  offsets,
                  ids,
                  positions,
                  normals,
                  indices,
                  faceMapping,
                  vertexMap,
                  geotransformCoefficients,
                  converter
                );
              }
              break;
            default:
              throw new Error(`Unknown geometry type "${request.type}"`);
          }
        }
      } else if (request.geometryAttribute.type === Datatype.StringUtf8) {
        parseStringPolygon(
          (result as any)[request.geometryAttribute.name],
          (result as any)[request.idAttribute.name],
          positions,
          normals,
          indices,
          faceMapping,
          vertexMap,
          geotransformCoefficients,
          converter
        );
      } else {
        throw new Error(
          `Unknown geometry attribute "${request.geometryAttribute.type}"`
        );
      }
    }
  } catch (e) {
    throw new Error('Request cancelled by the user');
  }

  const rawPositions = Float32Array.from(positions);
  const rawIds = BigInt64Array.from(faceMapping);
  const rawIndices = Int32Array.from(indices);
  const rawNormals = Float32Array.from(normals);

  await Promise.all([
    writeToCache(cacheTableID, `${'position'}_${x}_${y}`, rawPositions),
    writeToCache(cacheTableID, `${'normal'}_${x}_${y}`, rawNormals),
    writeToCache(cacheTableID, `${'ids'}_${x}_${y}`, rawIds),
    writeToCache(cacheTableID, `${'indices'}_${x}_${y}`, rawIndices)
  ]);

  result.attributes['positions'] = rawPositions;
  result.attributes['ids'] = rawIds;
  result.attributes['normals'] = rawNormals;
  result.attributes['indices'] = rawIndices;

  return {
    id: id,
    type: RequestType.GEOMETRY,
    response: result
  } as WorkerResponse;
}
