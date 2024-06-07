import { Camera, Scene, UniformBuffer } from '@babylonjs/core';
import { WorkerPool } from '../worker/tiledb.worker.pool';
import { Events } from '@tiledb-inc/viz-components';
import { FrameDetails, RefineStrategy } from '../../types';
import { Traverser } from './traverser';
import { Tile, TileState } from './tile';

export interface TileStatus<T> {
  tile?: T;
  nonce: number;
  state?: TileState;
  evict: boolean;
}

export abstract class Manager<T extends Tile<any>> {
  protected scene: Scene;
  protected workerPool: WorkerPool;
  protected errorLimit: number;
  protected visibleTiles: Map<number, T>;
  protected frameOptions: UniformBuffer;

  private rejectHandlers: Map<number, Function>;
  private traverser: Traverser<T>;

  constructor(root: T, scene: Scene, workerPool: WorkerPool) {
    this.scene = scene;
    this.workerPool = workerPool;

    this.visibleTiles = new Map();
    this.errorLimit = -1;
    this.rejectHandlers = new Map();
    this.traverser = new Traverser(root);

    this.frameOptions = new UniformBuffer(this.scene.getEngine());
    this.frameOptions.addUniform('zoom', 1);
  }

  public loadTiles(camera: Camera, frameDetails: FrameDetails): void {
    // Mark all tiles as evictable to remove before the start of the next frame
    for (const [_, tile] of this.visibleTiles) {
      tile.state = tile.state | TileState.PENDING_DELETE;
    }

    // Update uniform buffer
    this.frameOptions.updateFloat('zoom', frameDetails.zoom);
    this.frameOptions.update();

    // Reset the traverser state
    this.traverser.reset(camera);

    for (const tile of this.traverser.visibleNodes(camera, this.errorLimit)) {
      // Add the current tile to the list of visible tiles
      this.visibleTiles.set(tile.id, tile);

      // Remove the `PENDING_DELETE` flag and mark tile as `PENDING_LOAD` since it is inside the camera frustrum
      tile.state =
        (tile.state | TileState.PENDING_LOAD) & ~TileState.PENDING_DELETE;

      if (tile.state & TileState.VISIBLE) {
        // Remove load flag from self since already visible
        tile.state = tile.state & ~TileState.PENDING_LOAD;

        // If refine stategy of parent is `REPLACE` mark parent as `PENDING_DELETE`
        // since child tile is already visible
        let parent = tile.parent;
        while (parent && parent.refineStrategy === RefineStrategy.REPLACE) {
          parent.state = parent.state | TileState.PENDING_DELETE;
          parent = parent.parent;
        }
      } else if (tile.state & TileState.LOADING) {
        // Remove load flag from self since already loading
        tile.state = tile.state & ~TileState.PENDING_LOAD;
      }
    }

    for (const tile of this.visibleTiles.values()) {
      if (tile.state & (TileState.PENDING_LOAD | TileState.LOADING)) {
        // To avoid holes while rendering tileset with `REPLACE` refinement strategy a parent
        // tile is not deleted until all the child nodes are visible
        let parent = tile.parent;
        while (parent && parent.refineStrategy === RefineStrategy.REPLACE) {
          if (parent.state & TileState.VISIBLE) {
            parent.state = parent.state & ~TileState.PENDING_DELETE;
            break;
          }

          parent = parent.parent;
        }
      }
    }

    for (const key of this.visibleTiles.keys()) {
      const tile = this.visibleTiles.get(key)!;

      // If tile is not marked skip
      if (tile.state & TileState.PENDING_DELETE) {
        // Delete tile from list of tiles
        // TODO: Investigate making the delete async and remove after deletion has been completed
        this.visibleTiles.delete(key);

        // If tile is not visible cancel the request and update UI
        if (tile.state & TileState.VISIBLE) {
          this._removeTileInternal(tile);
        } else if (tile.state & TileState.LOADING) {
          this._cancelTileInternal(tile);
        }
      }
      // Load tile if it is pending load but is not currently loading or visible
      else if (
        tile.state & TileState.PENDING_LOAD &&
        !(tile.state & (TileState.VISIBLE | TileState.LOADING))
      ) {
        this._requestTileInternal(tile)
          .then(x => this._onLoadedInternal(tile, x))
          .catch(_ => {
            console.log(_);
            this._removeTileInternal(tile);
          });
      } else {
        // Clear pending load flag
        tile.state = tile.state & ~TileState.PENDING_LOAD;
      }
    }
  }

  public dispose() {
    for (const tile of this.visibleTiles.values()) {
      tile.dispose();
    }
  }

  public abstract initializeGUIProperties(): void;

  public abstract registerEventListeners(): void;

  public abstract removeEventListeners(): void;

  public abstract requestTile(tile: T): Promise<any>;

  public abstract cancelTile(tile: T): void;

  public abstract onLoaded(tile: T, data: any): void;

  private _removeTileInternal(tile: T): void {
    tile.state = TileState.HIDDEN;

    tile.dispose();
  }

  private _onLoadedInternal(tile: T, data: any): void {
    this.onLoaded(tile, data);

    tile.state = TileState.VISIBLE;
  }

  private _cancelTileInternal(tile: T): void {
    tile.state = TileState.HIDDEN;

    this.cancelTile(tile);
    this.rejectHandlers.get(tile.id)?.(`Cancelled by the user ${tile.id}`);
    this.updateLoadingStatus(true);
  }

  private _requestTileInternal(tile: T): Promise<any> {
    tile.state = TileState.LOADING;

    const cancelation = new Promise((_, reject) => {
      this.rejectHandlers.set(tile.id, reject);
    });

    return Promise.race([this.requestTile(tile), cancelation]);
  }

  protected forceReloadTiles(): void {
    for (const tile of this.visibleTiles.values()) {
      if (tile.state & TileState.LOADING) {
        this._cancelTileInternal(tile);
      }

      this._requestTileInternal(tile)
        .then(x => this._onLoadedInternal(tile, x))
        .catch(_ => {
          console.log(_);
          this._removeTileInternal(tile);
        });
    }
  }

  private updateLoadingStatus(loaded: boolean): void {
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
