import { Camera, Scene, UniformBuffer } from '@babylonjs/core';
import { Events } from '@tiledb-inc/viz-components';
import { FrameDetails, RefineStrategy } from '../../types';
import { Traverser } from './traverser';
import { Tile, TileState } from './tile';
import { Fetcher } from './fetcher';

export interface TileStatus<T> {
  tile?: T;
  nonce: number;
  state?: TileState;
  evict: boolean;
}

export abstract class Manager<T extends Tile<any>> {
  public readonly id: string;
  public tiles: Map<number, T>;
  public fetcher: Fetcher<T, any>;

  protected scene: Scene;
  protected errorLimit: number;
  protected frameOptions: UniformBuffer;
  protected nonce: Map<number, number>;

  private rejectHandlers: Map<number, (reason: any) => void>;
  private traverser: Traverser<T>;

  constructor(root: T, scene: Scene, fetcher: Fetcher<T, any>) {
    this.scene = scene;

    this.tiles = new Map();
    this.errorLimit = -1;
    this.rejectHandlers = new Map();
    this.traverser = new Traverser(root);
    this.nonce = new Map();
    this.fetcher = fetcher;
    this.id = crypto.randomUUID();

    this.frameOptions = new UniformBuffer(this.scene.getEngine());
    this.frameOptions.addUniform('zoom', 1);
  }

  public loadTiles(cameras: Camera[], frameDetails: FrameDetails): void {
    // Update uniform buffer
    this.frameOptions.updateFloat('zoom', frameDetails.zoom);
    this.frameOptions.update();

    for (const camera of cameras) {
      // Mark tile as `PENDING_DELETE` for the current camera and remove mask
      for (const tile of this.tiles.values()) {
        tile.state = tile.state | TileState.PENDING_DELETE;
        tile.mask = tile.mask & ~camera.layerMask;
      }

      // Reset the traverser state
      this.traverser.reset(camera);

      for (const tile of this.traverser.visibleNodes(camera, this.errorLimit)) {
        // Add the current tile to the list of visible tiles
        this.tiles.set(tile.id, tile);

        // Remove the `PENDING_DELETE` flag and mark tile as `PENDING_LOAD` since it is inside the camera frustrum
        tile.state =
          (tile.state | TileState.PENDING_LOAD) & ~TileState.PENDING_DELETE;
        tile.mask = tile.mask | camera.layerMask;

        if (tile.state & TileState.VISIBLE) {
          // Remove load flag from self since already visible
          tile.state = tile.state & ~TileState.PENDING_LOAD;

          // If refine stategy of parent is `REPLACE` mark parent as `PENDING_DELETE`
          // since child tile is already visible
          let parent = tile.parent;
          while (parent && parent.refineStrategy === RefineStrategy.REPLACE) {
            parent.state =
              (parent.state | TileState.PENDING_DELETE) &
              ~TileState.PENDING_LOAD;
            parent.mask = parent.mask & ~camera.layerMask;

            parent = parent.parent;
          }
        } else if (tile.state & TileState.LOADING) {
          // Remove load flag from self since already loading
          tile.state = tile.state & ~TileState.PENDING_LOAD;
        }
      }

      for (const tile of this.tiles.values()) {
        if (tile.state & (TileState.PENDING_LOAD | TileState.LOADING)) {
          // To avoid holes while rendering tileset with `REPLACE` refinement strategy a parent
          // tile is not deleted until all the child nodes are visible
          let parent = tile.parent;
          while (parent && parent.refineStrategy === RefineStrategy.REPLACE) {
            if (parent.state & TileState.VISIBLE) {
              parent.state = parent.state & ~TileState.PENDING_DELETE;
              parent.mask = parent.mask | camera.layerMask;
              break;
            }

            parent = parent.parent;
          }
        }
      }
    }

    for (const key of this.tiles.keys()) {
      const tile = this.tiles.get(key)!;

      // Maks is empty so that means that it will be rendered by no camera
      // so it is safe to delete for sanity check we can also test the `PENDING_DELETE` flag
      if (tile.mask === 0) {
        // Delete tile from list of tiles
        // TODO: Investigate making the delete async and remove after deletion has been completed
        this.tiles.delete(key);

        // If tile is not visible cancel the request and update UI
        if (tile.state & TileState.VISIBLE) {
          this._removeTileInternal(tile);
        } else if (tile.state & TileState.LOADING) {
          this._cancelTileInternal(tile);
        }
      } else {
        // Load tile if it is pending load but is not currently loading or visible
        if (
          tile.state & TileState.PENDING_LOAD &&
          !(tile.state & (TileState.VISIBLE | TileState.LOADING))
        ) {
          this._requestTileInternal(tile)
            .then(x => this._onLoadedInternal(tile, x.repsonse, x.nonce))
            .catch(_ => {
              this._removeTileInternal(tile);
            });
        } else {
          // Clear pending load flag
          tile.state = tile.state & ~TileState.PENDING_LOAD;
          tile.data?.engineUpdate();
        }
      }
    }
  }

  public dispose() {
    for (const tile of this.tiles.values()) {
      tile.dispose();
    }
  }

  public abstract initializeGUIProperties(): void;

  public abstract registerEventListeners(): void;

  public abstract removeEventListeners(): void;

  public abstract requestTile(tile: T, nonce?: number): Promise<any>;

  public abstract cancelTile(tile: T, nonce?: number): void;

  public abstract onLoaded(tile: T, data: any): void;

  abstract get CRS(): string | undefined;

  private _removeTileInternal(tile: T): void {
    if (tile.state & TileState.PENDING_DELETE) {
      tile.state = TileState.HIDDEN;

      tile.dispose();
    }
  }

  private _onLoadedInternal(tile: T, response: any, nonce: number): void {
    if (
      this.nonce.get(tile.id) !== nonce ||
      !(tile.state & TileState.LOADING)
    ) {
      return;
    }

    this.onLoaded(tile, response);

    tile.state = TileState.VISIBLE;
    this.updateLoadingStatus(true);
  }

  private _cancelTileInternal(tile: T): void {
    this.updateLoadingStatus(true);

    this.cancelTile(tile, this.nonce.get(tile.id));
    this.rejectHandlers.get(tile.id)?.(`Cancelled by the user ${tile.id}`);
    this.updateLoadingStatus(true);
  }

  private _requestTileInternal(
    tile: T
  ): Promise<{ repsonse: any; nonce: number }> {
    tile.state = TileState.LOADING;
    this.updateLoadingStatus(false);

    const nonce = (this.nonce.get(tile.id) ?? 0) + 1;
    this.nonce.set(tile.id, nonce);

    const cancelation = new Promise<{ repsonse: any; nonce: number }>(
      (_, reject) => {
        this.rejectHandlers.set(tile.id, reject);
      }
    );

    return Promise.race([
      this.requestTile(tile, nonce).then(response => {
        return { repsonse: response, nonce: nonce };
      }),
      cancelation
    ]);
  }

  protected forceReloadTiles(): void {
    for (const tile of this.tiles.values()) {
      if (tile.state & TileState.LOADING) {
        this._cancelTileInternal(tile);
      }

      this._requestTileInternal(tile)
        .then(x => this._onLoadedInternal(tile, x.repsonse, x.nonce))
        .catch(_ => {
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
