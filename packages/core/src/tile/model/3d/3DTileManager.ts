import { Mesh, Scene, ISceneLoaderAsyncResult } from '@babylonjs/core';
import { Manager } from '../manager';
import { GUIEvent } from '@tiledb-inc/viz-common';
import { Events, SliderProps } from '@tiledb-inc/viz-components';
import { TilePanelInitializationEvent } from '@tiledb-inc/viz-common';
import { TDB3DTileContent } from './3DTileContent';
import { TDB3DTileMetadata } from '../../types';
import { Tile } from '../tile';
import { SceneOptions } from '../../../types';
import { TDB3DTileFetcher } from './3DTileFetcher';

interface TileOptions {
  metadata: TDB3DTileMetadata;
  sceneOptions: SceneOptions;
}

export class TileManager extends Manager<Tile<string, TDB3DTileContent>> {
  private metadata: TDB3DTileMetadata;
  private sceneOptions: SceneOptions;
  private visibility: number;

  constructor(scene: Scene, tileOptions: TileOptions) {
    super(
      tileOptions.metadata.root,
      scene,
      new TDB3DTileFetcher(
        scene,
        tileOptions.metadata,
        tileOptions.sceneOptions
      )
    );

    this.metadata = tileOptions.metadata;
    this.sceneOptions = tileOptions.sceneOptions;
    this.visibility = 1;
    this.errorLimit = 15;

    this.registerEventListeners();
  }

  public get CRS(): string | undefined {
    return this.metadata.crs;
  }

  public registerEventListeners(): void {
    window.addEventListener(
      Events.SLIDER_CHANGE,
      this.sliderHandler.bind(this) as any,
      { capture: true }
    );
  }

  public removeEventListeners(): void {
    window.removeEventListener(
      Events.SLIDER_CHANGE,
      this.sliderHandler.bind(this) as any,
      { capture: true }
    );
  }

  public requestTile(tile: Tile<string, TDB3DTileContent>): Promise<any> {
    if (!tile.data) {
      tile.data = new TDB3DTileContent(this.scene, tile);
    }

    return this.fetcher.fetch(tile);
  }

  public cancelTile(tile: Tile<string, TDB3DTileContent>): void {
    //throw new Error('Method not implemented.');
  }

  public onLoaded(
    tile: Tile<string, TDB3DTileContent>,
    data: {
      assets?: ISceneLoaderAsyncResult;
      tiles?: Tile<string, TDB3DTileContent>;
    }[]
  ): void {
    for (const result of data) {
      if (result.tiles) {
        tile.children.push(...result.tiles.children);

        for (const child of tile.children) {
          child.parent = tile;
        }
      } else if (result.assets) {
        tile.data?.update({
          opacity: this.visibility,
          data: {
            meshes: result.assets.meshes as Mesh[],
            sourceCRS: this.metadata.crs,
            targetCRS: this.sceneOptions.crs,
            transformation: this.sceneOptions.transformation
          }
        });
      }
    }
  }

  public sliderHandler(event: CustomEvent<GUIEvent<SliderProps>>): void {
    const target = event.detail.target.split('_');

    if (target[0] !== this.metadata.id) {
      return;
    }

    switch (target[1]) {
      case 'opacity':
        this.visibility = event.detail.props.value ?? 1;
        for (const tile of this.tiles.values()) {
          tile.data?.update({ opacity: this.visibility });
        }
        break;
      case 'sseThreshold':
        this.errorLimit = event.detail.props.value ?? 15;
        break;
    }
  }

  public initializeGUIProperties(): void {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<TilePanelInitializationEvent>>(
        Events.INITIALIZE,
        {
          bubbles: true,
          detail: {
            target: 'tile-panel',
            props: {
              id: this.metadata.id,
              name: this.metadata.name,
              sourceCRS: {
                name: 'Source CRS',
                id: 'sourceCRS',
                entries: [
                  { value: 0, name: 'EPSG 4978' },
                  { value: 1, name: 'Native' }
                ],
                default: 0
              },
              sseThreshold: {
                name: 'SSE Threshold',
                id: 'sseThreshold',
                min: 1,
                max: 100,
                default: 15,
                step: 1
              },
              opacity: {
                name: 'Opacity',
                id: 'opacity',
                min: 0,
                max: 1,
                default: 1,
                step: 0.01
              }
            }
          }
        }
      )
    );
  }
}
