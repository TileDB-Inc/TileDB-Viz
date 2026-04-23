import { CancelTokenSource } from 'axios';
import {
  ImageResponse,
  RequestType,
  SVSImagePayload,
  WorkerResponse,
} from '../../types';
import { Datatype } from '@tiledb-inc/tiledb-cloud/v3';
import { Axes, transpose } from '../../utils';

type ImageDataArray = Uint8Array | Int8Array | Uint16Array | Float32Array;

export async function svsImageRequest(
  id: number,
  tokenSource: CancelTokenSource,
  payload: SVSImagePayload
) {

  const sourceAxes = ["Y", "X", "C"];
  const axes = new Axes(sourceAxes, ['C', 'Y', 'X']);

  const channelSlices = new Map<number, any>();

  // Check if image request cancelled
  tokenSource.token.throwIfRequested();

  const channels: Array<number> = []
  for (let idx = 0; idx <= payload.channelRanges.length; idx += 2) {
    for (
      let channel = payload.channelRanges[idx];
      channel <= payload.channelRanges[idx + 1];
      ++channel
    ) {
      channels.push(channel);
    }
  }

  const shape: number[] = [];

  for (const axis of sourceAxes) {
    switch (axis) {
      case 'X':
        shape.push(payload.width);
        break;
      case 'Y':
        shape.push(payload.height);
        break;
      case 'C':
        shape.push(channels.length + 1);
        break;
      default:
        shape.push(1);
        break;
    }
  }

  tokenSource.token.throwIfRequested();
  const retievedData = transpose(payload.buffer, axes, shape);

  for (const [idx, channel] of channels.entries()) {
    const channelSlice = retievedData.slice(
      idx * payload.width * payload.height,
      (idx + 1) * payload.width * payload.height
    );
    channelSlices.set(channel, channelSlice);
  }

  const imageData: ImageDataArray = new Uint8Array(channelSlices.size * payload.width * payload.height);

  let totalChannelIndex = 0;
  for (let index = 0; index <= payload.channelRanges.length; index += 2) {
    for (
      let channel = payload.channelRanges[index];
      channel <= payload.channelRanges[index + 1];
      ++channel
    ) {
      imageData.set(
        channelSlices.get(channel),
        totalChannelIndex * payload.width * payload.height
      );

      ++totalChannelIndex;
    }
  }

  tokenSource.token.throwIfRequested();

  self.postMessage(
    {
      id: id,
      type: RequestType.SVSIMAGE,
      response: {
        index: payload.index,
        data: imageData,
        width: payload.width,
        height: payload.height,
        channels: channelSlices.size,
        dtype: Datatype.Uint8,
        canceled: tokenSource?.token.reason !== undefined,
        nonce: payload.nonce
      } as ImageResponse
    } as WorkerResponse,
    [imageData.buffer] as any
  );
}
