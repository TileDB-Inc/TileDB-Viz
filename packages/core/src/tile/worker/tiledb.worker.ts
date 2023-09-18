import { Layout } from '@tiledb-inc/tiledb-cloud/lib/v2';
import {
  DataRequest,
  ImageMessage,
  RequestType,
  InitializeMessage,
  TypedArray,
  types,
  WorkerResponse,
  ImageResponse,
  GeometryResponse,
  GeometryMessage,
  GeometryInfoMessage,
  GeometryInfoResponse
} from '../types';
import { transpose, sliceRanges, Axes } from '../utils/array-utils';
import { getQueryDataFromCache, writeToCache } from '../../utils/cache';
import axios, { CancelTokenSource } from 'axios';
import getTileDBClient from '../../utils/getTileDBClient';
import Client from '@tiledb-inc/tiledb-cloud';
import proj4 from 'proj4';
import { Buffer as NodeBuffer } from 'node-buffer';
import wkx from '@syncpoint/wkx';
import earcut from 'earcut';

let tiledbClient: Client | undefined = undefined;
let cancelSignal = false;
let tokenSource: CancelTokenSource | undefined = undefined;
let currentId = '';
const CancelToken = axios.CancelToken;

self.onmessage = function (event: MessageEvent<DataRequest>) {
  switch (event.data.type) {
    case RequestType.IMAGE:
      cancelSignal = false;
      currentId = event.data.id;
      tokenSource = CancelToken.source();
      imageRequest(event.data.id, event.data.request as ImageMessage);
      break;
    case RequestType.GEOMETRY:
      cancelSignal = false;
      currentId = event.data.id;
      tokenSource = CancelToken.source();
      geometryRequest(event.data.id, event.data.request as GeometryMessage);
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
    case RequestType.INITIALIZE:
      initialize(event.data.request as InitializeMessage);
      break;
    default:
      break;
  }
};

function initialize(request: InitializeMessage) {
  tiledbClient = getTileDBClient({
    ...(request.token ? { apiKey: request.token } : {}),
    ...(request.basePath ? { basePath: request.basePath } : {})
  });
}

