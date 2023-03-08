import { BoundingInfo, Ray, Vector3 } from '@babylonjs/core';
import { SparseResult } from '../model';

// Morton encode from http://johnsietsma.com/2019/12/05/morton-order-introduction/ and https://fgiesen.wordpress.com/2009/12/13/decoding-morton-codes/
// If we need more octants than supported by 32 bit then we can combine octrees

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

function encodeMorton(v: Vector3, depth: number) {
  // add first bit on the left to represent depth after using well known methods above
  const marker = 1 << (3 * depth);
  return marker | ((part1By2(v.z) << 2) + (part1By2(v.y) << 1) + part1By2(v.x));
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
  knownBlocks: Map<number, number>;
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
    public minPoint: Vector3,
    public maxPoint: Vector3,
    public maxDepth: number,
    public fanOut: number
  ) {
    this.knownBlocks = new Map<number, number>();
  }

  public getContainingBlocksByRay(ray: Ray, cameraHeight: number, lod: number) {
    // this only queries the front octant that the ray is looking at, it will however look past empty octants
    const resultBlocks: MoctreeBlock[] = [];

    if (lod > 0) {
      if (ray.intersectsBoxMinMax(this.minPoint, this.maxPoint)) {
        if (lod > this.maxDepth) {
          lod = this.maxDepth;
        }
        let minVector = this.minPoint;
        let code = Moctree.startBlockIndex;
        const childBlockSize = this.maxPoint.subtract(this.minPoint).scale(0.5);

        for (let l = 1; l <= lod; l++) {
          const candidates: Array<MoctreeBlock> = [];
          for (let i = 0; i < Moctree.indexes.length; i++) {
            const st = minVector.add(
              childBlockSize.multiply(Moctree.indexes[i])
            );
            const ed = st.add(childBlockSize);
            const v = (code << 3) + i;
            const block = new MoctreeBlock(l, v, st, ed);

            if (ray.intersectsBoxMinMax(st, ed)) {
              candidates.push(block);
            }
          }

          // find nearest candidate to ray origin
          let resultBlock = candidates.pop();
          if (resultBlock !== undefined) {
            let resultDistance = ray.origin.substract(resultBlock!.minPoint).length();
            candidates.forEach(b => {
              let currDistance = ray.origin.subtract(b.minPoint).length();
              if (
                currDistance <
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                resultDistance
              ) {
                resultBlock = b;
                resultDistance = currDistance;
              }
            });

            resultBlocks.push(resultBlock);
            minVector = resultBlock.minPoint;
            code = resultBlock.mortonNumber;
            childBlockSize.scaleInPlace(0.5);
            if (childBlockSize.x < cameraHeight / 4) {
              return resultBlocks.reverse();
            }
          }
        }
      }
    }
    return resultBlocks.reverse();
  }

  public *getNeighbours(
    code: number,
    cameraHeight: number
  ): Generator<MoctreeBlock, undefined, undefined> {
    const lod = (code.toString(2).length - 1) / 3;
    const positions = [];

    let totalBlocks = -lod; // remove the containing blocks from the result
    for (let l = 1; l <= lod; l++) {
      const rng = getMortonRange(l);
      totalBlocks += rng.maxMorton - rng.minMorton + 1;
      positions.push({ left: 1, right: 1 });
    }

    let blockCount = 0;
    const lods = [...Array(lod).keys()].reverse();

    // keep generating blocks to fill until the caller decides enough
    while (blockCount < totalBlocks) {
      // map the lods, from low to high, splice the lods that are complete
      for (let l = lods.length - 1; l >= 0; l--) {
        const currentLod = lods[l] + 1; // lods array is initialized from zero
        const currentCode = code >> (3 * (lod - currentLod));
        const blockSize = this.maxPoint
          .subtract(this.minPoint)
          .scale(1 / Math.pow(2, currentLod));

        if (blockSize.x < cameraHeight / 4) {
          return;
        }
        const ranges = getMortonRange(currentLod);

        // display more blocks from higher resolution data and tail off
        const fanOut = Math.min(
          Math.ceil(this.fanOut / (this.maxDepth - currentLod + 1)),
          ranges.maxMorton - ranges.minMorton // 1 missing block for centre
        );

        let leftBlockCode = currentCode - positions[currentLod - 1].left;
        let rightBlockCode = currentCode + positions[currentLod - 1].right;

        if (
          leftBlockCode >= ranges.minMorton ||
          rightBlockCode <= ranges.maxMorton
        ) {
          for (let i = 0; i < fanOut; i++) {
            if (leftBlockCode >= ranges.minMorton) {
              if (
                this.knownBlocks.has(leftBlockCode) ||
                this.knownBlocks.size === 0
              ) {
                const relativeV1 = decodeMorton(leftBlockCode);
                const actualV1 = this.minPoint.add(
                  relativeV1.multiply(blockSize)
                );
                if (actualV1.x < cameraHeight / 4) {
                  blockCount--;
                } else {
                  yield new MoctreeBlock(
                    currentLod,
                    leftBlockCode,
                    actualV1,
                    actualV1.add(blockSize)
                  );
                }
              }
              blockCount++;
              leftBlockCode = currentCode - ++positions[currentLod - 1].left;
            }

            if (rightBlockCode <= ranges.maxMorton) {
              if (
                this.knownBlocks.has(rightBlockCode) ||
                this.knownBlocks.size === 0
              ) {
                const relativeV2 = decodeMorton(rightBlockCode);
                const actualV2 = this.minPoint.add(
                  relativeV2.multiply(blockSize)
                );
                if (actualV2.x < cameraHeight / 4) {
                  blockCount--;
                } else {
                  yield new MoctreeBlock(
                    currentLod,
                    rightBlockCode,
                    actualV2,
                    actualV2.add(blockSize)
                  );
                }
              }
              blockCount++;
              rightBlockCode = currentCode + ++positions[currentLod - 1].right;
            }
          }
        } else {
          // all done for this lod
          lods.splice(l, 1);
        }
      }
    }
    return;
  }
}

class MoctreeBlock {
  minPoint: Vector3;
  maxPoint: Vector3;
  boundingInfo: BoundingInfo;
  pointCount = 0;
  entries?: SparseResult;

  constructor(
    public lod: number,
    public mortonNumber: number,
    minPoint: Vector3,
    maxPoint: Vector3,
    entries?: SparseResult
  ) {
    this.minPoint = minPoint;
    this.maxPoint = maxPoint;
    if (entries) {
      this.entries = entries;
    }

    this.boundingInfo = new BoundingInfo(this.minPoint, this.maxPoint);
  }
}

export { Moctree, MoctreeBlock, encodeMorton, decodeMorton, getMortonRange };
