import { Layout } from '@tiledb-inc/tiledb-cloud/lib/v2';
import { Range } from '@tiledb-inc/tiledb-cloud';
import {
  DataRequest,
  RequestType,
  WorkerResponse,
  GeometryResponse,
  GeometryInfoMessage,
  BaseResponse,
  PointResponse,
  PointInfoMessage,
  InfoResponse,
  InitializationPayload,
  PointCloudPayload,
  GeometryPayload
} from '../types';
import { getQueryDataFromCache } from '../../utils/cache';
import axios, { CancelTokenSource } from 'axios';
import getTileDBClient from '../../utils/getTileDBClient';
import Client from '@tiledb-inc/tiledb-cloud';
import proj4 from 'proj4';
import { geometryRequest } from './loaders/geometryLoader';
import { pointInfoRequest, pointRequest } from './loaders/pointLoader';
import { imageRequest } from './loaders/imageLoader';

let tiledbClient: Client | undefined = undefined;
let cancelSignal = false;
let tokenSource: CancelTokenSource | undefined = undefined;
let currentId = 0;
const CancelToken = axios.CancelToken;

self.onmessage = function (event: MessageEvent<DataRequest>) {
  if (event.data.type === RequestType.INITIALIZE) {
    initialize(event.data.payload as InitializationPayload);
  } else if (!tiledbClient) {
    console.warn('TileDB client is not initialized');
    return;
  }

  switch (event.data.type) {
    case RequestType.IMAGE:
      cancelSignal = false;
      currentId = event.data.id;
      tokenSource = CancelToken.source();

      imageRequest(
        event.data.id,
        tiledbClient!,
        tokenSource,
        event.data.payload
      ).catch(_ => {
        self.postMessage({
          id: event.data.id,
          type: RequestType.CANCEL
        } as WorkerResponse);
      });

      break;
    case RequestType.GEOMETRY:
      if (!tiledbClient) {
        break;
      }

      cancelSignal = false;
      currentId = event.data.id;
      tokenSource = CancelToken.source();
      geometryRequest(
        event.data.id,
        tiledbClient,
        tokenSource,
        event.data.payload as GeometryPayload
      )
        .then(response => {
          self.postMessage(
            response,
            Object.values(
              (response.response as GeometryResponse).attributes
            ).map(x => x.buffer) as any
          );
        })
        .catch(_ => {
          console.log(_);
          self.postMessage({
            id: event.data.id,
            type: RequestType.CANCEL
          } as WorkerResponse);
        });
      break;
    case RequestType.POINT:
      if (!tiledbClient) {
        break;
      }

      cancelSignal = false;
      currentId = event.data.id;
      tokenSource = CancelToken.source();
      pointRequest(
        event.data.id,
        tiledbClient,
        tokenSource,
        event.data.payload as PointCloudPayload
      )
        .then(response => {
          self.postMessage(
            response,
            Object.values((response.response as PointResponse).attributes).map(
              x => x.buffer
            ) as any
          );
        })
        .catch(_ => {
          console.log(_);
          self.postMessage({
            id: event.data.id,
            type: RequestType.CANCEL
          } as WorkerResponse);
        });
      break;
    case RequestType.POINT_INFO:
      cancelSignal = false;
      currentId = event.data.id;
      tokenSource = CancelToken.source();
      pointInfoRequest(
        event.data.id,
        tiledbClient,
        tokenSource,
        event.data.request as PointInfoMessage
      );
      break;
      break;
    case RequestType.GEOMETRY_INFO:
      cancelSignal = false;
      currentId = event.data.id;
      tokenSource = CancelToken.source();
      geometryInfoRequest(
        event.data.id,
        event.data.request as GeometryInfoMessage
      );
      break;
    case RequestType.CANCEL:
      cancelSignal = currentId === event.data.id;
      if (cancelSignal) {
        tokenSource?.cancel('Operation canceled by the user.');
      }
      break;
    default:
      break;
  }
};

function initialize(request: InitializationPayload) {
  tiledbClient = getTileDBClient({
    ...(request.token ? { apiKey: request.token } : {}),
    ...(request.basePath ? { basePath: request.basePath } : {})
  });
}

