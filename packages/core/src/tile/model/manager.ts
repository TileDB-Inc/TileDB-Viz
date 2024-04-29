import { ArcRotateCamera, Scene } from '@babylonjs/core';
import { WorkerPool } from '../worker/tiledb.worker.pool';
import { Tile } from './tile';
import { Events } from '@tiledb-inc/viz-components';
import { getViewArea } from '../utils/helpers';
import { TileState } from '@tiledb-inc/viz-common';
import { FrameDetails } from '../../types';

export interface TileStatus<T> {
  tile?: T;
  nonce: number;
  state?: TileState;
  evict: boolean;
}

export abstract class Manager<T extends Tile<any>> {
  protected scene: Scene;
  protected workerPool: WorkerPool;
  protected tileSize: number;
  protected tileStatus: Map<string, TileStatus<T>>;
  protected baseWidth: number;
  protected baseHeight: number;
  protected nonce: number;

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
    this.nonce = 0;
  }

  /**
   * Calculate the visible tiles depending the camera position and zoom and unload non visible tiles
   * @param camera The main orthographic camera
   * @param zoom The logarithmic camera zoom level
   */
  public abstract loadTiles(
    camera: ArcRotateCamera,
    frameDetails: FrameDetails
  ): void;

  public abstract initializeGUIProperties(): void;

  /**
   * Unregister all event listeners from the scene or the GUI.
   */
  protected stopEventListeners(): void {
    /* Empty */
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

  protected getTileIndexRange(
    camera: ArcRotateCamera,
    zoomLevel: number
  ): number[] {
    const maxTileX =
      Math.ceil(this.baseWidth / (this.tileSize / 2 ** zoomLevel)) - 1;
    const maxTileY =
      Math.ceil(this.baseHeight / (this.tileSize / 2 ** zoomLevel)) - 1;

    // construct 2 consecutive points of the viewport
    const pointTR = { x: camera?.orthoRight ?? 0, z: camera?.orthoTop ?? 0 };
    const pointBR = { x: camera?.orthoRight ?? 0, z: camera?.orthoBottom ?? 0 };
    const center = { x: camera.target.x, z: -camera.target.z };

    const [bottom, top, left, right] = getViewArea(
      pointTR,
      pointBR,
      center,
      camera.beta,
      camera.alpha
    );

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
