import {
  BoundingInfo,
  ISceneLoaderAsyncResult,
  Scene,
  SceneLoader
} from '@babylonjs/core';
import { InfoResponse, TDB3DTileMetadata } from '../../types';
import { BaseFetcherOptions, Fetcher } from '../fetcher';
import { Tile } from '../tile';
import { TDB3DTileContent } from './3DTileContent';
import { SceneOptions } from '../../../types';
import { load3DTileset } from '../../../utils/metadata-utils/3DTiles/3DTileLoader';

export class TDB3DTileFetcher extends Fetcher<Tile<string, TDB3DTileContent>> {
  private scene: Scene;
  private metadata: TDB3DTileMetadata;
  private sceneOptions: SceneOptions;

  constructor(
    scene: Scene,
    metadata: TDB3DTileMetadata,
    sceneOptions: SceneOptions
  ) {
    super();

    this.scene = scene;
    this.metadata = metadata;
    this.sceneOptions = sceneOptions;
  }

  public fetch(
    tile: Tile<string, TDB3DTileContent>,
    options: BaseFetcherOptions
  ): Promise<
    {
      assets?: ISceneLoaderAsyncResult;
      tiles?: Tile<string, TDB3DTileContent>;
    }[]
  > {
    const assetPromises = [];

    for (const content of tile.content) {
      if (content.endsWith('.json')) {
        assetPromises.push(
          load3DTileset(`${this.metadata.baseUrl}${content}`, this.sceneOptions)
            .then(x => x.root)
            .then(x => {
              return { tiles: x };
            })
        );
      } else {
        assetPromises.push(
          SceneLoader.ImportMeshAsync(
            '',
            this.metadata.baseUrl,
            content,
            this.scene
          ).then(x => {
            return { assets: x };
          })
        );
      }
    }

    return Promise.all(assetPromises);
  }

  public fetchInfo(
    tile: Tile<string, TDB3DTileContent>,
    boundingInfo?: BoundingInfo,
    ids?: bigint[]
  ): Promise<InfoResponse> {
    throw new Error('Method not implemented.');
  }
}
