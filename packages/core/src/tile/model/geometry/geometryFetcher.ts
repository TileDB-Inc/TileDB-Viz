import { BoundingInfo } from '@babylonjs/core';
import { GeometryDataContent, SceneOptions } from '../../../types';
import {
  DataRequest,
  GeometryInfoPayload,
  GeometryMetadata,
  GeometryPayload,
  RequestType
} from '../../types';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { BaseFetcherOptions, Fetcher } from '../fetcher';
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

  public fetch(
    tile: Tile<GeometryDataContent, GeometryContent>,
    options: BaseFetcherOptions
  ): Promise<any> {
    this.workerPool.postMessage({
      type: RequestType.GEOMETRY,
      id: tile.id,
      payload: {
        index: tile.index,
        uri: tile.content[0].uri,
        region: tile.content[0].region,
        namespace: this.metadata.namespace,
        type: this.metadata.type,
        sourceCRS: this.metadata.crs,
        targetCRS: this.sceneOptions.crs,
        transformation: this.sceneOptions.transformation?.toArray(),
        attributes: this.metadata.attributes,
        features: this.metadata.features,
        geometryAttribute: this.metadata.geometryAttribute,
        idAttribute: this.metadata.idAttribute,
        heightAttribute: this.metadata.extrudeAttribute,
        nonce: options.nonce
      } as GeometryPayload
    } as DataRequest);

    return new Promise((resolve, _) => {
      this.workerPool.callbacks.set(`${tile.id}_${options.nonce}`, resolve);
    });
  }

  public fetchInfo(
    tile: Tile<GeometryDataContent, GeometryContent>,
    boundingInfo?: BoundingInfo,
    ids?: bigint[]
  ): Promise<any> {
    this.workerPool.postMessage({
      type: RequestType.GEOMETRY_INFO,
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
        geometryAttribute: this.metadata.geometryAttribute,
        ids: new Set(ids),
        nonce: ++this.nonce
      } as GeometryInfoPayload
    } as DataRequest);

    return new Promise((resolve, _) =>
      this.workerPool.callbacks.set(`${tile.id}_${this.nonce}`, resolve)
    );
  }
}
