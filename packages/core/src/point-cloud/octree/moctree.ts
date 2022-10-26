import { BoundingBox, CopyTools, Ray, Vector3 } from '@babylonjs/core';
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

class HeapTree {
  order: number;
  size: number;
  data: number[];
  constructor(
    order: number,
    entrySize: number,
    levels: number,
    data: number[]
  ) {
    this.order = order;
    this.size = (entrySize * (Math.pow(order, levels) - 1)) / (order - 1);
    if (data.length !== this.size) {
      throw Error('wrong size buffer');
    }
    this.data = data;
  }
  public get(st: number, ed: number, data: number[], offset: number) {
    for (let i = st; i < ed; ++i) {
      data[offset + (i - st)] = this.data[i];
    }
  }
}

class Box3DSplitter {
  x_idx = 0;
  y_idx = 0;
  z_idx = 0;
  partsPerSide: number;
  xyz_sizes: Vector3;
  min: Vector3;
  box!: BoundingBox;
  private set_box() {
    this.box.minimum.set(
      this.min._x + this.x_idx * this.xyz_sizes._x,
      this.min._y + this.y_idx * this.xyz_sizes._y,
      this.min._z + this.z_idx * this.xyz_sizes._z
    );
    this.box.maximum.set(
      this.box.minimum._x + this.xyz_sizes._x,
      this.box.minimum._y + this.xyz_sizes._y,
      this.box.minimum._z + this.xyz_sizes._z
    );
  }
  constructor(_box: BoundingBox, partsPerSide: number) {
    this.partsPerSide = partsPerSide;
    this.xyz_sizes = _box.maximum.subtract(_box.minimum);
    this.min = _box.minimum.clone();
    this.set_box();
  }
  public next() {
    if (this.x_idx < this.partsPerSide - 1) {
      ++this.x_idx;
    } else if (this.y_idx < this.partsPerSide - 1) {
      this.x_idx = 0;
      ++this.y_idx;
    } else if (this.z_idx < this.partsPerSide - 1) {
      this.x_idx = 0;
      this.y_idx = 0;
      ++this.z_idx;
    } else {
      this.x_idx = 0;
      this.y_idx = 0;
      this.z_idx = 0;
    }
    this.set_box();
    return this.box;
  }
  public get_box() {
    return this.box;
  }
}

class HTCache {
  cache: number[];
  readOrder: number[][];
  front = 0;
  size = 0;
  HeapIdcsToRdOrder = new Map<number, number>();
  ht: HeapTree;
  partsPerSide: number;
  order: number;
  entrySize: number;
  levels: number;
  capacity: number;
  box: BoundingBox;
  heapSize: number;
  constructor(
    ht: HeapTree,
    partsPerSide: number,
    entrySize: number,
    levels: number,
    capacity: number,
    box: BoundingBox
  ) {
    this.ht = ht;
    this.partsPerSide = partsPerSide;
    this.order = Math.pow(partsPerSide, 3);
    this.entrySize = entrySize;
    this.levels = levels;
    this.capacity = capacity;
    this.box = box;
    this.heapSize =
      (entrySize * (Math.pow(this.order, levels) - 1)) / (this.order - 1);
    this.cache = new Array(entrySize * capacity);
    this.readOrder = new Array(capacity);
    for (let i = 0; i < capacity; ++i) {
      this.readOrder[i] = new Array(2);
    }
  }
  private swapRdOrder(i: number, j: number) {
    const tmp0 = this.readOrder[i][0];
    const tmp1 = this.readOrder[i][1];
    this.readOrder[i][0] = this.readOrder[j][0];
    this.readOrder[i][1] = this.readOrder[j][1];
    this.readOrder[j][0] = tmp0;
    this.readOrder[j][1] = tmp1;
  }
  private fetch(heapIdx: number, data: number[], offset: number) {
    this.ht.get(heapIdx, heapIdx + this.entrySize, data, offset);
  }
  private write_front(data: number[], offset: number) {
    for (let i = 0; i < this.entrySize; ++i) {
      data[offset + i] = this.cache[this.readOrder[this.front][1] + i];
    }
  }
  private get(heapIndex: number) {
    const rdOrderIdx = this.HeapIdcsToRdOrder.get(heapIndex);
    if (this.size < this.capacity) {
      if (rdOrderIdx) {
        this.front = rdOrderIdx;
        return;
      }
      this.fetch(heapIndex, this.cache, this.entrySize * this.size);
      this.readOrder[this.size][0] = heapIndex;
      this.readOrder[this.size][1] = this.entrySize * this.size;
      this.HeapIdcsToRdOrder.set(heapIndex, this.size);
      this.front = this.size;
      ++this.size;
      return;
    }
    this.front = (this.front + 1) % this.capacity;
    if (rdOrderIdx) {
      this.HeapIdcsToRdOrder.set(this.readOrder[this.front][0], rdOrderIdx);
      this.swapRdOrder(rdOrderIdx, this.front);
      this.HeapIdcsToRdOrder.set(heapIndex, this.front);
      return;
    }
    this.fetch(heapIndex, this.cache, this.readOrder[this.front][1]);
    this.HeapIdcsToRdOrder.delete(this.readOrder[this.front][0]);
    this.readOrder[this.front][0] = heapIndex;
    this.HeapIdcsToRdOrder.set(heapIndex, this.front);
  }
  public getBlocksForRay(ray: Ray) {
    const result: number[] = [];
    let level = 0;
    let heapIdx = 0;
    let resultSize = 0;

    this.get(heapIdx);
    this.write_front(result, resultSize);
    resultSize += this.entrySize;
    ++level;

    let bbox: BoundingBox;
    let splitter = new Box3DSplitter(this.box, 2);
    let nextHeapIdx = this.entrySize;
    let nextSplitter = splitter;
    const neighbors: number[] = [];
    const max_level_idx =
      (this.entrySize * (Math.pow(this.order, this.levels - 1) - 1)) /
      (this.order - 1);
    while (level < this.levels) {
      heapIdx = nextHeapIdx;
      splitter = nextSplitter;
      for (let i = 0; i < this.order; ++i) {
        bbox = splitter.get_box();
        if (ray.intersectsBox(bbox)) {
          this.get(heapIdx);
          this.write_front(result, resultSize);
          resultSize += this.entrySize;
          nextSplitter = new Box3DSplitter(bbox, 2);
          nextHeapIdx = this.entrySize + heapIdx * this.order;
          ++level;
          heapIdx += this.entrySize;
          splitter.next();
          continue;
        }
        neighbors.push(heapIdx);
        heapIdx += this.entrySize;
        splitter.next();
      }
    }
    while (neighbors.length > 0) {
      const top = neighbors.pop() as number;
      this.get(top);
      this.write_front(result, resultSize);
      resultSize += this.entrySize;
      if (top < max_level_idx) {
        let childIdx = this.entrySize + top * this.order;
        for (let i = 0; i < this.order; ++i) {
          neighbors.push(childIdx);
          childIdx += this.entrySize;
        }
      }
    }
    return result;
  }
}

export { Moctree, MoctreeBlock };
