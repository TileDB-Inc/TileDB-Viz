import {
  DataRequest,
  RequestType,
  WorkerResponse,
  GeometryResponse,
  PointResponse,
  InitializationPayload,
  PointCloudPayload,
  GeometryPayload
} from '../types';
import axios, { CancelTokenSource } from 'axios';
import type Client from '@tiledb-inc/tiledb-cloud';

let tiledbClient: Client | undefined = undefined;
let cancelSignal = false;
let tokenSource: CancelTokenSource | undefined = undefined;
let currentId = 0;
const CancelToken = axios.CancelToken;

self.onmessage = function (event: MessageEvent<DataRequest>) {
  switch (event.data.type) {
    case RequestType.INITIALIZE:
      {
        const payload = event.data.payload as InitializationPayload;
        import('../../utils/getTileDBClient')
          .then(
            x =>
              (tiledbClient = x.default({
                ...(payload.token ? { apiKey: payload.token } : {}),
                ...(payload.basePath ? { basePath: payload.basePath } : {})
              }))
          )
          .finally(() =>
            self.postMessage({
              id: payload.index,
              type: RequestType.INITIALIZE,
              response: undefined
            } as WorkerResponse)
          );
      }
      break;
    case RequestType.SVSIMAGE:
      cancelSignal = false;
      currentId = event.data.id;
      tokenSource = CancelToken.source();

      import('./loaders/svsImageLoader')
        .then(x =>
          x.svsImageRequest(event.data.id, tokenSource!, event.data.payload)
        )
        .catch(_ => {
          self.postMessage({
            id: event.data.id,
            type: RequestType.CANCEL,
            response: { nonce: event.data.payload.nonce }
          } as WorkerResponse);
        });

      break;
    case RequestType.IMAGE:
      if (!tiledbClient) {
        console.warn("TileDB is not initialized");
        return;
      }

      cancelSignal = false;
      currentId = event.data.id;
      tokenSource = CancelToken.source();

      import('./loaders/imageLoader')
        .then(x =>
          x.imageRequest(
            event.data.id,
            tiledbClient!,
            tokenSource!,
            event.data.payload
          )
        )
        .catch(_ => {
          self.postMessage({
            id: event.data.id,
            type: RequestType.CANCEL,
            response: { nonce: event.data.payload.nonce }
          } as WorkerResponse);
        });

      break;
    case RequestType.GEOMETRY:
      if (!tiledbClient) {
        console.warn("TileDB client is not initialized");
        return;
      }

      cancelSignal = false;
      currentId = event.data.id;
      tokenSource = CancelToken.source();

      import('./loaders/geometryLoader')
        .then(x =>
          x.geometryRequest(
            event.data.id,
            tiledbClient!,
            tokenSource!,
            event.data.payload as GeometryPayload
          )
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
      if (!tiledbClient) {
        console.warn("TileDB client is not initialized");
        return;
      }

      cancelSignal = false;
      currentId = event.data.id;
      tokenSource = CancelToken.source();

      import('./loaders/pointLoader')
        .then(x =>
          x.pointRequest(
            event.data.id,
            tiledbClient!,
            tokenSource!,
            event.data.payload as PointCloudPayload
          )
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
          self.postMessage({
            id: event.data.id,
            type: RequestType.CANCEL,
            response: { nonce: event.data.payload.nonce }
          } as WorkerResponse);
        });
      break;
    case RequestType.GEOMETRY_INFO:
      if (!tiledbClient) {
        console.warn("TileDB client is not initialized");
        return;
      }

      cancelSignal = false;
      currentId = event.data.id;
      tokenSource = CancelToken.source();

      import('./loaders/geometryLoader')
        .then(x =>
          x.geometryInfoRequest(
            event.data.id,
            tiledbClient!,
            tokenSource!,
            event.data.payload
          )
        )
        .then(response => {
          self.postMessage(response);
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
      if (!tiledbClient) {
        console.warn("TileDB client is not initialized");
        return;
      }

      cancelSignal = false;
      currentId = event.data.id;
      tokenSource = CancelToken.source();

      import('./loaders/pointLoader')
        .then(x =>
          x.pointInfoRequest(
            event.data.id,
            tiledbClient!,
            tokenSource!,
            event.data.payload
          )
        )
        .then(response => {
          self.postMessage(response);
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
};
