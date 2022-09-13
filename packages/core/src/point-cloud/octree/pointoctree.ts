import {
  BoundingBox,
  IOctreeContainer,
  Octree,
  OctreeBlock,
  Scene,
  Vector3
} from '@babylonjs/core';
import { SparsePoint } from '../model';

let blockId = 0;

class PointOctree extends Octree<SparsePoint> {
  constructor(maxBlockCapacity: number, maxDepth: number) {
    super(PointOctreeBlock._CreationFuncForPoints, maxBlockCapacity, maxDepth);
  }

  /**
   * Updates the octree by adding blocks for the passed in points within the min and max world parameters
   * @param worldMin worldMin for the octree blocks
   * @param worldMax worldMax for the octree blocks
   * @param entries points to be added to the octree blocks
   */
  public override update(
    worldMin: Vector3,
    worldMax: Vector3,
    entries: SparsePoint[],
    lod?: number
  ): void {
    PointOctreeBlock._CreatePointBlocks(
      worldMin,
      worldMax,
      entries,
      (<any>this)._maxBlockCapacity,
      0,
      (<any>this).maxDepth,
      this,
      lod
    );
  }
}

class PointOctreeBlock extends OctreeBlock<SparsePoint> {
  lod = -1;
  loading = false;
  id = blockId++;

  /**
   * @param worldMin
   * @param worldMax
   * @param entries
   * @param maxBlockCapacity
   * @param currentDepth
   * @param maxDepth
   * @param target
   * @hidden
   */
  static _CreatePointBlocks(
    worldMin: Vector3,
    worldMax: Vector3,
    entries: SparsePoint[],
    maxBlockCapacity: number,
    currentDepth: number,
    maxDepth: number,
    target: IOctreeContainer<SparsePoint>,
    lod?: number
  ): void {
    target.blocks = [];
    const blockSize = new Vector3(
      (worldMax.x - worldMin.x) / 2,
      (worldMax.y - worldMin.y) / 2,
      (worldMax.z - worldMin.z) / 2
    );
    // Segmenting space
    for (let x = 0; x < 2; x++) {
      for (let y = 0; y < 2; y++) {
        for (let z = 0; z < 2; z++) {
          const localMin = worldMin.add(blockSize.multiplyByFloats(x, y, z));
          const localMax = worldMin.add(
            blockSize.multiplyByFloats(x + 1, y + 1, z + 1)
          );
          const block = new PointOctreeBlock(
            localMin,
            localMax,
            maxBlockCapacity,
            currentDepth + 1,
            maxDepth,
            PointOctreeBlock._CreationFuncForPoints
          );
          if (lod) {
            block.lod = lod;
          }
          block.addEntries(entries);
          target.blocks.push(block);
        }
      }
    }
  }

  static _CreationFuncForPoints(
    entry: SparsePoint,
    block: OctreeBlock<SparsePoint>
  ) {
    // check point is in block
    if (
      entry.x >= block.minPoint.x &&
      entry.x <= block.maxPoint.x &&
      entry.y >= block.minPoint.y &&
      entry.y <= block.maxPoint.y &&
      entry.z >= block.minPoint.z &&
      entry.z <= block.maxPoint.z
    ) {
      block.entries.push(entry);
    }
  }

  override createInnerBlocks(): void {
    PointOctreeBlock._CreatePointBlocks(
      (<any>this)._minPoint,
      (<any>this)._maxPoint,
      this.entries,
      (<any>this)._capacity,
      (<any>this)._depth,
      (<any>this)._maxDepth,
      this,
      this.lod
    );
    this.entries.splice(0);
  }

  public getActiveBlocks(scene: Scene, blocks: Array<PointOctreeBlock>) {
    if (
      BoundingBox.IsInFrustum((<any>this)._boundingVectors, scene.frustumPlanes)
    ) {
      if (!this.blocks) {
        // leaf node
        blocks.push(this);
      } else {
        this.blocks.forEach(block => {
          (block as PointOctreeBlock).getActiveBlocks(scene, blocks);
        });
      }
    }
  }
}

export { PointOctree, PointOctreeBlock };
