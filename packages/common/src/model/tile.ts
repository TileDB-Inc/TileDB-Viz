import { BoundingInfo, Camera, Vector3 } from '@babylonjs/core';

export enum RefineStrategy {
  /**
   * Maintain parent tile when rendering child tiles
   */
  ADD = 1,

  /**
   * Replace parent tile with child tiles when rendering.
   * Parent tile should unload once all requested child tiles have loaded to avoid holes.
   */
  REPLACE = 2
}

export enum TillingScheme {
  NONE = 0,
  QUADTREE = 1,
  OCTREE = 2
}

export enum TileState {
  LOADING = 1,
  VISIBLE = 2,
  DELETE = 3
}

export class Tile<T extends Tile<T>> {
  protected static tileCount = 0;

  public boundingInfo: BoundingInfo;
  public refineStrategy: RefineStrategy;
  public children: T[];
  public parent?: T;
  public readonly id: number = Tile.tileCount++;

  public tillingScheme: TillingScheme;
  public implicitTilling: boolean;

  public geometricError: number;

  constructor() {
    this.boundingInfo = new BoundingInfo(
      Vector3.ZeroReadOnly,
      Vector3.ZeroReadOnly
    );
    this.refineStrategy = RefineStrategy.ADD;
    this.children = [];
    this.parent = undefined;
    this.implicitTilling = false;
    this.tillingScheme = TillingScheme.NONE;
    this.geometricError = 0;
  }

  public screenSpaceError(camera: Camera): number {
    if (camera.mode === Camera.ORTHOGRAPHIC_CAMERA) {
      return (
        this.geometricError /
        (Math.max(
          camera.orthoTop! - camera.orthoBottom!,
          camera.orthoRight! - camera.orthoLeft!
        ) /
          Math.max(
            camera.getEngine().getRenderHeight(),
            camera.getEngine().getRenderWidth()
          ))
      );
    } else {
      return 0;
    }
  }
}

export class ImplicitTile<T extends Tile<T>> {
  public base: T;
  public index: number[];
  public level: number;

  constructor(base: T, level: number, index: number[]) {
    this.base = base;
    this.index = index;
    this.level = level;
  }

  public screenSpaceError(camera: Camera): number {
    return this.base.screenSpaceError(camera) / 2 ** this.level;
  }
}