async function imageRequest(id: string, request: ImageMessage) {
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
      cancelToken: tokenSource?.token
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

async function geometryRequest(id: string, request: GeometryMessage) {
  if (!tiledbClient) {
    console.warn('TileDB client is not initialized');
    return;
  }

  const [x, y] = request.index;
  const tileSize = request.tileSize;

  const cachedPositions = await getQueryDataFromCache(
    `${request.arrayID}_${tileSize}`,
    `${'position'}_${x}_${y}`
  );

  if (cachedPositions) {
    const cachedIds = await getQueryDataFromCache(
      `${request.arrayID}_${tileSize}`,
      `${'ids'}_${x}_${y}`
    );
    const cachedIndices = await getQueryDataFromCache(
      `${request.arrayID}_${tileSize}`,
      `${'indices'}_${x}_${y}`
    );

    if (cancelSignal) {
      self.postMessage({ id: id, type: RequestType.CANCEL } as WorkerResponse);
    } else {
      self.postMessage(
        {
          id: id,
          type: RequestType.GEOMETRY,
          response: {
            index: request.index,
            positions: cachedPositions,
            ids: cachedIds,
            indices: cachedIndices,
            gtype: request.type,
            canceled: cancelSignal
          } as GeometryResponse
        } as WorkerResponse,
        [cachedPositions.buffer, cachedIds.buffer, cachedIndices.buffer] as any
      );
    }

    return;
  }

  const converter = proj4(request.geometryCRS, request.imageCRS);
  const geotransformCoefficients = request.geotransformCoefficients;

  const xPixelLimits = [x * tileSize, (x + 1) * tileSize];
  const yPixelLimits = [y * tileSize, (y + 1) * tileSize];

  const geoXMin =
    geotransformCoefficients[0] +
    geotransformCoefficients[1] * xPixelLimits[0] +
    geotransformCoefficients[2] * yPixelLimits[0];
  const geoYMin =
    geotransformCoefficients[3] +
    geotransformCoefficients[4] * xPixelLimits[0] +
    geotransformCoefficients[5] * yPixelLimits[0];
  const geoXMax =
    geotransformCoefficients[0] +
    geotransformCoefficients[1] * xPixelLimits[1] +
    geotransformCoefficients[2] * yPixelLimits[1];
  const geoYMax =
    geotransformCoefficients[3] +
    geotransformCoefficients[4] * xPixelLimits[1] +
    geotransformCoefficients[5] * yPixelLimits[1];

  const minLimit = converter.inverse([geoXMin, geoYMin]);
  const maxLimit = converter.inverse([geoXMax, geoYMax]);

  const xRange = [minLimit[0], maxLimit[0]].sort();
  const yRange = [minLimit[1], maxLimit[1]].sort();

  const query = {
    layout: Layout.Unordered,
    ranges: [
      [xRange[0] - request.pad[0], xRange[1] + request.pad[0]],
      [yRange[0] - request.pad[1], yRange[1] + request.pad[1]]
    ],
    bufferSize: 20_000_000,
    attributes: [request.geometryAttribute, request.idAttribute],
    returnRawBuffers: true,
    ignoreOffsets: true,
    returnOffsets: true,
    cancelToken: tokenSource?.token
  };

  const generator = tiledbClient.query.ReadQuery(
    request.namespace,
    request.arrayID,
    query
  );

  const ids: BigInt64Array[] = [];
  const wkbs: ArrayBuffer[] = [];
  const offsets: BigUint64Array[] = [];

  try {
    for await (const result of generator) {
      if ((result as any)['__offsets'][request.geometryAttribute]) {
        ids.push(new BigInt64Array((result as any)[request.idAttribute]));

        wkbs.push((result as any)[request.geometryAttribute]);
        offsets.push((result as any)['__offsets'][request.geometryAttribute]);
      }
    }
  } catch (e) {
    self.postMessage({ id: id, type: RequestType.CANCEL } as WorkerResponse);
    return;
  }

  if (wkbs.length === 0) {
    await writeToCache(
      `${request.arrayID}_${tileSize}`,
      `${'position'}_${x}_${y}`,
      new Float32Array()
    );
    await writeToCache(
      `${request.arrayID}_${tileSize}`,
      `${'ids'}_${x}_${y}`,
      new BigInt64Array()
    );
    await writeToCache(
      `${request.arrayID}_${tileSize}`,
      `${'indices'}_${x}_${y}`,
      new Int32Array()
    );

    self.postMessage({
      id: id,
      type: RequestType.GEOMETRY,
      response: {
        index: request.index,
        positions: new Float32Array(),
        ids: new BigInt64Array(),
        indices: new Int32Array(),
        gtype: request.type,
        canceled: cancelSignal
      } as GeometryResponse
    } as WorkerResponse);

    return;
  }

  const positions: number[] = [];
  const indices: number[] = [];
  const faceMapping: bigint[] = [];

  switch (request.type) {
    case 'Polygon':
      for (let index = 0; index < wkbs.length; ++index) {
        parsePolygon(
          wkbs[index],
          offsets[index],
          ids[index],
          positions,
          indices,
          faceMapping,
          converter,
          geotransformCoefficients
        );
      }
      break;
    default:
      console.warn(`Unknown geometry type "${request.type}"`);
      return;
  }

  const rawPositions = Float32Array.from(positions);
  const rawIds = BigInt64Array.from(faceMapping);
  const rawIndices = Int32Array.from(indices);

  await writeToCache(
    `${request.arrayID}_${tileSize}`,
    `${'position'}_${x}_${y}`,
    rawPositions
  );
  await writeToCache(
    `${request.arrayID}_${tileSize}`,
    `${'ids'}_${x}_${y}`,
    rawIds
  );
  await writeToCache(
    `${request.arrayID}_${tileSize}`,
    `${'indices'}_${x}_${y}`,
    rawIndices
  );

  if (cancelSignal) {
    self.postMessage({ id: id, type: RequestType.CANCEL } as WorkerResponse);
  } else {
    self.postMessage(
      {
        id: id,
        type: RequestType.GEOMETRY,
        response: {
          index: request.index,
          positions: rawPositions,
          ids: rawIds,
          indices: rawIndices,
          gtype: request.type,
          canceled: cancelSignal
        } as GeometryResponse
      } as WorkerResponse,
      [rawPositions.buffer, rawIds.buffer, rawIndices.buffer] as any
    );
  }
}

async function geometryInfoRequest(id: string, request: GeometryInfoMessage) {
  if (!tiledbClient) {
    console.warn('TileDB client is not initialized');
    return;
  }

  const [x, y] = request.index;
  const tileSize = request.tileSize;

  const cachedPositions = (await getQueryDataFromCache(
    `${request.arrayID}_${tileSize}`,
    `${'position'}_${x}_${y}`
  )) as Float32Array | undefined;

  const cachedIds = (await getQueryDataFromCache(
    `${request.arrayID}_${tileSize}`,
    `${'ids'}_${x}_${y}`
  )) as BigInt64Array | undefined;

  if (cancelSignal || !(cachedPositions && cachedIds)) {
    self.postMessage({ id: id, type: RequestType.CANCEL } as WorkerResponse);
    return;
  }

  let xRange = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
  let yRange = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];

  let index = cachedIds.indexOf(request.id);
  while (index !== -1) {
    const pointX = cachedPositions[3 * index];
    const pointY = cachedPositions[3 * index + 2];

    xRange[0] = Math.min(xRange[0], pointX);
    xRange[1] = Math.max(xRange[1], pointX);
    yRange[0] = Math.min(yRange[0], pointY);
    yRange[1] = Math.max(yRange[1], pointY);

    index = cachedIds.indexOf(request.id, index + 1);
  }

  const converter = proj4(request.geometryCRS, request.imageCRS);
  const geotransformCoefficients = request.geotransformCoefficients;

  xRange[0] =
    geotransformCoefficients[0] +
    geotransformCoefficients[1] * xRange[0] +
    geotransformCoefficients[2] * yRange[0];

  yRange[0] =
    geotransformCoefficients[3] +
    geotransformCoefficients[4] * xRange[0] +
    geotransformCoefficients[5] * yRange[0];

  xRange[1] =
    geotransformCoefficients[0] +
    geotransformCoefficients[1] * xRange[1] +
    geotransformCoefficients[2] * yRange[1];

  yRange[1] =
    geotransformCoefficients[3] +
    geotransformCoefficients[4] * xRange[1] +
    geotransformCoefficients[5] * yRange[1];

  const minLimit = converter.inverse([xRange[0], yRange[0]]);
  const maxLimit = converter.inverse([xRange[1], yRange[1]]);

  xRange = [minLimit[0], maxLimit[0]].sort();
  yRange = [minLimit[1], maxLimit[1]].sort();

  const query = {
    layout: Layout.Unordered,
    ranges: [xRange, yRange],
    bufferSize: 20_000_000,
    cancelToken: tokenSource?.token
  };

  const generator = tiledbClient.query.ReadQuery(
    request.namespace,
    request.arrayID,
    query
  );

  const info = {} as any;
  const positions: number[] = [];
  const indices: number[] = [];
  const faceMapping: bigint[] = [];

  try {
    for await (const result of generator) {
      const index = (result as any)[request.idAttribute].indexOf(request.id);

      if (index === -1) {
        continue;
      }

      for (const [key, val] of Object.entries(result)) {
        if (key === request.idAttribute) {
          continue;
        } else if (key === request.geometryAttribute) {
          parsePolygon(
            val[index],
            BigUint64Array.from([0n]),
            BigInt64Array.from([0n]),
            positions,
            indices,
            faceMapping,
            converter,
            geotransformCoefficients
          );
          continue;
        }

        info[key] = val[index];
      }
    }
  } catch (e) {
    self.postMessage({ id: id, type: RequestType.CANCEL } as WorkerResponse);
    return;
  }

  self.postMessage({
    id: id,
    type: RequestType.GEOMETRY_INFO,
    response: {
      index: [],
      canceled: cancelSignal,
      info: info,
      positions: Float32Array.from(positions),
      indices: Int32Array.from(indices)
    } as GeometryInfoResponse
  } as WorkerResponse);

  return;
}

