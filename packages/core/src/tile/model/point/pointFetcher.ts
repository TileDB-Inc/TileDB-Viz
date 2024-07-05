import { PointDataContent, SceneOptions } from '../../../types';
import { Fetcher } from '../fetcher';
import { Tile } from '../tile';
import { PointTileContent } from './pointContent';
import {
  DataRequest,
  PointCloudMetadata,
  PointCloudPayload,
  RequestType,
  TileDBInfoPayload
} from '../../types';
import { WorkerPool } from '../../worker/tiledb.worker.pool';

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

  public fetch(tile: Tile<PointDataContent, PointTileContent>): Promise<any> {
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
        transformation: this.sceneOptions.transformation?.toArray(),
        targetCRS: this.sceneOptions.crs,
        sourceCRS: this.metadata.crs,
        nonce: this.nonce
      } as PointCloudPayload
    } as DataRequest);

    return new Promise((resolve, _) =>
      this.workerPool.callbacks.set(`${tile.id}_${this.nonce}`, resolve)
    );
  }

  public fetchInfo(
    tile: Tile<PointDataContent, PointTileContent>
  ): Promise<any> {
    this.workerPool.postMessage({
      type: RequestType.POINT,
      id: tile.id,
      payload: {
        namespace: this.metadata.namespace,
        uri: tile.content[0].uri,
        region: tile.content[0].region,
        domain: this.metadata.domain,
        nonce: this.nonce
      } as TileDBInfoPayload
    } as DataRequest);

    return new Promise((resolve, _) =>
      this.workerPool.callbacks.set(`${tile.id}_${this.nonce}`, resolve)
    );
  }
}
