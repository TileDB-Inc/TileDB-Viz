import {
  PointMessage,
  PointResponse,
  TypedArray,
  WorkerResponse
} from '../../types';
import Client, { QueryData } from '@tiledb-inc/tiledb-cloud';
import { Layout, ArraySchema } from '@tiledb-inc/tiledb-cloud/lib/v2';
import {
  concatBuffers,
  interleaveTypedArrays,
  toTypedArray
} from '../../utils/array-utils';
import { getQueryDataFromCache, writeToCache } from '../../../utils/cache';
import { RequestType } from '../../types';

export async function pointCloudRequest(
  id: string,
  client: Client,
  request: PointMessage
) {
  const result: PointResponse = {
    index: request.index,
    nonce: request.nonce,
    canceled: false,
    attributes: {}
  };

  const arraySchema = (await getQueryDataFromCache(
    `${request.arrayID}`,
    'schema'
  )) as ArraySchema | undefined;

  const ranges = [
    [request.minPoint.x, request.maxPoint.x],
    [request.minPoint.z, request.maxPoint.z], // Y is Z,
    [request.minPoint.y, request.maxPoint.y]
  ];

  const buffers: { [attribute: string]: ArrayBuffer } = {};
  const arrays: { [attribute: string]: TypedArray } = {};
  const uniqueAttributes = new Set<string>(
    request.features.flatMap(x => x.attributes)
  );

  for (const attribute of uniqueAttributes) {
    const result = await getQueryDataFromCache(
      `${request.arrayID}`,
      `${attribute}_${request.index.toString()}`
    );

    if (!result) {
      continue;
    }

    arrays[attribute] = result;
    uniqueAttributes.delete(attribute);
  }

  if (uniqueAttributes.size) {
    const query = {
      layout: Layout.Unordered,
      ranges: ranges,
      bufferSize: 20_000_000,
      attributes: Array.from(uniqueAttributes),
      returnRawBuffers: true
    } as QueryData;

    const generator = client.query.ReadQuery(
      request.namespace,
      request.arrayID,
      query,
      arraySchema
    );

    try {
      for await (const results of generator) {
        for (const attribute of uniqueAttributes) {
          buffers[attribute] = concatBuffers(
            results[attribute],
            buffers[attribute]
          );
        }
      }
    } catch (e) {
      throw request.nonce;
    }

    const cachePromises = [];

    for (const attribute of uniqueAttributes) {
      const attributeMetadata = request.attributes.get(attribute);

      if (!attributeMetadata) {
        console.error(`Missing metadata info for attribute ${attribute}`);
        continue;
      }

      const array = toTypedArray(buffers[attribute], attributeMetadata);
      arrays[attribute] = array;
      cachePromises.push(
        writeToCache(
          `${request.arrayID}`,
          `${attribute}_${request.index.toString()}`,
          array
        )
      );
    }

    Promise.all(cachePromises);
  }

  // Features are synthesized by interleaving the attribute values
  for (const feature of request.features) {
    if (!feature.interleaved) {
      continue;
    }

    result.attributes[feature.name] = interleaveTypedArrays(
      ...feature.attributes.map(x => arrays[x])
    );
  }

  // Add the attributes of all non interleaved features
  for (const attribute of new Set(
    request.features.filter(x => !x.interleaved).flatMap(x => x.attributes)
  )) {
    result.attributes[attribute] = arrays[attribute];
  }

  return {
    id: id,
    type: RequestType.POINT_CLOUD,
    response: result
  } as WorkerResponse;
}
