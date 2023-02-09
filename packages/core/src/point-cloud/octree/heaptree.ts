import { BoundingInfo, Ray, Vector3 } from '@babylonjs/core';
import { SparseResult } from '../model';
import ArrayMap from "./arraymap";
import FixedQueue from './fixedqueue';
import Octree from "./octree";

class HeapTree implements Octree<HTBlock> {
    knownBlocks: ArrayMap<number>;
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
    static lods = [1, 9, 73, 585, 4681, 37449, 299593, 2396745]; // should be computed statically
    maxIdx: number;
    toTraverse: number[] = [];
    private fanOutPerLevel: number[];
    private nbrCountPerLevel: number[];
    constructor(
      public minPoint: Vector3,
      public maxPoint: Vector3,
      public maxDepth: number,
      private fanOut: number
    ) {
      this.minPoint = minPoint.clone();
      this.maxPoint = maxPoint.clone();
      this.maxDepth = maxDepth;
      this.maxIdx = (Math.pow(8, maxDepth + 1) - 1) / 7 - 1;
      this.fanOut = fanOut;
      this.fanOutPerLevel = new Array(this.maxDepth + 1);
      for (let i = maxDepth; i > -1; --i) {
        this.fanOutPerLevel[i] = Math.ceil(this.fanOut / (this.maxDepth - i + 1));
      }
      this.nbrCountPerLevel = new Array(this.maxDepth + 1).fill(0);
      this.bounds = [];
      this.bounds.push([minPoint.clone(), maxPoint.clone()]);
      const queue = new FixedQueue<number>(this.maxIdx + 1);
      queue.push(0);
      while (queue.not_empty()) {
        const parent = queue.pop() as number;
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
      this.knownBlocks = new ArrayMap<number>(this.maxIdx + 1);
    }

    public static lodFromIdx(heapIdx: number) {
        for (let i = 0; i < HeapTree.lods.length; ++i) {
            if (heapIdx < HeapTree.lods[i]) {
            return i;
            }
        }
        return HeapTree.lods.length;
    }

    public getContainingBlocksByRay(ray: Ray, lod: number): HTBlock[] {
        const intersectingIdcs: HTBlock[] = [];
        if (lod > 0) {
          if (ray.intersectsBoxMinMax(...this.bounds[HeapTree.startBlockIndex])) {
            if (lod > this.maxDepth) {
              lod = this.maxDepth;
            }
            let curr = HeapTree.startBlockIndex;
            let level = 1;
            this.toTraverse = [];
            while (level <= lod) {
              const child = curr * 8 + 1;
              let resultChildIdx = -1;
              let minDist = Infinity;
              let resultHasPoints = false;
              for (let i = 0; i < 8; ++i) {
                const [childMin, childMax] = this.bounds[child + i];
                if (ray.intersectsBoxMinMax(childMin, childMax)) {
                  const currDist = ray.origin.subtract(childMin).length();
                  const currHasPoints = this.knownBlocks.has(child + i);
                  if ((currDist < minDist && (!resultHasPoints || currHasPoints)) || (!resultHasPoints && currHasPoints)) {
                    resultChildIdx = i;
                    minDist = currDist;
                    resultHasPoints = currHasPoints;
                  }
                }
              }
              curr = child + resultChildIdx;
              if (resultHasPoints) {
                const [minP, maxP] = this.bounds[curr];
                intersectingIdcs.push(new HTBlock(level, curr, minP, maxP));
              }
              let nbrRight = (resultChildIdx + 1) % 8;
              let nbrLeft = (resultChildIdx + 7) % 8;
              let count = 0;
              for (; count++ < 3; nbrRight = (nbrRight + 1) % 8, nbrLeft = (nbrLeft + 7) % 8) {
                this.toTraverse.push(child + nbrLeft); // push left first, so right first on unpacking - can choose either order
                this.toTraverse.push(child + nbrRight);
              }
              this.toTraverse.push(child + nbrRight); // same as leftNbr;
              ++level;
            }
          }
        }
        return intersectingIdcs.reverse();
      }

      public *getNeighbours(code: number): Generator<HTBlock, undefined, undefined> {
        if (this.toTraverse.length === 0) {
          return;
        }
        this.nbrCountPerLevel.fill(0);
        let lastIdx = this.toTraverse.length - 1;
        while (lastIdx > -1) { // traverse 7 at a time: 3 x 2 and 1;
          for (let i = 0; i < 3; ++i) {
            const currTraversalRight: number[] = [];
            const currTraversalLeft: number[] = [];
            currTraversalRight.push(this.toTraverse[lastIdx--]);
            currTraversalLeft.push(this.toTraverse[lastIdx--]);
            while (currTraversalRight.length) { // left and right should be same length
              const currRight = currTraversalRight.pop() as number;
              const currLeft = currTraversalLeft.pop() as number;
              const currLevel = HeapTree.lodFromIdx(currRight); // left and right should be same
              if (this.nbrCountPerLevel[currLevel] < this.fanOutPerLevel[currLevel]) {
                if (this.knownBlocks.has(currRight) || this.knownBlocks.size === 0) {
                  ++this.nbrCountPerLevel[currLevel];
                  const [minP, maxP] = this.bounds[currRight];
                  yield new HTBlock(currLevel, currRight, minP, maxP);
                }
              }
              const childRight = currRight * 8 + 1;
              const lessThenMaxIdx = childRight <= this.maxIdx; // if childRight <= maxIdx, then childLeft <= maxIdx;
              if (lessThenMaxIdx) {
                for (let i = 7; i >= 0; --i) {
                  currTraversalRight.push(childRight + i);
                }
              }
              if (this.nbrCountPerLevel[currLevel] < this.fanOutPerLevel[currLevel]) {
                if (this.knownBlocks.has(currLeft) || this.knownBlocks.size === 0) {
                  ++this.nbrCountPerLevel[currLevel];
                  const [minP, maxP] = this.bounds[currLeft];
                  yield new HTBlock(currLevel, currLeft, minP, maxP);
                }
              }
              if (lessThenMaxIdx) {
                const childLeft = currLeft * 8 + 1;
                for (let i = 7; i >= 0; --i) {
                  currTraversalLeft.push(childLeft + i);
                }
              }
            }
          }
          const currTraversal: number[] = [];
          currTraversal.push(this.toTraverse[lastIdx--]);
          while (currTraversal.length) { // left and right should be same length
            const curr = currTraversal.pop() as number;
            const currLevel = HeapTree.lodFromIdx(curr); // left and right should be same
            if (this.nbrCountPerLevel[currLevel] < this.fanOutPerLevel[currLevel]) {
              if (this.knownBlocks.has(curr) || this.knownBlocks.size === 0) {
                ++this.nbrCountPerLevel[currLevel];
                const [minP, maxP] = this.bounds[curr];
                yield new HTBlock(currLevel, curr, minP, maxP);
              }
            // }
            const child = curr * 8 + 1;
            if (child <= this.maxIdx) {
              for (let i = 7; i >= 0; --i) {
                currTraversal.push(child + i);
              }
            }
          }
        }
        return;
      }
    }
}

class HTBlock {
    pointCount = 0;
    minPoint: Vector3;
    maxPoint: Vector3;
    boundingInfo: BoundingInfo;
    entries?: SparseResult;
    constructor(
      public lod: number,
      public code: number,
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
}

export { HeapTree, HTBlock };
