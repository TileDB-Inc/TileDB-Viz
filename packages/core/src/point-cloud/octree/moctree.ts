import { BoundingBox, Ray, Vector3 } from '@babylonjs/core';
import { SparseResult } from '../model';

// Morton encode from http://johnsietsma.com/2019/12/05/morton-order-introduction/ and https://fgiesen.wordpress.com/2009/12/13/decoding-morton-codes/

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

/* prettier-ignore */
function compact1By2(x: bigint)
{
    //                  x = ---1 --0- -9-- 8--7 --6- -5-- 4--3 --1- -0-- 9--8 --7- -6-- 5--4 --3- -2-- 1--0
    x &= 0b0001_0010_0100_1001_0010_0100_1001_0010_0100_1001_0010_0100_1001_0010_0100_1001n;

    //                  x = ---0 ---- 98-- --76 ---- 54-- --32 ---- 10-- --98 ---- 76-- --54 ---- 32-- --10
    x = (x ^ (x >> 2n)) & 0b0001_0000_1100_0011_0000_1100_0011_0000_1100_0011_0000_1100_0011_0000_1100_0011n;

    //                  x = ---0 ---- ---- 9876 ---- ---- 5432 ---- ---- 1098 ---- ---- 7654 ---- ---- 3210
    x = (x ^ (x >> 4n)) & 0b0001_0000_0000_1111_0000_0000_1111_0000_0000_1111_0000_0000_1111_0000_0000_1111n;

    //                  x = ---- ---0 9876 ---- ---- ---- ---- 5432 1098 ---- ---- ---- ---- 7654 3210
    x = (x ^ (x >> 8n)) & 0b0000_0001_1111_0000_0000_0000_0000_1111_1111_0000_0000_0000_0000_1111_1111n;

    //                  x = ---- ---0 9876 ---- ---- ---- ---- ---- ---- ---- ---- 5432 1098 7654 3210
    x = (x ^ (x >> 16n)) & 0b0000_0001_1111_0000_0000_0000_0000_0000_0000_0000_0000_1111_1111_1111_1111n;

    //                  x = ---- ---- ---- ---- ---- ---- ---- ---- ---- ---0 9876 5432 1098 7654 3210
    x = (x ^ (x >> 32n)) & 0b0000_0000_0000_0000_0000_0000_0000_0000_0000_0001_1111_1111_1111_1111_1111n;

    return x;
}

function encodeMorton(v: Vector3) {
  return (
    (part1By2(BigInt(v.z)) << 2n) +
    (part1By2(BigInt(v.y)) << 1n) +
    part1By2(BigInt(v.x))
  );
}

function decodeMorton(code: bigint) {
  const x = compact1By2(code);
  const y = compact1By2(code >> 1n);
  const z = compact1By2(code >> 2n);
  return new Vector3(Number(x), Number(y), Number(z));
}

class Moctree {
  blocks = new Map<string, MoctreeBlock>();
  bounds: BoundingBox;
  static startBlockIndex = 1n;
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
            const v = (code << 3n) + BigInt(i);
            const block =
              this.blocks.get(v.toString()) ||
              new MoctreeBlock(l, v.toString(), st, ed);

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
            code = BigInt(resultBlock.mortonNumber);
            childBlockSize.scaleInPlace(0.5);
          }
        }
      }
    }

    return resultBlocks.reverse();
  }

  public *getNeighbours(): Generator<MoctreeBlock, undefined, string> {
    let code = Moctree.startBlockIndex.toString();
    let newCode = code;
    let parentCode = BigInt(Moctree.startBlockIndex);
    let parentBlock: MoctreeBlock | undefined;
    let childBlockSize = Vector3.Zero();
    let index = 0;
    let doYield = true;

    let resultBlock = new MoctreeBlock(
      0,
      Moctree.startBlockIndex.toString(),
      this._minPoint,
      this._maxPoint
    );

    // keep generating blocks to fill until the caller decides enough
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (doYield) {
        newCode = yield resultBlock;
      }

      // reset as new block to work from
      if (doYield && (newCode || index === 8)) {
        if (newCode) {
          code = newCode;
          parentCode = BigInt(code) >> 3n;
        }

        if (index === 8) {
          if (parentCode === Moctree.startBlockIndex) {
            console.log('STOP');
            return;
          }
          parentCode = parentCode >> 3n;
          // now skipped block is always position zero
          code = (parentCode << 3n).toString();
        }

        index = 0;
        parentBlock = this.blocks.get(parentCode.toString());

        if (!parentBlock) {
          // find parentBlock of this specified code
          const offsets = decodeMorton(parentCode);
          const lod = (parentCode.toString(2).length - 1) / 3;
          const blockSize = this._maxPoint
            .subtract(this._minPoint)
            .scale(1 / Math.pow(lod, 2));
          const st = this._minPoint.add(blockSize.multiply(offsets));
          const ed = st.add(blockSize);
          parentBlock =
            this.blocks.get(parentCode.toString()) ||
            new MoctreeBlock(lod, parentCode.toString(), st, ed);

          childBlockSize = parentBlock.maxPoint
            .subtract(parentBlock.minPoint)
            .scale(0.5);
        }
      }

      if (index < 8 && parentBlock) {
        // get the surrounding blocks
        const childCode = BigInt(parentCode << 3n) + BigInt(index);
        if (childCode === BigInt(code)) {
          index++;
          // loop over again with next block
          doYield = false;
          continue;
        }

        doYield = true;

        if (!this.blocks.has(childCode.toString())) {
          const st = parentBlock.minPoint.add(
            Moctree.indexes[index].multiply(childBlockSize)
          );
          const ed = st.add(childBlockSize);
          resultBlock = new MoctreeBlock(
            parentBlock.lod + 1,
            childCode.toString(),
            st,
            ed
          );
        }

        // this syntax gives us test coverage for the above statement
        resultBlock = this.blocks.get(childCode.toString()) || resultBlock;

        index++;
      }
    }
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

export { Moctree, MoctreeBlock, encodeMorton, decodeMorton };
