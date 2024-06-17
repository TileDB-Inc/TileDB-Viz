import { BoundingInfo, Vector3 } from '@babylonjs/core';
import {
  OGC3DTilesBoundingVolume,
  OGC3DTilesTile,
  OGC3DTilesTileset
} from '@tiledb-inc/viz-common/src/types/3DTiles/index';
import { RefineStrategy, SceneOptions } from '../../../types';
import proj4 from 'proj4';
import { Matrix } from 'mathjs';
import { TDB3DTileMetadata } from '../../../tile';
import { TDB3DTileContent } from '../../../tile/model/3d/3DTileContent';
import { Tile } from '../../../tile/model/tile';
import { _getTransformBoundingInfo } from '../utils';

export async function load3DTileset(
  uri: string,
  sceneOptions: SceneOptions
): Promise<TDB3DTileMetadata> {
  const tileset = (await (await fetch(uri)).json()) as OGC3DTilesTileset;

  // Validate tileset
  if (tileset.asset.version !== '1.1') {
    return Promise.reject(
      `Unsupported 3D Tile version. Expected greater or equal to 1.1, found ${tileset.asset.version}`
    );
  }

  // TODO: Determine tileset CRS
  const sourceCRS = '+proj=geocent +datum=WGS84 +units=m +no_defs +type=crs';

  const converter: proj4.Converter | undefined = sceneOptions.crs
    ? proj4(sourceCRS, sceneOptions.crs)
    : undefined;

  const metadata: TDB3DTileMetadata = {
    name: uri.split('//')[1],
    root: extractBVH(tileset, {
      converter: converter,
      transformation: sceneOptions.transformation
    }),
    baseUrl: uri.substring(0, uri.lastIndexOf('/') + 1),
    id: crypto.randomUUID(),
    crs: sourceCRS
  };

  return metadata;
}

function getBoundingInfo(
  boundingVolume: OGC3DTilesBoundingVolume,
  converter?: proj4.Converter,
  transformation?: Matrix
): BoundingInfo {
  if (boundingVolume.box) {
    const center = Vector3.FromArray(boundingVolume.box.slice(0, 3));
    const halfX = Vector3.FromArray(boundingVolume.box.slice(3, 6));
    const halfY = Vector3.FromArray(boundingVolume.box.slice(6, 9));
    const halfZ = Vector3.FromArray(boundingVolume.box.slice(9, 12));

    // Construct all 8 corners of the bounding box
    const box: [number, number, number, number][] = [
      [...center.subtract(halfX).subtract(halfY).subtract(halfZ).asArray(), 1],
      [...center.subtract(halfX).subtract(halfY).add(halfZ).asArray(), 1],
      [...center.subtract(halfX).add(halfY).subtract(halfZ).asArray(), 1],
      [...center.subtract(halfX).add(halfY).add(halfZ).asArray(), 1],
      [...center.add(halfX).subtract(halfY).subtract(halfZ).asArray(), 1],
      [...center.add(halfX).subtract(halfY).add(halfZ).asArray(), 1],
      [...center.add(halfX).add(halfY).subtract(halfZ).asArray(), 1],
      [...center.add(halfX).add(halfY).add(halfZ).asArray(), 1]
    ];

    return _getTransformBoundingInfo(box, converter, transformation);
  } else {
    return new BoundingInfo(Vector3.ZeroReadOnly, Vector3.ZeroReadOnly);
  }
}

function getErrorScaling(
  boundingVolume: OGC3DTilesBoundingVolume,
  boundingInfo: BoundingInfo
): number {
  if (boundingVolume.box) {
    const X = 2 * Vector3.FromArray(boundingVolume.box.slice(3, 6)).length();
    const Y = 2 * Vector3.FromArray(boundingVolume.box.slice(6, 9)).length();
    const Z = 2 * Vector3.FromArray(boundingVolume.box.slice(9, 12)).length();

    return Math.max(
      X / boundingInfo.boundingBox.extendSize.x,
      Y / boundingInfo.boundingBox.extendSize.y,
      Z / boundingInfo.boundingBox.extendSize.z
    );
  } else {
    return 1;
  }
}

export function extractBVH(
  tileset: OGC3DTilesTileset,
  options: {
    converter?: proj4.Converter;
    transformation?: Matrix;
  }
): Tile<string, TDB3DTileContent> {
  const pendingNodes: Array<{
    parent?: Tile<string, TDB3DTileContent>;
    data: OGC3DTilesTile;
  }> = [{ data: tileset.root }];
  const tiles: Tile<string, TDB3DTileContent>[] = [];

  while (pendingNodes.length) {
    const { parent, data } = pendingNodes.pop()!;

    const tile = new Tile<string, TDB3DTileContent>();

    tile.content = data.content
      ? [data.content.uri]
      : (data.contents ?? []).map(x => x.uri);
    tile.boundingInfo = getBoundingInfo(
      data.boundingVolume,
      options.converter,
      options.transformation
    );
    tile.refineStrategy = RefineStrategy[data.refine ?? 'ADD'];
    tile.geometricError =
      data.geometricError /
      getErrorScaling(data.boundingVolume, tile.boundingInfo);
    tile.parent = parent;

    parent?.children.push(tile);
    tiles.push(tile);

    for (const child of data.children ?? []) {
      pendingNodes.push({ parent: tile, data: child });
    }
  }

  return tiles[0];
}
