import { GeometryDataContent, SceneOptions } from '../../../types';
import { GeometryMetadata } from '../../types';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { Fetcher } from '../fetcher';
import { Tile } from '../tile';
import { GeometryContent } from './geometryContent';

export class GeometryFetcher extends Fetcher<
  Tile<GeometryDataContent, GeometryContent>
> {
  private workerPool: WorkerPool;
  private metadata: GeometryMetadata;
  private sceneOptions: SceneOptions;

  private nonce: number;

  constructor(
    workerPool: WorkerPool,
    metadata: GeometryMetadata,
    sceneOptions: SceneOptions
  ) {
    super();

    this.workerPool = workerPool;
    this.metadata = metadata;
    this.sceneOptions = sceneOptions;

    this.nonce = 0;
  }
  public fetch(tile: Tile<GeometryDataContent, GeometryContent>): Promise<any> {
    throw new Error('Method not implemented.');
  }
  public fetchInfo(
    tile: Tile<GeometryDataContent, GeometryContent>
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
