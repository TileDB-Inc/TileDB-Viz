import { BoundingInfo, Vector3 } from '@babylonjs/core';
import { TilesMetadata } from '@tiledb-inc/viz-common';
import {
  OGC3DTilesBoundingVolume,
  OGC3DTilesTile,
  OGC3DTilesTileset
} from '@tiledb-inc/viz-common/src/types/3DTiles/index';
import { RefineStrategy } from '../../../types';
import { TDB3DTile } from '../../../tile/model/3d/3DTile';
import proj4 from 'proj4';
import { Matrix, inv, matrix, multiply } from 'mathjs';

export async function load3DTileset(
  uri: string,
  options?: {
    sourceCRS?: string;
    targetCRS?: string;
    transformation?: number[];
  }
): Promise<TilesMetadata<TDB3DTile>> {
  const tileset = (await (await fetch(uri)).json()) as OGC3DTilesTileset;

  console.log(await fetch(uri));

  // Validate tileset
  if (tileset.asset.version !== '1.1') {
    return Promise.reject(
      `Unsupported 3D Tile version. Expected greater or equal to 1.1, found ${tileset.asset.version}`
    );
  }

  const metadata: TilesMetadata<TDB3DTile> = {
    name: uri.split('//')[1],
    root: extractBVH(tileset, options)[0],
    baseUrl: uri.substring(0, uri.lastIndexOf('/') + 1),
    features: [],
    categories: new Map(),
    attributes: []
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
    const corners = [
      center
        .subtract(halfX)
        .subtract(halfY)
        .subtract(halfZ)
        .asArray() as number[],
      center.subtract(halfX).subtract(halfY).add(halfZ).asArray() as number[],
      center.subtract(halfX).add(halfY).subtract(halfZ).asArray() as number[],
      center.subtract(halfX).add(halfY).add(halfZ).asArray() as number[],
      center.add(halfX).subtract(halfY).subtract(halfZ).asArray() as number[],
      center.add(halfX).subtract(halfY).add(halfZ).asArray() as number[],
      center.add(halfX).add(halfY).subtract(halfZ).asArray() as number[],
      center.add(halfX).add(halfY).add(halfZ).asArray() as number[]
    ];

    if (converter) {
      for (const [idx, corner] of corners.entries()) {
        corners[idx] = [...converter.forward(corner), 1];
      }
    }

    if (transformation) {
      for (const [idx, corner] of corners.entries()) {
        corners[idx] = multiply(transformation, corner).toArray() as number[];
      }
    }

    const minPoint = [
      Math.min(...corners.map(x => x[0])),
      Math.min(...corners.map(x => x[2])),
      Math.min(...corners.map(x => -x[1]))
    ];
    const maxPoint = [
      Math.max(...corners.map(x => x[0])),
      Math.max(...corners.map(x => x[2])),
      Math.max(...corners.map(x => -x[1]))
    ];

    return new BoundingInfo(
      Vector3.FromArray(minPoint.slice(0, 3)),
      Vector3.FromArray(maxPoint.slice(0, 3))
    );
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
  options?: {
    sourceCRS?: string;
    targetCRS?: string;
    transformation?: number[];
  }
): TDB3DTile[] {
  const pendingNodes: Array<{ parent?: TDB3DTile; data: OGC3DTilesTile }> = [
    { data: tileset.root }
  ];
  const tiles: TDB3DTile[] = [];

  const converter: proj4.Converter | undefined =
    options?.sourceCRS && options.targetCRS
      ? proj4(options.sourceCRS, options.targetCRS)
      : undefined;

  const transform: Matrix | undefined = options?.transformation
    ? inv(
        matrix([
          [options.transformation[1], 0, 0, options.transformation[0]],
          [0, options.transformation[5], 0, options.transformation[3]],
          [0, 0, options.transformation[1], 0],
          [0, 0, 0, 1]
        ])
      )
    : undefined;

  while (pendingNodes.length) {
    const { parent, data } = pendingNodes.pop()!;

    const tile = new TDB3DTile();

    tile.contents = data.content
      ? [data.content.uri]
      : (data.contents ?? []).map(x => x.uri);
    tile.boundingInfo = getBoundingInfo(
      data.boundingVolume,
      converter,
      transform
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

  return tiles;
}
