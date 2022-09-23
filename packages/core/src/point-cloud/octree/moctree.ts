// TODO move this morton ordered octree into the core of babylonjs octree - https://forum.babylonjs.com/t/port-current-octree-to-morton-code/7897 and http://johnsietsma.com/2019/12/05/morton-order-introduction/
//       +------+------+
//       |\   2  \   6  \
//       | +------+------+
//       + |\      \      \
//       |\| +------+------+
//       | + |      |      |
//       +0|\|   3  |   7  |
//        \| +------+------+
//         + |      |      |
//    y     \|   1  |   5  |
//    |      +------+------+
//    +--x
//     \
//      z
//
//
//       +------+------+
//       |\   3  \   7  \
//       | +------+------+
//       + |\      \      \
//       |\| +------+------+
//       | + |      |      |
//       +1|\|   2  |   6  |
//        \| +------+------+
//         + |      |      |
//  z y     \|   0  |   4  |
//   \|      +------+------+
//    +--x

import { Vector3 } from '@babylonjs/core';
import { SparseResult } from '../model';

class Moctree {
  blocks: Record<number, Record<number, MoctreeBlock>> = {};

  constructor(
    private _minPoint: Vector3,
    private _maxPoint: Vector3,
    public maxDepth: number
  ) {
    for (let d = 0; d < this.maxDepth; d++) {
      this.blocks[d] = {};
    }
    this.blocks[0][0] = new MoctreeBlock(0, 0, this._minPoint, this._maxPoint);
  }

  public getCode(point: Vector3, lod: number) {
    // TODO we can use LUTs to speed this up if needed
    let code = 0;
    const childBlockSize = this._maxPoint
      .subtract(this._minPoint)
      .scale(1 / Math.pow(2, lod));
    const indexVector = point.subtract(this._minPoint).divide(childBlockSize);
    const x = Math.floor(indexVector.x);
    const y = Math.floor(indexVector.y);
    const z = Math.floor(indexVector.z);

    for (let i = 0; i < lod * 3; i++) {
      code |=
        ((x & (1 << i)) << (2 * i)) |
        ((y & (1 << i)) << (2 * i + 1)) |
        ((z & (1 << i)) << (2 * i + 2));
    }
    return { code, x, y, z, childBlockSize };
  }

  public getParentBlocks(point: Vector3, lod: number) {
    const resultBlocks: MoctreeBlock[] = [];
    for (let l = 1; l < lod; l++) {
      const c = this.getCode(point, l);

      const minBlockPoint = new Vector3(
        this._minPoint.x + c.x * c.childBlockSize.x,
        this._minPoint.y + c.y * c.childBlockSize.y,
        this._minPoint.z + c.z * c.childBlockSize.z
      );

      if (!this.blocks[l][c.code]) {
        this.blocks[l][c.code] = new MoctreeBlock(
          l,
          c.code,
          minBlockPoint,
          minBlockPoint.add(c.childBlockSize)
        );
      }
      resultBlocks.push(this.blocks[l][c.code]);
    }
    // order by highest resolution first
    return resultBlocks.reverse();
  }
}

class MoctreeBlock {
  private _boundingVectors = new Array<Vector3>();
  isLoading = false;
  minPoint: Vector3;
  maxPoint: Vector3;
  entries?: SparseResult;

  constructor(
    public lod: number,
    public mortonNumber: number,
    minPoint: Vector3,
    maxPoint: Vector3
  ) {
    this.minPoint = minPoint.clone();
    this.maxPoint = maxPoint.clone();
    this._boundingVectors.push(this.minPoint.clone());
    this._boundingVectors.push(this.maxPoint.clone());

    this._boundingVectors.push(this.minPoint.clone());
    this._boundingVectors[2].x = this.maxPoint.x;

    this._boundingVectors.push(this.minPoint.clone());
    this._boundingVectors[3].y = this.maxPoint.y;

    this._boundingVectors.push(this.minPoint.clone());
    this._boundingVectors[4].z = this.maxPoint.z;

    this._boundingVectors.push(this.maxPoint.clone());
    this._boundingVectors[5].z = this.minPoint.z;

    this._boundingVectors.push(this.maxPoint.clone());
    this._boundingVectors[6].x = this.minPoint.x;

    this._boundingVectors.push(this.maxPoint.clone());
    this._boundingVectors[7].y = this.minPoint.y;
  }
}

export { Moctree, MoctreeBlock };
