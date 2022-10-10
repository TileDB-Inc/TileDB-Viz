import { Vector3 } from '@babylonjs/core';
import { SparseResult } from '../model';

// Morton encode from http://johnsietsma.com/2019/12/05/morton-order-introduction/

/* prettier-ignore */
function part1By2(x: bigint) {
  //                                                                     x = --10 9876 5432 1098 7654 3210
  x &=                                                                     0b0011_1111_1111_1111_1111_1111n;
  //                        x = ---- ---0 9876 ---- ---- ---- ---- ---- ---- ---- ---- 5432 1098 7654 3210
  x = (x ^ (x << 32n)) &      0b0000_0001_1111_0000_0000_0000_0000_0000_0000_0000_0000_1111_1111_1111_1111n;
  
  //                        x = ---- ---0 9876 ---- ---- ---- ---- 5432 1098 ---- ---- ---- ---- 7654 3210
  x = (x ^ (x << 16n)) &      0b0000_0001_1111_0000_0000_0000_0000_1111_1111_0000_0000_0000_0000_1111_1111n;  
  
  //                   x = ---0 ---- ---- 9876 ---- ---- 5432 ---- ---- 1098 ---- ---- 7654 ---- ---- 3210
  x = (x ^ (x << 8n)) &  0b0001_0000_0000_1111_0000_0000_1111_0000_0000_1111_0000_0000_1111_0000_0000_1111n;  
  
  //                   x = ---0 ---- 98-- --76 ---- 54-- --32 ---- 10-- --98 ---- 76-- --54 ---- 32-- --10
  x = (x ^ (x << 4n)) &  0b0001_0000_1100_0011_0000_1100_0011_0000_1100_0011_0000_1100_0011_0000_1100_0011n;  
  
  //                   x = ---1 --0- -9-- 8--7 --6- -5-- 4--3 --1- -0-- 9--8 --7- -6-- 5--4 --3- -2-- 1--0
  x = (x ^ (x << 2n)) &  0b0001_0010_0100_1001_0010_0100_1001_0010_0100_1001_0010_0100_1001_0010_0100_1001n;  
  return x;
}

function encodeMorton(v: Vector3) {
  return (
    (part1By2(BigInt(v.z)) << 2n) +
    (part1By2(BigInt(v.y)) << 1n) +
    part1By2(BigInt(v.x))
  );
}

class Moctree {
  blocks = new Map<string, MoctreeBlock>();
  static startBlockIndex = '-1';

  constructor(
    private _minPoint: Vector3,
    private _maxPoint: Vector3,
    public maxDepth: number
  ) {
    // lod zero is stored with a code of -1 as zero is the first block of an octree division
    this.blocks.set(
      Moctree.startBlockIndex,
      new MoctreeBlock(
        0,
        Moctree.startBlockIndex,
        this._minPoint,
        this._maxPoint
      )
    );
  }

  public getContainingBlocks(point: Vector3, lod: number) {
    const resultBlocks: MoctreeBlock[] = [];
    if (lod > 0) {
      if (lod > this.maxDepth) {
        lod = this.maxDepth;
      }

      let minVector = this._minPoint;
      let code = -1n;
      let childBlockSize = Vector3.Zero();

      for (let l = 1; l <= lod; l++) {
        childBlockSize = this._maxPoint
          .subtract(this._minPoint)
          .scale(1 / Math.pow(2, l));

        const indexVector = point.subtract(minVector).divide(childBlockSize);
        const x = Math.floor(indexVector.x);
        const y = Math.floor(indexVector.y);
        const z = Math.floor(indexVector.z);
        const v = new Vector3(x, y, z);

        if (code !== -1n) {
          code = (code << 3n) + encodeMorton(v);
        } else {
          code = encodeMorton(v);
        }

        minVector = minVector.add(v.multiply(childBlockSize));

        resultBlocks.push(
          this.blocks.get(code.toString()) ||
            new MoctreeBlock(
              l,
              code.toString(),
              minVector,
              minVector.add(childBlockSize)
            )
        );
      }
    }

    // high resolution returned first
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
    public mortonNumber: string,
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
