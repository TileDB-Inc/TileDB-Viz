import { Camera, Scene } from '@babylonjs/core';
import { WorkerPool } from '../worker/tiledb.worker.pool';
import { Tile } from './tile';
import { Events } from '@tiledb-inc/viz-components';

export const enum TileState {
  LOADING,
  VISIBLE
}

export interface TileStatus<T> {
  tile?: T;
  state?: TileState;
  evict: boolean;
}

export interface UpdateOperation<T> {
  apply(source: T): void;
}

export abstract class Manager<T extends Tile<any>> {
  protected scene: Scene;
  protected workerPool: WorkerPool;
  protected tileSize: number;
  protected tileStatus: Map<string, TileStatus<T>>;
  protected baseWidth: number;
  protected baseHeight: number;

  constructor(
    scene: Scene,
    workerPool: WorkerPool,
    tileSize: number,
    baseWidth: number,
    baseHeight: number
  ) {
    this.scene = scene;
    this.workerPool = workerPool;
    this.tileSize = tileSize;
    this.baseWidth = baseWidth;
    this.baseHeight = baseHeight;

    this.tileStatus = new Map();
  }

  /**
   * Calculate the visible tiles depending the camera position and zoom and unload non visible tiles
   * @param camera The main orthographic camera
   * @param zoom The logarithmic camera zoom level
   */
  public abstract loadTiles(camera: Camera, zoom: number): void;

  public abstract setupEventListeners(): void;

  public abstract stopEventListeners(): void;

  /**
   * Update the already visible or currently loading tiles
   * @param options The update options
   */
  public updateTiles(operation: UpdateOperation<Manager<T>>): void {
    operation.apply(this);
  }

  /**
   * Dispose all BabylonJS resources
   */
  public dispose() {
    this.stopEventListeners();

    for (const [, status] of this.tileStatus) {
      status.tile?.dispose();
    }
  }

  protected getTileIndexRange(camera: Camera, zoomLevel: number): number[] {
    const maxTileX =
      Math.ceil(this.baseWidth / (this.tileSize / 2 ** zoomLevel)) - 1;
    const maxTileY =
      Math.ceil(this.baseHeight / (this.tileSize / 2 ** zoomLevel)) - 1;

    const top = camera.position.z + (camera?.orthoTop ?? 0);
    const bottom = camera.position.z + (camera?.orthoBottom ?? 0);
    const left = camera.position.x + (camera?.orthoLeft ?? 0);
    const right = camera.position.x + (camera?.orthoRight ?? 0);

    if (
      top < 0 ||
      bottom > this.baseHeight ||
      right < 0 ||
      left > this.baseWidth
    ) {
      return [-1, -1, -1, -1];
    }

    const maxYIndex = Math.max(
      0,
      Math.min(maxTileY, Math.floor(top / (this.tileSize / 2 ** zoomLevel)))
    );
    const minYIndex = Math.max(
      0,
      Math.min(maxTileY, Math.floor(bottom / (this.tileSize / 2 ** zoomLevel)))
    );
    const maxXIndex = Math.max(
      0,
      Math.min(maxTileX, Math.floor(right / (this.tileSize / 2 ** zoomLevel)))
    );
    const minXIndex = Math.max(
      0,
      Math.min(maxTileX, Math.floor(left / (this.tileSize / 2 ** zoomLevel)))
    );

    return [minXIndex, maxXIndex, minYIndex, maxYIndex];
  }

  protected updateLoadingStatus(loaded: boolean): void {
    window.dispatchEvent(
      new CustomEvent(Events.ENGINE_INFO_UPDATE, {
        bubbles: true,
        detail: {
          type: 'LOADING_TILE',
          loaded
        }
      })
    );
  }
}
