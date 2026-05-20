import {
  AssetEntry,
  AssetType,
  TilesetAssetOptions
} from '@tiledb-inc/viz-common';
import {
  AssetFactoryContext,
  AssetFactoryResult,
  registerAssetFactory
} from './assetFactory';
import { TileManager } from '../model/3d/3DTileManager';
import { load3DTileset } from '../../utils/metadata-utils/3DTiles/3DTileLoader';

registerAssetFactory(
  AssetType.TILESET_3D,
  async (
    entry: AssetEntry,
    ctx: AssetFactoryContext
  ): Promise<AssetFactoryResult> => {
    if (!ctx.scene.getEngine().isWebGPU) {
      throw Error('3D Tiles overlay are only supported using WebGPU');
    }

    const opts = entry.options as TilesetAssetOptions;
    const tileset = await load3DTileset(opts.uri, ctx.sceneOptions);

    ctx.sceneOptions.extents.encapsulateBoundingInfo(
      tileset.root.boundingInfo
    );

    return {
      manager: new TileManager(ctx.scene, {
        metadata: tileset,
        sceneOptions: ctx.sceneOptions
      }),
      pickable: false,
      minimap: false
    }
  }
);
