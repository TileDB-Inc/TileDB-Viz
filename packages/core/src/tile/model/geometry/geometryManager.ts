import {
  GeometryMessage,
  DataRequest,
  GeometryResponse,
  RequestType
} from '../../types';
import { GeometryTile } from './geometry';
import { Scene, Camera } from '@babylonjs/core';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { Manager, TileStatus, TileState } from '../manager';
import { GeometryMetadata } from '../../../types';

interface GeometryOptions {
  arrayID: string;
  namespace: string;
  nativeZoom: number;
  baseWidth: number;
  baseHeight: number;
  baseCRS: string;
  transformationCoefficients: number[];
  metadata: GeometryMetadata;
}

export class GeometryManager extends Manager<GeometryTile> {
  private metadata: GeometryMetadata;
  private baseCRS: string;
  private transformationCoefficients: number[];
  private arrayID: string;
  private namespace: string;
  private nativeZoom: number;

  constructor(
    scene: Scene,
    workerPool: WorkerPool,
    tileSize: number,
    geometryOptions: GeometryOptions
  ) {
    super(
      scene,
      workerPool,
      tileSize,
      geometryOptions.baseWidth,
      geometryOptions.baseHeight
    );

    this.metadata = geometryOptions.metadata;
    this.baseCRS = geometryOptions.baseCRS;
    this.transformationCoefficients =
      geometryOptions.transformationCoefficients;
    this.arrayID = geometryOptions.arrayID;
    this.namespace = geometryOptions.namespace;
    this.nativeZoom = geometryOptions.nativeZoom;

    this.workerPool.callbacks.geometry.push(
      this.onGeometryTileDataLoad.bind(this)
    );
  }

  public loadTiles(camera: Camera, zoom: number): void {
    for (const [, value] of this.tileStatus) {
      value.evict = true;
    }

    if (zoom < this.nativeZoom) {
      return;
    }

    const [minXIndex, maxXIndex, minYIndex, maxYIndex] = this.getTileIndexRange(
      camera,
      0
    );

    for (let x = minXIndex; x <= maxXIndex; ++x) {
      for (let y = minYIndex; y <= maxYIndex; ++y) {
        const tileIndex = `geometry_${x}_${y}`;
        const status =
          this.tileStatus.get(tileIndex) ??
          ({ evict: false } as TileStatus<GeometryTile>);

        status.evict = false;

        if (status.state === undefined) {
          this.workerPool.postMessage({
            type: RequestType.GEOMETRY,
            id: tileIndex,
            request: {
              index: [x, y],
              tileSize: this.tileSize,
              arrayID: this.arrayID,
              namespace: this.namespace,
              idAttribute: this.metadata.idAttribute,
              geometryAttribute: this.metadata.geometryAttribute,
              pad: this.metadata.pad,
              type: this.metadata.type,
              imageCRS: this.baseCRS,
              geometryCRS: this.metadata.crs,
              geotransformCoefficients: this.transformationCoefficients
            } as GeometryMessage
          } as DataRequest);

          this.updateLoadingStatus(false);

          status.state = TileState.LOADING;
          this.tileStatus.set(tileIndex, status);
        }
      }
    }

    for (const key of this.tileStatus.keys()) {
      const status = this.tileStatus.get(key);
      if (!status?.evict) {
        continue;
      }

      if (status.state === TileState.LOADING) {
        const canceled = this.workerPool.cancelRequest({
          type: RequestType.CANCEL,
          id: key
        } as DataRequest);

        if (canceled) {
          this.updateLoadingStatus(true);
        }
      } else if (status.state === TileState.VISIBLE) {
        status.tile?.dispose();
      }

      this.tileStatus.delete(key);
    }
  }

  private onGeometryTileDataLoad(id: string, response: GeometryResponse) {
    if (response.canceled) {
      return;
    }

    const tileIndex = `geometry_${response.index[0]}_${response.index[1]}`;
    const status =
      this.tileStatus.get(tileIndex) ??
      ({
        evict: false,
        state: TileState.VISIBLE
      } as TileStatus<GeometryTile>);

    if (status.tile) {
      status.tile.update({ response });
    } else {
      status.tile = new GeometryTile(response, this.scene);
    }

    status.state = TileState.VISIBLE;
    this.tileStatus.set(tileIndex, status);
    this.updateLoadingStatus(true);
  }
}
