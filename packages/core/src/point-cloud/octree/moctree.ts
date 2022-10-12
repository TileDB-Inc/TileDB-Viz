import { BoundingBox, Ray, Vector3 } from '@babylonjs/core';
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
  bounds: BoundingBox;
  static startBlockIndex = 1n;

  constructor(
    private _minPoint: Vector3,
    private _maxPoint: Vector3,
    public maxDepth: number
  ) {
    // lod zero is stored with a code of 1
    this.blocks.set(
      Moctree.startBlockIndex.toString(),
      new MoctreeBlock(
        0,
        Moctree.startBlockIndex.toString(),
        this._minPoint,
        this._maxPoint
      )
    );
    this.bounds = new BoundingBox(this._minPoint, this._maxPoint);
  }

  public getContainingBlocksByRay(ray: Ray, lod: number) {
    // this only queries the front octant that the ray is looking at, it will however look past empty octants
    const resultBlocks: MoctreeBlock[] = [];
    if (lod > 0) {
      if (ray.intersectsBoxMinMax(this._minPoint, this._maxPoint)) {
        if (lod > this.maxDepth) {
          lod = this.maxDepth;
        }
        let minVector = this._minPoint;
        let code = Moctree.startBlockIndex;
        let childBlockSize = Vector3.Zero();
        const indexes = [
          new Vector3(0, 0, 0),
          new Vector3(1, 0, 0),
          new Vector3(0, 1, 0),
          new Vector3(1, 1, 0),
          new Vector3(0, 0, 1),
          new Vector3(1, 0, 1),
          new Vector3(0, 1, 1),
          new Vector3(1, 1, 1)
        ];

        for (let l = 1; l <= lod; l++) {
          childBlockSize = this._maxPoint
            .subtract(this._minPoint)
            .scale(1 / Math.pow(2, l));

          for (let i = 0; i < indexes.length; i++) {
            const st = minVector.add(childBlockSize.multiply(indexes[i]));
            const ed = st.add(childBlockSize);
            if (ray.intersectsBoxMinMax(st, ed)) {
              const v = (code << 3n) + BigInt(i);
              const block = this.blocks.get(v.toString());
              if (block?.isEmpty) {
                continue;
              }

              resultBlocks.push(
                block || new MoctreeBlock(l, v.toString(), st, ed)
              );
              minVector = st;
              code = v;
              break;
            }
          }
        }
      }
    }
    return resultBlocks.reverse();
  }

  public getContainingBlocksByPoint(point: Vector3, lod: number) {
    const resultBlocks: MoctreeBlock[] = [];
    if (lod > 0) {
      if (this.bounds.intersectsPoint(point)) {
        if (lod > this.maxDepth) {
          lod = this.maxDepth;
        }
        let minVector = this._minPoint;
        let code = Moctree.startBlockIndex;
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

          code = (code << 3n) + encodeMorton(v);

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
    }
    // high resolution returned first
    return resultBlocks.reverse();
  }
}

class MoctreeBlock {
  isLoading = false;
  minPoint: Vector3;
  maxPoint: Vector3;
  isEmpty = false;
  entries?: SparseResult;

  constructor(
    public lod: number,
    public mortonNumber: string,
    minPoint: Vector3,
    maxPoint: Vector3
  ) {
    this.minPoint = minPoint.clone();
    this.maxPoint = maxPoint.clone();
  }
}

export { Moctree, MoctreeBlock };
