import {
  AssetEntry,
  AssetType,
  GeometryAssetOptions
} from '@tiledb-inc/viz-common';
import {
  AssetFactoryContext,
  AssetFactoryResult,
  registerAssetFactory
} from './assetFactory';
import { tileDBUriParser } from '../../utils/metadata-utils';
import { GeometryManager } from '../model/geometry/geometryManager';

registerAssetFactory(
  AssetType.GEOMETRY,
  async (
    entry: AssetEntry,
    ctx: AssetFactoryContext
  ): Promise<AssetFactoryResult> => {
    const opts = entry.options as GeometryAssetOptions;
    const { workspace, teamspace, id } = tileDBUriParser(
      opts.uri,
      ctx.workspace!,
      ctx.teamspace!
    );

    const metadata =
      await import('../../utils/metadata-utils/metadata-utils').then(x =>
        x.getGeometryMetadata(
          {
            token: ctx.token!,
            tiledbEnv: ctx.tiledbEnv,
            workspace,
            teamspace,
            // Determine if URI is array or group based on metadata
            // The metadata fetcher handles both cases
            geometryArrayID: id
          },
          opts
        )
      );

    ctx.sceneOptions.extents.encapsulateBoundingInfo(
      metadata.root.boundingInfo
    );

    return {
      manager: new GeometryManager(ctx.scene, ctx.workerPool, {
        arrayID: id,
        workspace: workspace,
        teamspace: teamspace,
        metadata: metadata,
        sceneOptions: ctx.sceneOptions
      }),
      pickable: metadata.idAttribute !== undefined,
      minimap: false
    };
  }
);
