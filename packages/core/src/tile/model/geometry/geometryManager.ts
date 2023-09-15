import {
  GeometryMessage,
  DataRequest,
  GeometryResponse,
  RequestType,
  GeometryInfoMessage
} from '../../types';
import { GeometryTile } from './geometry';
import {
  Scene,
  Camera,
  RenderTargetTexture,
  AbstractMesh
} from '@babylonjs/core';
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
  renderTarget: RenderTargetTexture;
}

export class GeometryManager extends Manager<GeometryTile> {
  private metadata: GeometryMetadata;
  private baseCRS: string;
  private transformationCoefficients: number[];
  private arrayID: string;
  private namespace: string;
  private nativeZoom: number;
  private renderTarget: RenderTargetTexture;

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
    this.renderTarget = geometryOptions.renderTarget;

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

  public pickGeometry(pickedMesh: AbstractMesh, x: number, y: number) {
    const buffer = new Uint32Array(4);
    const gl = this.scene.getEngine()._gl;

    this.renderTarget._bindFrameBuffer();
    gl.readPixels(
      x,
      this.renderTarget.getRenderHeight() - y,
      1,
      1,
      gl.RGBA_INTEGER,
      gl.UNSIGNED_INT,
      buffer
    );

    if (buffer[3] === 1) {
      const index =
        pickedMesh.name.split(',').map(x => Number.parseInt(x)) ?? [];
      this.workerPool.postMessage({
        type: RequestType.GEOMETRY_INFO,
        id: 'geometry_info',
        request: {
          id: new BigInt64Array(buffer.buffer)[0],
          index: index,
          tileSize: this.tileSize,
          arrayID: this.arrayID,
          namespace: this.namespace,
          idAttribute: this.metadata.idAttribute,
          geometryAttribute: this.metadata.geometryAttribute,
          imageCRS: this.baseCRS,
          geometryCRS: this.metadata.crs,
          geotransformCoefficients: this.transformationCoefficients
        } as GeometryInfoMessage
      } as DataRequest);
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
      status.tile = new GeometryTile(response, this.scene, this.renderTarget);
    }

    status.state = TileState.VISIBLE;
    this.tileStatus.set(tileIndex, status);
    this.updateLoadingStatus(true);
  }
}
