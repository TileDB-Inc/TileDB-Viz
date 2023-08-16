import client from '@tiledb-inc/tiledb-cloud';
import { Layout } from '@tiledb-inc/tiledb-cloud/lib/v2';
import { QueryMessage, TypedArray, types } from '../types';
import { transpose, sliceRanges, Axes } from '../utils/array-utils';
import { getQueryDataFromCache, writeToCache } from '../../utils/cache';

self.onmessage = async function (event: MessageEvent<QueryMessage>) {
  const config = {
    apiKey: event.data.token
    //basePath: event.data.basePath
  };

  const queryClient = new client(config);

  const levelWidth =
    event.data.levelRecord.dimensions[event.data.levelRecord.axes.indexOf('X')];
  const levelHeight =
    event.data.levelRecord.dimensions[event.data.levelRecord.axes.indexOf('Y')];

  const downsample = event.data.levelRecord.downsample;
  const [tile_x, tile_y] = event.data.index;
  const tilesize = event.data.tileSize;
  const format = event.data.attribute.type.toLowerCase();
  const extraDimensionsIdentifier =
    event.data.dimensions.length > 0
      ? '_' + event.data.dimensions.map(x => x.value).join('_')
      : '';

  const axesArray = event.data.levelRecord.arrayAxes
    .map(x => event.data.levelRecord.axesMapping.get(x) ?? x)
    .flat();

  if (axesArray.indexOf('C') === -1) {
    axesArray.push('C');
  }

  const dimensionMap = event.data.levelRecord.axesMapping;
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

  for (let index = 0; index <= event.data.channelRanges.length; index += 2) {
    for (
      let channel = event.data.channelRanges[index];
      channel <= event.data.channelRanges[index + 1];
      ++channel
    ) {
      const result = await getQueryDataFromCache(
        `${event.data.levelRecord.id}_${tilesize}`,
        `${event.data.attribute.name}_${channel}${extraDimensionsIdentifier}_${event.data.levelRecord.zoomLevel}_${tile_x}_${tile_y}`
      );

      if (result) {
        channelSlices.set(channel, result);
      } else {
        missingChannels.push(channel);
      }
    }
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

  for (const extraDimension of event.data.dimensions) {
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
      event.data.levelRecord.dimensions,
      event.data.levelRecord.axes,
      event.data.levelRecord.arrayAxes,
      dimensionMap,
      calculatedRanges,
      event.data.levelRecord.arrayExtends,
      event.data.levelRecord.arrayOffset
    );

    if (ranges.length === 0) {
      return;
    }

    const query = {
      layout: Layout.RowMajor,
      ranges: ranges,
      bufferSize: size * (types as any)[format].bytes,
      attributes: [event.data.attribute.name],
      returnRawBuffers: true
    };

    const generator = queryClient.query.ReadQuery(
      event.data.namespace,
      event.data.levelRecord.id,
      query
    );

    let offset = 0;
    const data: TypedArray = (types as any)[format].create(size);

    for await (const rawResult of generator) {
      const result: TypedArray = (types as any)[format].create(
        (rawResult as any)[event.data.attribute.name]
      );
      data.set(result, offset);
      offset += result.length;
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
        `${event.data.levelRecord.id}_${tilesize}`,
        `${event.data.attribute.name}_${channel}${extraDimensionsIdentifier}_${event.data.levelRecord.zoomLevel}_${tile_x}_${tile_y}`,
        channelSlice
      );
    }
  }

  const imageData: TypedArray = (types as any)[format].create(
    channelSlices.size * width * height
  );

  let totalChannelIndex = 0;
  for (let index = 0; index <= event.data.channelRanges.length; index += 2) {
    for (
      let channel = event.data.channelRanges[index];
      channel <= event.data.channelRanges[index + 1];
      ++channel
    ) {
      imageData.set(
        channelSlices.get(channel),
        totalChannelIndex * width * height
      );

      ++totalChannelIndex;
    }
  }

  self.postMessage(
    {
      data: imageData,
      width: width,
      height: height,
      channels: channelSlices.size
    },
    [imageData.buffer] as any
  );
};
