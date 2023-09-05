import { Layout } from '@tiledb-inc/tiledb-cloud/lib/v2';
import {
  DataRequest,
  QueryMessage,
  RequestType,
  InitializeMessage,
  TypedArray,
  types,
  GeometryMessage,
  WorkerResponse,
  ImageResponse
} from '../types';
import { transpose, sliceRanges, Axes } from '../utils/array-utils';
import { getQueryDataFromCache, writeToCache } from '../../utils/cache';
import client from '@tiledb-inc/tiledb-cloud';
import axios from 'axios';

let tiledbClient: client | undefined = undefined;
let cancelSignal = false;
let cancelToken = undefined;
let currentId = '';
const CancelToken = axios.CancelToken;

self.onmessage = function (event: MessageEvent<DataRequest>) {
  switch (event.data.type) {
    case RequestType.IMAGE:
      cancelSignal = false;
      currentId = event.data.id;
      cancelToken = CancelToken.source();
      imageRequest(event.data.id, event.data.request as QueryMessage);
      break;
    case RequestType.GEOMETRY:
      cancelSignal = false;
      currentId = event.data.id;
      geometryRequest(event.data.request as GeometryMessage);
      break;
    case RequestType.CANCEL:
      cancelSignal = currentId === event.data.id;
      if (cancelSignal) {
        cancelToken.cancel('Operation canceled by the user.');
      }
      break;
    case RequestType.INITIALIZE:
      initialize(event.data.request as InitializeMessage);
      break;
    default:
      break;
  }
};

function initialize(request: InitializeMessage) {
  const config = {
    apiKey: request.token
    //basePath: request.basePath
  };

  tiledbClient = new client(config);
}

