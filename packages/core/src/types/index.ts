import { Camera, Frustum } from '@babylonjs/core';
import { Tile, PriorityQueue } from '@tiledb-inc/viz-common';

export interface AssetMetadata {
  dataset_type: string;
}

export interface AssetEntry {
  namespace: string;
  name: string;
  arrayID?: string;
  groupID?: string;
}

export interface AssetOptions {
  token: string;
  tiledbEnv?: string;
  namespace: string;
  arrayID?: string;
  groupID?: string;
  geometryArrayID?: string;
  pointGroupID?: string;
  baseGroup?: string;
}

export interface Domain {
  name: string;
  type: string;
  min: number;
  max: number;
}

export interface Dimension {
  name: string;
  value: number;
  min: number;
  max: number;
}

// Experimental

export enum RefineStrategy {
  ADD = 1,
  REPLACE = 2
}

export enum TillingScheme {
  NONE = 0,
  QUADTREE = 1,
  OCTREE = 2
}

export enum TileState {
  LOADING = 1,
  VISIBLE = 2
}

export class Tileset<T extends Tile<T>> {
  public root: T;
  public state: Map<number, TileState>;

  private queue: PriorityQueue<T>;

  constructor(root: T) {
    this.root = root;
    this.state = new Map();
    this.queue = new PriorityQueue(400);
  }

  public getTiles(camera: Camera, threshold: number): T[] {
    const planes = Frustum.GetPlanes(camera.getTransformationMatrix());

    this.queue.reset();
    this.queue.insert(this.root.screenSpaceError(camera), this.root);

    const result: T[] = [];

    while (!this.queue.isEmpty()) {
      const { score: error, data: tile } = this.queue.extractMax();
      if (!tile) {
        break;
      }

      // Determine visibility
      if (!tile.boundingInfo.isInFrustum(planes)) {
        continue;
      }

      // If error below threshold skip loading child nodes
      if (error < threshold) {
        // If tile is already loading skip
        if (this.state.get(tile.id) === TileState.LOADING) {
          continue;
        }

        result.push(tile);
      } else {
        // If refine stategy is `ADD` add current node
        if (tile.refineStrategy === RefineStrategy.ADD) {
          // If tile is already loading skip
          if (this.state.get(tile.id) === TileState.LOADING) {
            continue;
          }

          result.push(tile);
        }

        for (const child of tile.children) {
          this.queue.insert(child.screenSpaceError(camera), child);
        }
      }
    }

    return result;
  }
}

export type FrameDetails = {
  zoom: number;
  level: number;
};