async function geometryInfoRequest(id: number, request: GeometryInfoMessage) {
  if (!tiledbClient) {
    console.warn('TileDB client is not initialized');
    return;
  }

  const height = Math.max(request.screenBbox[3] - request.screenBbox[1], 1);
  const width = Math.max(request.screenBbox[2] - request.screenBbox[0], 1);

  const geotransformCoefficients = request.geotransformCoefficients;

  let queryPoints = [];

  for (let x = request.screenBbox[0]; x < request.screenBbox[0] + width; ++x) {
    for (
      let y = request.screenBbox[1];
      y < request.screenBbox[1] + height;
      ++y
    ) {
      queryPoints.push(x, y);
    }
  }

  if (request.selectionPath) {
    queryPoints = windingNumber(request.selectionPath, queryPoints);
  }

  const ids: Set<bigint> = new Set<bigint>();

  // Extract visible id values from the query points
  for (let index = 0; index < queryPoints.length; index += 2) {
    const [x, y] = [queryPoints[index], queryPoints[index + 1]];
    const screenIndex =
      ((y - request.screenBbox[1]) * width + (x - request.screenBbox[0])) * 4;

    const id = new BigInt64Array(
      request.texture.slice(screenIndex, screenIndex + 2).buffer
    )[0];

    if (id !== 0n) {
      ids.add(id);
    }
  }

  if (ids.size === 0) {
    self.postMessage({ id: id, type: RequestType.CANCEL } as WorkerResponse);
    return;
  }

  let xPixelLimits = [-Number.MAX_VALUE, Number.MAX_VALUE];
  let yPixelLimits = [-Number.MAX_VALUE, Number.MAX_VALUE];

  if (request.tiles && request.tiles.length) {
    [xPixelLimits, yPixelLimits] = await calculateTileBbox(
      request.tiles,
      ids,
      request.arrayID,
      request.tileSize,
      id
    );
  } else {
    xPixelLimits = [request.worldBbox[0], request.worldBbox[2]];
    yPixelLimits = [request.worldBbox[1], request.worldBbox[3]];
  }

  let ranges: (Range | Range[])[] = [];
  let converter = undefined;

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

  if (request.tiles?.length) {
    ranges = [
      [xRange[0], xRange[1]],
      [yRange[0], yRange[1]]
    ];
  } else {
    ranges = [
      [xRange[0] - request.pad[0], xRange[1] + request.pad[0]],
      [yRange[0] - request.pad[1], yRange[1] + request.pad[1]]
    ];
  }

  const query = {
    layout: Layout.Unordered,
    ranges: ranges,
    bufferSize: 20_000_000,
    cancelToken: tokenSource?.token
  };

  const generator = tiledbClient.query.ReadQuery(
    request.namespace,
    request.arrayID,
    query
  );

  const pickedResult: any[] = [];
  const pickedIds: bigint[] = [];

  try {
    for await (const result of generator) {
      for (
        let index = 0;
        index < (result as any)[request.idAttribute.name].length;
        ++index
      ) {
        const entryID = BigInt(
          (result as any)[request.idAttribute.name][index]
        );
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
      response: { nonce: request.nonce } as BaseResponse
    } as WorkerResponse);
    return;
  }

  self.postMessage({
    id: id,
    type: RequestType.GEOMETRY_INFO,
    response: {
      ids: pickedIds,
      info: pickedResult
    } as InfoResponse
  } as WorkerResponse);
}

function windingNumber(path: number[], queryPoints: number[]) {
  // Sunday's variation

  // Close path
  path.push(path[0], path[1]);

  const insidePoints: number[] = [];

  for (let pointIndex = 0; pointIndex < queryPoints.length; pointIndex += 2) {
    let winding = 0;
    const [x, y] = [queryPoints[pointIndex], queryPoints[pointIndex + 1]];

    for (let pathIndex = 0; pathIndex < path.length - 2; pathIndex += 2) {
      const [startX, startY] = [path[pathIndex], path[pathIndex + 1]];
      const [endX, endY] = [path[pathIndex + 2], path[pathIndex + 3]];

      if (
        y >= startY &&
        y < endY &&
        (endX - startX) * (y - startY) - (x - startX) * (endY - startY) > 0
      ) {
        winding += 1;
      } else if (
        y >= endY &&
        y < startY &&
        (endX - startX) * (y - startY) - (x - startX) * (endY - startY) < 0
      ) {
        winding -= 1;
      }
    }

    if (winding !== 0) {
      insidePoints.push(x, y);
    }
  }

  return insidePoints;
}

async function calculateTileBbox(
  tiles: number[][],
  ids: Set<bigint>,
  arrayID: string,
  tileSize: number,
  requestID: string
) {
  const xRange = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
  const yRange = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

  for (const [x, y] of tiles) {
    const cachedPositions = (await getQueryDataFromCache(
      `${arrayID}_${tileSize}`,
      `${'positions'}_${x}_${y}`
    )) as Float32Array | undefined;

    const cachedIds = (await getQueryDataFromCache(
      `${arrayID}_${tileSize}`,
      `${'ids'}_${x}_${y}`
    )) as BigInt64Array | undefined;

    if (cancelSignal || !(cachedPositions && cachedIds)) {
      self.postMessage({
        id: requestID,
        type: RequestType.CANCEL
      } as WorkerResponse);
      return [];
    }

    for (const id of ids) {
      let index = cachedIds.indexOf(id);
      while (index !== -1) {
        const pointX = cachedPositions[3 * index];
        const pointY = cachedPositions[3 * index + 2];

        xRange[0] = Math.min(xRange[0], pointX);
        xRange[1] = Math.max(xRange[1], pointX);
        yRange[0] = Math.min(yRange[0], pointY);
        yRange[1] = Math.max(yRange[1], pointY);

        index = cachedIds.indexOf(id, index + 1);
      }
    }
  }

  return [xRange, yRange];
}
