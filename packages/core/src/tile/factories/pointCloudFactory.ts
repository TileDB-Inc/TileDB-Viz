import {
  AssetEntry,
  AssetType,
  PointCloudAssetOptions
} from '@tiledb-inc/viz-common';
import {
  AssetFactoryContext,
  AssetFactoryResult,
  registerAssetFactory
} from './assetFactory';
import { tileDBUriParser } from '../../utils/metadata-utils';
import { PointManager } from '../model/point/pointManager';

registerAssetFactory(
  AssetType.POINT_CLOUD,
  async (
    entry: AssetEntry,
    ctx: AssetFactoryContext
  ): Promise<AssetFactoryResult> => {
    const opts = entry.options as PointCloudAssetOptions;
    const { workspace, teamspace, id } = tileDBUriParser(
      opts.uri,
      ctx.workspace!,
      ctx.teamspace!
    );

    const metadata =
      await import('../../utils/metadata-utils/pointcloud-metadata-utils').then(
        x =>
          x.getPointCloudMetadata(
            {
              token: ctx.token!,
              tiledbEnv: ctx.tiledbEnv,
              workspace,
              teamspace,
              // Determine if URI is array or group based on metadata
              // The metadata fetcher handles both cases
              pointGroupID: id
            },
            opts
          )
      );

    ctx.sceneOptions.extents.encapsulateBoundingInfo(
      metadata.root.boundingInfo
    );

    return {
      manager: new PointManager(ctx.scene, ctx.workerPool, {
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
