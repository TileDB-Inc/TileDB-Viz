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
import getTileDBClient from '../../utils/getTileDBClient';
import Client from '@tiledb-inc/tiledb-cloud';
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
  }
};

function initialize(request: InitializationPayload) {
  tiledbClient = getTileDBClient({
    ...(request.token ? { apiKey: request.token } : {}),
    ...(request.basePath ? { basePath: request.basePath } : {})
  });
}
