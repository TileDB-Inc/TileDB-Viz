import { BoundingInfo } from '@babylonjs/core';
import { ImageDataContent } from '../../../types';
import { BaseFetcherOptions, Fetcher } from '../fetcher';
import { Tile } from '../tile';
import { ImageContent } from './imageContent';
import { ImageMetadata, ImagePayload, RequestType } from '../../types';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { Attribute } from '@tiledb-inc/viz-common';

export type ImageFetchOptions = BaseFetcherOptions & {
  selectedAttribute: Attribute;
  channelRanges: number[];
};

export class ImageFetcher extends Fetcher<
  Tile<ImageDataContent, ImageContent>,
  ImageFetchOptions
> {
  private workerPool: WorkerPool;
  private metadata: ImageMetadata;

  constructor(workerPool: WorkerPool, metadata: ImageMetadata) {
    super();

    this.workerPool = workerPool;
    this.metadata = metadata;
  }

  public fetch(
    tile: Tile<ImageDataContent, ImageContent>,
    options: ImageFetchOptions
  ): Promise<any> {
    this.workerPool.postMessage({
      type: RequestType.IMAGE,
      id: tile.id,
      payload: {
        index: tile.index,
        uri: tile.content[0].uri,
        region: tile.content[0].region,
        namespace: this.metadata.namespace,
        attribute: options.selectedAttribute,
        channelRanges: options.channelRanges,
        dimensions: this.metadata.extraDimensions,
        loaderOptions: this.metadata.loaderMetadata?.get(tile.content[0].uri),
        nonce: options.nonce
      } as ImagePayload
    });

    // TODO: Rewrite worker pool to store resolve functions of promises
    return new Promise((resolve, _) => {
      this.workerPool.callbacks.set(`${tile.id}_${options.nonce}`, resolve);
    });
  }

  public fetchInfo(
    tile: Tile<ImageDataContent, ImageContent>,
    boundingInfo?: BoundingInfo,
    ids?: bigint[]
  ): Promise<any> {
    throw new Error('Method not implemented.');
  }
}
