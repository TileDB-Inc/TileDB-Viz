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

  public getContainingBlocksByRay(ray: Ray, lod: number) {
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
            candidates.forEach(b => {
              if (
                ray.origin.subtract(b.minPoint).length() <
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                ray.origin.subtract(resultBlock!.minPoint).length()
              ) {
                resultBlock = b;
              }
            });

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
    const lod = (code.toString(2).length - 1) / 3;
    const positions = [];

    let totalBlocks = -lod; // remove the containing blocks from the result
    for (let l = 1; l <= lod; l++) {
      const rng = getMortonRange(l);
      totalBlocks += rng.maxMorton - rng.minMorton + 1;
      positions.push({ left: 1, right: 1 });
    }

    let blockCount = 0;

    // keep generating blocks to fill until the caller decides enough
    while (blockCount < totalBlocks) {
      let currentCode = code;
      // loop the lods
      for (let l = lod; l > 0; l--) {
        const blockSize = this.maxPoint
          .subtract(this.minPoint)
          .scale(1 / Math.pow(2, l));

        const ranges = getMortonRange(l);

        // display more blocks from higher resolution data and tail off
        const fanOut = Math.min(
          Math.ceil(this.fanOut / (this.maxDepth - l + 1)),
          ranges.maxMorton - ranges.minMorton // 1 missing block for centre
        );

        let leftBlockCode = currentCode - positions[l - 1].left;
        let rightBlockCode = currentCode + positions[l - 1].right;

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
                yield new MoctreeBlock(
                  l,
                  leftBlockCode,
                  actualV1,
                  actualV1.add(blockSize)
                );
              }
              blockCount++;
              leftBlockCode = currentCode - ++positions[l - 1].left;
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
                yield new MoctreeBlock(
                  l,
                  rightBlockCode,
                  actualV2,
                  actualV2.add(blockSize)
                );
              }
              blockCount++;
              rightBlockCode = currentCode + ++positions[l - 1].right;
            }
          }
        }
        // up a block level
        currentCode = currentCode >> 3;
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
    this.minPoint = minPoint.clone();
    this.maxPoint = maxPoint.clone();
    if (entries) {
      this.entries = entries;
    }

    this.boundingInfo = new BoundingInfo(this.minPoint, this.maxPoint);
  }
  public getRanges(): Array<number[]> {
    return new Array(1).fill([this.mortonNumber, this.mortonNumber]);
  }
}


class HeapTree {
  knownBlocks: Map<number, number>;
  public bounds: Array<Array<Vector3>>;
  static startBlockIndex = 0;
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
  static lods = [1, 9, 73, 585, 4681, 37449, 299593, 2396745];
  maxIdx: number;
  toTraverse: number[] = [];

  constructor(
    public minPoint: Vector3,
    public maxPoint: Vector3,
    public maxLevel: number,
    private fanOut: number // --- not used here
  ) {
    this.minPoint = minPoint.clone();
    this.maxPoint = maxPoint.clone();
    this.maxLevel = maxLevel;
    this.maxIdx = (Math.pow(8, maxLevel + 1) - 1) / 7 - 1;
    // console.log('htree cstr maxIdx: ', this.maxIdx);
    this.bounds = [];
    this.bounds.push([minPoint.clone(), maxPoint.clone()]);
    const queue = [0];
    while (queue.length) {
      const parent = queue.shift() as number;
      const [min, max] = this.bounds[parent];
      const childSize = max.subtract(min).scale(0.5);
      const child = parent * 8 + 1;
      if (child > this.maxIdx) {
        continue;
      }
      for (let i = 0; i < 8; ++i) {
        queue.push(child + i);
        const currMin = min.add(childSize.multiply(HeapTree.indexes[i]));
        const currMax = currMin.add(childSize);
        this.bounds.push([currMin, currMax]);
      }
    }
    this.knownBlocks = new Map<number, number>();
  }

  private lodFromIdx(heapIdx: number) {
    for (let i = 0; i < HeapTree.lods.length; ++i) {
      if (heapIdx < HeapTree.lods[i]) {
        return i;
      }
    }
    return HeapTree.lods.length;
  }

  public getContainingBlocksByRay(ray: Ray, lod: number): MoctreeBlock[] {
    let intersectingIdcs: MoctreeBlock[] = [];
    if (lod > 0) {
      if (ray.intersectsBoxMinMax(...this.bounds[HeapTree.startBlockIndex])) {
        if (lod > this.maxLevel) {
          lod = this.maxLevel;
        }
        intersectingIdcs = new Array(lod);
        let idcsIdx = 0;
        let curr = HeapTree.startBlockIndex;
        let level = 1;
        this.toTraverse = [];
        while (level <= lod) {
          const child = curr * 8 + 1;
          let resultChildIdx = -1;
          let minDist = Infinity;
          for (let i = 0; i < 8; ++i) {
            const [childMin, childMax] = this.bounds[child + i];
            if (ray.intersectsBoxMinMax(childMin, childMax)) {
              const currDist = ray.origin.subtract(childMin).length();
              if (currDist < minDist) {
                resultChildIdx = i;
                minDist = currDist;
              }
            }
          }
          curr = child + resultChildIdx;
          const [minP, maxP] = this.bounds[curr];
          intersectingIdcs[idcsIdx++] = new MoctreeBlock(level, curr, minP, maxP);
          for (let i = 0; i < 8; ++i) {
            if (i !== resultChildIdx) {
              this.toTraverse.push(child + i);
            }
          }
          ++level;
        }
      }
    }
    return intersectingIdcs;
  }

  public *getNeighbours(code: number): Generator<MoctreeBlock> {
    // if (code === 0) {
    //   this.getContainingBlocksByRay()
    // }
    let lastIdx = this.toTraverse.length - 1;
    while (this.toTraverse[lastIdx] * 8 + 1 > this.maxIdx && lastIdx >= 0) {
      // if (
      //   this.knownBlocks.has(leftBlockCode) ||
      //   this.knownBlocks.size === 0
      // ) {}
      const [minP, maxP] = this.bounds[this.toTraverse[lastIdx]];
      yield new MoctreeBlock(this.lodFromIdx(lastIdx), lastIdx--, minP, maxP);
    }
    for (let i = lastIdx; i >= 0; --i) {
      const currTraversal: number[] = [];
      currTraversal.push(this.toTraverse[i]);
      while (currTraversal.length) {
        const curr = currTraversal.pop() as number;
        // if (
      //   this.knownBlocks.has(leftBlockCode) ||
      //   this.knownBlocks.size === 0
      // ) {}
        const [minP, maxP] = this.bounds[curr];
        yield new MoctreeBlock(this.lodFromIdx(curr), curr, minP, maxP);
        const child = curr * 8 + 1;
        if (child <= this.maxIdx) {
          for (let i = 7; i >= 0; --i) {
            currTraversal.push(child + i);
          }
        }
      }
    }
  }
}


export { Moctree, MoctreeBlock, HeapTree, encodeMorton, decodeMorton, getMortonRange };
