import { BoundingBox, Ray, Vector3 } from '@babylonjs/core';
import { SparseResult } from '../model';

// Morton encode from http://johnsietsma.com/2019/12/05/morton-order-introduction/ and https://fgiesen.wordpress.com/2009/12/13/decoding-morton-codes/
// If we need more octants that supported by 32 bit then we can combine octrees

// "Insert" two 0 bits after each of the 10 low bits of x
/* prettier-ignore */
function part1By2(x: number)
{
  x &= 0x000003ff;                  // x = ---- ---- ---- ---- ---- --98 7654 3210
  x = (x ^ (x << 16)) & 0xff0000ff; // x = ---- --98 ---- ---- ---- ---- 7654 3210
  x = (x ^ (x <<  8)) & 0x0300f00f; // x = ---- --98 ---- ---- 7654 ---- ---- 3210
  x = (x ^ (x <<  4)) & 0x030c30c3; // x = ---- --98 ---- 76-- --54 ---- 32-- --10
  x = (x ^ (x <<  2)) & 0x09249249; // x = ---- 9--8 --7- -6-- 5--4 --3- -2-- 1--0
  return x;
}

/* prettier-ignore */
function compact1By2(x: number)
{
  x &= 0x09249249;                  // x = ---- 9--8 --7- -6-- 5--4 --3- -2-- 1--0
  x = (x ^ (x >>  2)) & 0x030c30c3; // x = ---- --98 ---- 76-- --54 ---- 32-- --10
  x = (x ^ (x >>  4)) & 0x0300f00f; // x = ---- --98 ---- ---- 7654 ---- ---- 3210
  x = (x ^ (x >>  8)) & 0xff0000ff; // x = ---- --98 ---- ---- ---- ---- 7654 3210
  x = (x ^ (x >> 16)) & 0x000003ff; // x = ---- ---- ---- ---- ---- --98 7654 3210
  return x;
}

function encodeMorton(v: Vector3) {
  // add first bit on the left to represent offset after using well known methods above
  const code = (part1By2(v.z) << 2) + (part1By2(v.y) << 1) + part1By2(v.x);
  const l = code.toString(2).length;
  if (l % 3 > 0) {
    return (1 << (l + (3 - (l % 3)))) | code;
  } else {
    return (1 << l) | code;
  }
}

function decodeMorton(code: number) {
  // unset first bit on the left and then use well known methods above
  let mask = code;
  while (mask & (mask - 1)) {
    mask &= mask - 1;
  }
  code = code & ~mask;

  const x = compact1By2(code);
  const y = compact1By2(code >> 1);
  const z = compact1By2(code >> 2);
  return new Vector3(Number(x), Number(y), Number(z));
}

function getMortonRange(lod: number) {
  const m = 1 << (3 * lod);
  return {
    minMorton: m,
    maxMorton: m * 2 - 1
  };
}

class Moctree {
  blocks = new Map<number, MoctreeBlock>();
  bounds: BoundingBox;
  static startBlockIndex = 1;
  static indexes: Array<Vector3> = [
    new Vector3(0, 0, 0),
    new Vector3(1, 0, 0),
    new Vector3(0, 1, 0),
    new Vector3(1, 1, 0),
    new Vector3(0, 0, 1),
    new Vector3(1, 0, 1),
    new Vector3(0, 1, 1),
    new Vector3(1, 1, 1)
  ];

  constructor(
    private _minPoint: Vector3,
    private _maxPoint: Vector3,
    public maxDepth: number,
    public fanOut: number
  ) {
    // lod zero is stored with a code of 1
    this.blocks.set(
      Moctree.startBlockIndex,
      new MoctreeBlock(
        0,
        Moctree.startBlockIndex,
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
        const childBlockSize = this._maxPoint
          .subtract(this._minPoint)
          .scale(0.5);

        for (let l = 1; l <= lod; l++) {
          const candidates: Array<MoctreeBlock> = [];
          for (let i = 0; i < Moctree.indexes.length; i++) {
            const st = minVector.add(
              childBlockSize.multiply(Moctree.indexes[i])
            );
            const ed = st.add(childBlockSize);
            const v = (code << 3) + i;
            const block = this.blocks.get(v) || new MoctreeBlock(l, v, st, ed);

            if (ray.intersectsBoxMinMax(st, ed)) {
              // skip over empty regions
              if (block?.isEmpty) {
                continue;
              }

              candidates.push(block);
            }
          }

          // find nearest candidate to ray origin
          let resultBlock = candidates.pop();
          if (resultBlock !== undefined) {
            candidates.forEach(b => {
              if (
                ray.origin.subtract(b.minPoint).length() <
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                ray.origin.subtract(resultBlock!.minPoint).length()
              ) {
                resultBlock = b;
              }
            });
          }

          if (resultBlock === undefined) {
            break;
          } else {
            resultBlocks.push(resultBlock);
            minVector = resultBlock.minPoint;
            code = resultBlock.mortonNumber;
            childBlockSize.scaleInPlace(0.5);
          }
        }
      }
    }

    return resultBlocks.reverse();
  }

  public *getNeighbours(
    code: number
  ): Generator<MoctreeBlock, undefined, undefined> {
    let left = -1;
    let right = 1;
    const lod = (code.toString(2).length - 1) / 3;
    const bottomRange = getMortonRange(lod);

    // keep generating blocks to fill until the caller decides enough
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let currentCode = code;

      // loop the lods
      for (let l = lod; l > 0; l--) {
        const blockSize = this._maxPoint
          .subtract(this._minPoint)
          .scale(1 / Math.pow(2, l));

        const ranges = getMortonRange(l);
        // the caller will filter which blocks to render
        for (let i = 0; i < this.fanOut; i++) {
          const leftBlockCode = currentCode + left - i;

          if (leftBlockCode >= ranges.minMorton) {
            const relativeV1 = decodeMorton(leftBlockCode);
            const actualV1 = this._minPoint.add(relativeV1.multiply(blockSize));
            yield this.blocks.get(leftBlockCode) ||
              new MoctreeBlock(
                l,
                leftBlockCode,
                actualV1,
                actualV1.add(blockSize)
              );
          }

          const rightBlockCode = currentCode + right + i;
          if (rightBlockCode <= ranges.maxMorton) {
            const relativeV2 = decodeMorton(rightBlockCode);
            const actualV2 = this._minPoint.add(relativeV2.multiply(blockSize));
            yield this.blocks.get(rightBlockCode) ||
              new MoctreeBlock(
                l,
                rightBlockCode,
                actualV2,
                actualV2.add(blockSize)
              );
          }
        }
        // up a block level
        currentCode = currentCode >> 3;
      }

      left -= this.fanOut;
      right += this.fanOut;
      if (left <= bottomRange.minMorton && right >= bottomRange.maxMorton) {
        break;
      }
    }
    return;
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
    public mortonNumber: number,
    minPoint: Vector3,
    maxPoint: Vector3
  ) {
    this.minPoint = minPoint.clone();
    this.maxPoint = maxPoint.clone();
  }
}

export { Moctree, MoctreeBlock, encodeMorton, decodeMorton, getMortonRange };
