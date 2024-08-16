import Client from '@tiledb-inc/tiledb-cloud';
import { CancelTokenSource } from 'axios';
import {
  ImagePayload,
  ImageResponse,
  RequestType,
  WorkerResponse,
  types
} from '../../types';
import { Layout } from '@tiledb-inc/tiledb-cloud/lib/v2';
import { Axes, transpose } from '../../utils';
import { getQueryDataFromCache, writeToCache } from '../../../utils/cache';
import { getWebPRanges } from './utils';

type ImageDataArray = Uint8Array | Int8Array | Uint16Array | Float32Array;

export async function imageRequest(
  id: number,
  client: Client,
  tokenSource: CancelTokenSource,
  payload: ImagePayload
) {
  const format = payload.attribute.type;
  const metadata = payload.loaderOptions;
  let channelAxis = 'C';

  const sourceAxes = metadata.isWebPCompressed
    ? ['Y', 'X', 'C']
    : metadata.dimensions
        .filter(x => payload.dimensions.find(y => y.name === x) === undefined)
        .map(x => {
          if (x === payload.region[0].dimension) {
            return 'X';
          } else if (x === payload.region[1].dimension) {
            return 'Y';
          } else {
            channelAxis = x;
            return 'C';
          }
        });
  if (metadata.implicitChannel) {
    sourceAxes.unshift('C');
  }
  const axes = new Axes(sourceAxes, ['C', 'Y', 'X']);
  const width = payload.region[0].max - payload.region[0].min;
  const height = payload.region[1].max - payload.region[1].min;

  const channelSlices = new Map<number, any>();
  const missingChannels: Array<number> = [];
  const index = [...payload.index, ...payload.dimensions.map(x => x.value)];

  for (let idx = 0; idx <= payload.channelRanges.length; idx += 2) {
    for (
      let channel = payload.channelRanges[idx];
      channel <= payload.channelRanges[idx + 1];
      ++channel
    ) {
      tokenSource.token.throwIfRequested();

      const result = await getQueryDataFromCache(
        payload.uri,
        `${payload.attribute.name}_${index.join('_')}_${channel}`
      );

      if (result) {
        channelSlices.set(channel, result);
      } else {
        missingChannels.push(channel);
      }
    }
  }

  // Check if image request cancelled
  tokenSource.token.throwIfRequested();

  const calculatedRanges: Map<string, number[]> = new Map();

  // Width dimension
  calculatedRanges.set(payload.region[0].dimension, [
    payload.region[0].min,
    payload.region[0].max - 1
  ]);
  // Height dimension
  calculatedRanges.set(payload.region[1].dimension, [
    payload.region[1].min,
    payload.region[1].max - 1
  ]);

  for (const extraDimension of payload.dimensions) {
    calculatedRanges.set(extraDimension.name, [
      extraDimension.value,
      extraDimension.value
    ]);
  }

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
    calculatedRanges.set(channelAxis, channelRanges);

    let ranges: (number[] | number[][])[] = [];
    let size = 0;

    if (metadata.isWebPCompressed) {
      // In case of WebP compressedarray calculate the ranges of the interleaved XC dimension.
      size = 0;
      ranges = [[payload.region[1].min, payload.region[1].max - 1]];
      const channelCount =
        metadata.schema.attributes
          .find(
            x => x.filterPipeline.filters?.some(y => y.type === 'WEBP') ?? false
          )
          ?.filterPipeline.filters?.find(z => z.type === 'WEBP').webpConfig
          .format < 3
          ? 3
          : 4;

      for (let idx = 0; idx < payload.channelRanges.length; idx += 2) {
        size += payload.channelRanges[idx + 1] - payload.channelRanges[idx] + 1;
      }

      size *=
        (payload.region[1].max - payload.region[1].min) *
        (payload.region[0].max - payload.region[0].min);
      ranges.push(
        getWebPRanges(
          [payload.region[0].min, payload.region[0].max],
          channelCount,
          channelRanges
        )
      );
    } else {
      size = 1;
      metadata.dimensions.map(x => {
        const range = calculatedRanges.get(x)!;
        const domain = metadata.domain.find(y => y.name === x) ?? { min: 0 };

        if (range.length > 2) {
          const subrange = [];
          let subsize = 0;
          for (let idx = 0; idx < range.length; idx += 2) {
            subrange.push([
              range[idx] + domain.min,
              range[idx + 1] + domain.min
            ]);
            subsize += range[idx + 1] - range[idx] + 1;
          }
          size *= subsize;
          ranges.push(subrange);
        } else {
          ranges.push([range[0] + domain.min, range[1] + domain.min]);
          size *= range[1] - range[0] + 1;
        }
      });
    }

    if (ranges.length === 0) {
      return;
    }

    const query = {
      layout: Layout.RowMajor,
      ranges: ranges,
      bufferSize: size * (types as any)[format.toLowerCase()].bytes,
      attributes: [payload.attribute.name],
      returnRawBuffers: true,
      cancelToken: tokenSource.token
    };

    const generator = client.query.ReadQuery(
      payload.namespace,
      payload.uri,
      query,
      metadata.schema
    );

    tokenSource.token.throwIfRequested();

    let offset = 0;
    const data: ImageDataArray = (types as any)[format.toLowerCase()].create(
      size
    );

    try {
      for await (const rawResult of generator) {
        const result: ImageDataArray = (types as any)[
          format.toLowerCase()
        ].create((rawResult as any)[payload.attribute.name]);
        data.set(result, offset);
        offset += result.length;
      }
    } catch (e) {
      console.log(e);
      self.postMessage({
        id: id,
        type: RequestType.CANCEL
      } as WorkerResponse);
      return;
    }

    const shape: number[] = [];

    for (const axis of sourceAxes) {
      switch (axis) {
        case 'X':
        case 'Y':
          shape.push(
            calculatedRanges.get(axis)![1] - calculatedRanges.get(axis)![0] + 1
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

    const retievedData = transpose(data, axes, shape);

    for (const [idx, channel] of missingChannels.entries()) {
      const channelSlice = retievedData.slice(
        idx * width * height,
        (idx + 1) * width * height
      );
      channelSlices.set(channel, channelSlice);
      await writeToCache(
        payload.uri,
        `${payload.attribute.name}_${index.join('_')}_${channel}`,
        channelSlice
      );
    }
  }

  const imageData: ImageDataArray = (types as any)[format.toLowerCase()].create(
    channelSlices.size * width * height
  );

  let totalChannelIndex = 0;
  for (let index = 0; index <= payload.channelRanges.length; index += 2) {
    for (
      let channel = payload.channelRanges[index];
      channel <= payload.channelRanges[index + 1];
      ++channel
    ) {
      imageData.set(
        channelSlices.get(channel),
        totalChannelIndex * width * height
      );

      ++totalChannelIndex;
    }
  }

  tokenSource.token.throwIfRequested();

  self.postMessage(
    {
      id: id,
      type: RequestType.IMAGE,
      response: {
        index: payload.index,
        data: imageData,
        width: width,
        height: height,
        channels: channelSlices.size,
        dtype: format,
        canceled: tokenSource?.token.reason !== undefined,
        nonce: payload.nonce
      } as ImageResponse
    } as WorkerResponse,
    [imageData.buffer] as any
  );
}
