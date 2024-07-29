import { Camera, Frustum } from '@babylonjs/core';
import { Tile } from './tile';
import { Block, PriorityQueue } from '../containers';

export type TraverserOptions = {
  errorLimit: number;
  frustumBias: number;
};

export class Traverser<T extends Tile<any>> {
  protected root: T;

  private queue: PriorityQueue<T>;

  constructor(root: T) {
    this.root = root;

    this.queue = new PriorityQueue(100);
  }

  public reset(camera: Camera): void {
    this.queue.reset();

    this.queue.insert(this.root.screenSpaceError(camera), this.root);
  }

  public *visibleNodes(
    camera: Camera,
    options: TraverserOptions
  ): Generator<T> {
    const frustrum = Frustum.GetPlanes(camera.getTransformationMatrix());

    for (const plane of frustrum) {
      plane.d += options.frustumBias;
    }

    while (!this.queue.isEmpty()) {
      const block: Block<T> = this.queue.extractMax();

      const [tile, error] = [block.data, block.score];

      // Check if data tile actually exists
      if (tile === undefined) {
        continue;
      }

      // Check if tile is within camera frustrum
      if (!tile.boundingInfo.isInFrustum(frustrum)) {
        continue;
      }

      if (error > options.errorLimit) {
        // Add the tiles children to the tile queue for processing
        for (const child of tile.children) {
          this.queue.insert(child.screenSpaceError(camera), child as T);
        }
      }

      yield tile;
    }
  }
}
