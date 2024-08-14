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
import { geometryInfoRequest, geometryRequest } from './loaders/geometryLoader';
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
  } else {
    switch (event.data.type) {
      case RequestType.IMAGE:
        cancelSignal = false;
        currentId = event.data.id;
        tokenSource = CancelToken.source();

        imageRequest(
          event.data.id,
          tiledbClient,
          tokenSource,
          event.data.payload
        ).catch(_ => {
          self.postMessage({
            id: event.data.id,
            type: RequestType.CANCEL,
            response: { nonce: event.data.payload.nonce }
          } as WorkerResponse);
        });

        break;
      case RequestType.GEOMETRY:
        cancelSignal = false;
        currentId = event.data.id;
        tokenSource = CancelToken.source();
        console.log(event.data.id);
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
            self.postMessage({
              id: event.data.id,
              type: RequestType.CANCEL,
              response: { nonce: event.data.payload.nonce }
            } as WorkerResponse);
          });
        break;
      case RequestType.POINT:
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
              Object.values(
                (response.response as PointResponse).attributes
              ).map(x => x.buffer) as any
            );
          })
          .catch(_ => {
            self.postMessage({
              id: event.data.id,
              type: RequestType.CANCEL,
              response: { nonce: event.data.payload.nonce }
            } as WorkerResponse);
          });
        break;
      case RequestType.GEOMETRY_INFO:
        cancelSignal = false;
        currentId = event.data.id;
        tokenSource = CancelToken.source();
        geometryInfoRequest(
          event.data.id,
          tiledbClient,
          tokenSource,
          event.data.payload
        )
          .then(response => {
            console.log(response);
          })
          .catch(_ => {
            self.postMessage({
              id: event.data.id,
              type: RequestType.CANCEL,
              response: { nonce: event.data.payload.nonce }
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
          event.data.payload
        )
          .then(response => {
            console.log(response);
          })
          .catch(_ => {
            self.postMessage({
              id: event.data.id,
              type: RequestType.CANCEL,
              response: { nonce: event.data.payload.nonce }
            } as WorkerResponse);
          });
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
  }
};

function initialize(request: InitializationPayload) {
  tiledbClient = getTileDBClient({
    ...(request.token ? { apiKey: request.token } : {}),
    ...(request.basePath ? { basePath: request.basePath } : {})
  });
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