function parsePolygon(
  wkbs: ArrayBuffer,
  offsets: BigUint64Array,
  ids: BigInt64Array,
  positions: number[],
  indices: number[],
  faceMapping: bigint[],
  converter: proj4.Converter,
  geotransformCoefficients: number[]
) {
  let positionOffset = positions.length;

  for (const [geometryIndex, offset] of offsets.entries()) {
    const entry = wkx.Geometry.parse(
      NodeBuffer.from(
        wkbs,
        Number(offset),
        geometryIndex === offsets.length - 1
          ? undefined
          : Number(offsets[geometryIndex + 1] - offset)
      )
    );
    const shape: number[] = [];
    const holes: number[] = [];

    for (let index = 0; index < entry.exteriorRing.length; ++index) {
      const point = entry.exteriorRing[index];
      [point.x, point.y] = converter.forward([point.x, point.y]);
      [point.x, point.y] = [
        (point.x - geotransformCoefficients[0]) / geotransformCoefficients[1],
        (point.y - geotransformCoefficients[3]) / geotransformCoefficients[5]
      ];
      shape.push(point.x, point.y);
      positions.push(point.x, 0, point.y);
    }

    for (
      let holeIndex = 0;
      holeIndex < entry.interiorRings.length;
      ++holeIndex
    ) {
      holes.push(shape.length / 2);
      for (
        let index = 0;
        index < entry.interiorRings[holeIndex].length;
        ++index
      ) {
        const point = entry.interiorRings[holeIndex][index];
        [point.x, point.y] = converter.forward([point.x, point.y]);
        [point.x, point.y] = [
          (point.x - geotransformCoefficients[0]) / geotransformCoefficients[1],
          (point.y - geotransformCoefficients[3]) / geotransformCoefficients[5]
        ];
        shape.push(point.x, point.y);
        positions.push(point.x, 0, point.y);
      }
    }

    const trianglulation = earcut(shape, holes.length > 0 ? holes : null, 2);

    indices.push(...trianglulation.map((x: number) => x + positionOffset / 3));
    faceMapping.push(...new Array(shape.length / 2).fill(ids[geometryIndex]));

    positionOffset += (shape.length / 2) * 3;
  }
}