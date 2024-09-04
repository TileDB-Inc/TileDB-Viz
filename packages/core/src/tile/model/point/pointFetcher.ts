import { PointDataContent, SceneOptions } from '../../../types';
import { BaseFetcherOptions, Fetcher } from '../fetcher';
import { Tile } from '../tile';
import { PointTileContent } from './pointContent';
import {
  DataRequest,
  InfoResponse,
  PointCloudInfoPayload,
  PointCloudMetadata,
  PointCloudPayload,
  RequestType
} from '../../types';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { BoundingInfo } from '@babylonjs/core';

export class PointCloudFetcher extends Fetcher<
  Tile<PointDataContent, PointTileContent>
> {
  private workerPool: WorkerPool;
  private metadata: PointCloudMetadata;
  private sceneOptions: SceneOptions;

  private nonce: number;

  constructor(
    workerPool: WorkerPool,
    metadata: PointCloudMetadata,
    sceneOptions: SceneOptions
  ) {
    super();

    this.workerPool = workerPool;
    this.metadata = metadata;
    this.sceneOptions = sceneOptions;
    this.nonce = 0;
  }

  public fetch(
    tile: Tile<PointDataContent, PointTileContent>,
    options: BaseFetcherOptions
  ): Promise<any> {
    this.workerPool.postMessage({
      type: RequestType.POINT,
      id: tile.id,
      payload: {
        index: tile.index,
        namespace: this.metadata.namespace,
        uri: tile.content[0].uri,
        region: tile.content[0].region,
        features: this.metadata.features,
        attributes: this.metadata.attributes,
        domain: this.metadata.domain,
        idAttribute: this.metadata.idAttribute,
        transformation: this.sceneOptions.transformation?.toArray(),
        targetCRS: this.sceneOptions.crs,
        sourceCRS: this.metadata.crs,
        nonce: options.nonce
      } as PointCloudPayload
    } as DataRequest);

    return new Promise((resolve, _) =>
      this.workerPool.callbacks.set(`${tile.id}_${options.nonce}`, resolve)
    );
  }

  public fetchInfo(
    tile: Tile<PointDataContent, PointTileContent>,
    boundingInfo?: BoundingInfo,
    ids?: bigint[]
  ): Promise<any> {
    this.workerPool.postMessage({
      type: RequestType.POINT_INFO,
      id: tile.id,
      payload: {
        namespace: this.metadata.namespace,
        uri: tile.content[0].uri,
        region: boundingInfo
          ? tile.content[0].region.map((x, index) => {
              return {
                dimension: x.dimension,
                min: boundingInfo.boundingBox.minimum.asArray()[index],
                max: boundingInfo.boundingBox.maximum.asArray()[index]
              };
            })
          : tile.content[0].region,
        idAttribute: this.metadata.idAttribute,
        domain: this.metadata.domain,
        ids: new Set(ids),
        nonce: ++this.nonce
      } as PointCloudInfoPayload
    } as DataRequest);

    return new Promise<InfoResponse>((resolve, _) =>
      this.workerPool.callbacks.set(`${tile.id}_${this.nonce}`, resolve)
    );
  }
}