async function imageRequest(id: string, request: QueryMessage) {
  if (!tiledbClient) {
    console.warn('TileDB client is not initialized');
    return;
  }

  const levelWidth =
    request.levelRecord.dimensions[request.levelRecord.axes.indexOf('X')];
  const levelHeight =
    request.levelRecord.dimensions[request.levelRecord.axes.indexOf('Y')];

  const downsample = request.levelRecord.downsample;
  const [tile_x, tile_y] = request.index;
  const tilesize = request.tileSize;
  const format = request.attribute.type.toLowerCase();
  const extraDimensionsIdentifier =
    request.dimensions.length > 0
      ? '_' + request.dimensions.map(x => x.value).join('_')
      : '';

  const axesArray = request.levelRecord.arrayAxes
    .map(x => request.levelRecord.axesMapping.get(x) ?? x)
    .flat();

  if (axesArray.indexOf('C') === -1) {
    axesArray.push('C');
  }

  const dimensionMap = request.levelRecord.axesMapping;
  const axes = new Axes(
    axesArray,
    axesArray.filter(x => !['C', 'Y', 'X'].includes(x)).concat(['C', 'Y', 'X'])
  );
  const downsampleFactors = new Array(axes.baseAxes.length);

  for (let index = 0; index < axes.baseAxes.length; ++index) {
    const dim = axes.baseAxes[index];

    if (dim === 'X' || dim === 'Y') {
      downsampleFactors[index] = downsample;
    } else {
      downsampleFactors[index] = 1;
    }
  }

  const channelSlices = new Map<number, any>();
  const missingChannels: Array<number> = [];

  for (
    let index = 0;
    index <= request.channelRanges.length && !cancelSignal;
    index += 2
  ) {
    for (
      let channel = request.channelRanges[index];
      channel <= request.channelRanges[index + 1] && !cancelSignal;
      ++channel
    ) {
      const result = await getQueryDataFromCache(
        `${request.levelRecord.id}_${tilesize}`,
        `${request.attribute.name}_${channel}${extraDimensionsIdentifier}_${request.levelRecord.zoomLevel}_${tile_x}_${tile_y}`
      );

      if (result) {
        channelSlices.set(channel, result);
      } else {
        missingChannels.push(channel);
      }
    }
  }

  if (cancelSignal) {
    self.postMessage({ id: id, type: RequestType.CANCEL } as WorkerResponse);
    return;
  }

  const calculatedRanges = new Map();
  calculatedRanges.set('Y', [
    tile_y * tilesize * downsample,
    Math.min((tile_y + 1) * tilesize * downsample, levelHeight) - 1
  ]);
  calculatedRanges.set('X', [
    tile_x * tilesize * downsample,
    Math.min((tile_x + 1) * tilesize * downsample, levelWidth) - 1
  ]);

  for (const extraDimension of request.dimensions) {
    calculatedRanges.set(extraDimension.name, [
      extraDimension.value,
      extraDimension.value
    ]);
  }

  const width = ~~(
    (calculatedRanges.get('X')[1] - calculatedRanges.get('X')[0] + 1) /
    downsample
  );
  const height = ~~(
    (calculatedRanges.get('Y')[1] - calculatedRanges.get('Y')[0] + 1) /
    downsample
  );

  calculatedRanges.get('X')[1] =
    calculatedRanges.get('X')[0] + width * downsample - 1;
  calculatedRanges.get('Y')[1] =
    calculatedRanges.get('Y')[0] + height * downsample - 1;

  if (missingChannels.length !== 0) {
    const channelRanges: Array<number> = [];
    for (const [index, channel] of missingChannels.entries()) {
      if (channelRanges.length === 0) {
        channelRanges.push(channel);
      } else {
        if (channel - missingChannels[index - 1] !== 1) {
          channelRanges.push(missingChannels[index - 1], channel);
        }
      }
    }

    channelRanges.push(missingChannels.at(-1) ?? 0);
    calculatedRanges.set('C', channelRanges);

    const [ranges, size] = sliceRanges(
      request.levelRecord.dimensions,
      request.levelRecord.axes,
      request.levelRecord.arrayAxes,
      dimensionMap,
      calculatedRanges,
      request.levelRecord.arrayExtends,
      request.levelRecord.arrayOffset
    );

    if (ranges.length === 0) {
      return;
    }

    const query = {
      layout: Layout.RowMajor,
      ranges: ranges,
      bufferSize: size * (types as any)[format].bytes,
      attributes: [request.attribute.name],
      returnRawBuffers: true,
      cancelToken: cancelToken.token
    };

    const generator = tiledbClient.query.ReadQuery(
      request.namespace,
      request.levelRecord.id,
      query
    );

    if (cancelSignal) {
      self.postMessage({ id: id, type: RequestType.CANCEL } as WorkerResponse);
      return;
    }

    let offset = 0;
    const data: TypedArray = (types as any)[format].create(size);

    try {
      for await (const rawResult of generator) {
        const result: TypedArray = (types as any)[format].create(
          (rawResult as any)[request.attribute.name]
        );
        data.set(result, offset);
        offset += result.length;
      }
    } catch (e) {
      self.postMessage({ id: id, type: RequestType.CANCEL } as WorkerResponse);
      return;
    }

    const shape: number[] = [];

    for (const axis of axesArray) {
      switch (axis) {
        case 'X':
        case 'Y':
          shape.push(
            calculatedRanges.get(axis)[1] - calculatedRanges.get(axis)[0] + 1
          );
          break;
        case 'C':
          shape.push(missingChannels.length);
          break;
        default:
          shape.push(1);
          break;
      }
    }

    const retievedData = transpose(data, axes, shape, downsampleFactors);

    for (const [index, channel] of missingChannels.entries()) {
      const channelSlice = retievedData.slice(
        index * width * height,
        (index + 1) * width * height
      );
      channelSlices.set(channel, channelSlice);
      await writeToCache(
        `${request.levelRecord.id}_${tilesize}`,
        `${request.attribute.name}_${channel}${extraDimensionsIdentifier}_${request.levelRecord.zoomLevel}_${tile_x}_${tile_y}`,
        channelSlice
      );
    }
  }

  const imageData: TypedArray = (types as any)[format].create(
    channelSlices.size * width * height
  );

  let totalChannelIndex = 0;
  for (let index = 0; index <= request.channelRanges.length; index += 2) {
    for (
      let channel = request.channelRanges[index];
      channel <= request.channelRanges[index + 1];
      ++channel
    ) {
      imageData.set(
        channelSlices.get(channel),
        totalChannelIndex * width * height
      );

      ++totalChannelIndex;
    }
  }

  if (cancelSignal) {
    self.postMessage({ id: id, type: RequestType.CANCEL } as WorkerResponse);
  } else {
    self.postMessage(
      {
        id: id,
        type: RequestType.IMAGE,
        response: {
          index: request.index,
          data: imageData,
          width: width,
          height: height,
          channels: channelSlices.size,
          dtype: format,
          canceled: cancelSignal
        } as ImageResponse
      } as WorkerResponse,
      [imageData.buffer] as any
    );
  }
}

async function geometryRequest(request: GeometryMessage) {}
