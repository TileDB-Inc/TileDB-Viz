import { Vector3 } from '@babylonjs/core';
import { Moctree } from './moctree';

describe('moctree tests', () => {
  const size = 2;
  const minPoint = new Vector3(-1, -1, -1);
  const maxPoint = new Vector3(1, 1, 1);

  test('zero level moctree', () => {
    const maxDepth = 1;
    const tree = new Moctree(minPoint, maxPoint, maxDepth);
    const parentBlocksLod1 = tree.getContainingBlocks(new Vector3(0, 0, 0), 1);

    expect(tree.maxDepth).toBe(maxDepth);
    expect(tree.blocks.size).toBe(1); // level 0 is pre-loaded
    expect(tree.blocks.size).toBe(1); // no extra blocks cached

    expect(parentBlocksLod1.length).toBe(1); // no octree division as maxDepth is 1
    expect(parentBlocksLod1[0].minPoint.equals(minPoint));
    expect(parentBlocksLod1[0].minPoint.equals(maxPoint));
  });

  test('multi-level moctree', () => {
    const maxDepth = 2;
    const tree = new Moctree(minPoint, maxPoint, maxDepth);

    // http://johnsietsma.com/2019/12/05/morton-order-introduction/
    // note: adjusted indexes to match the ordering of the blocks in the code
    // node  | bits | index
    // -----:|:----:|:-----
    // 0,0,0 |  000 |    0
    // 1,0,0 |  100 |    1
    // 0,1,0 |  010 |    2
    // 1,1,0 |  110 |    3
    // 0,0,1 |  001 |    4
    // 1,0,1 |  101 |    5
    // 0,1,1 |  111 |    6
    // 1,1,1 |  111 |    7

    // test at lod 1, 8 blocks
    let lod = 1;
    let blockSize = maxPoint.subtract(minPoint).scale(1 / Math.pow(2, lod));

    // obvious result, but test vector3 implementation as octree depends on this
    expect(blockSize).toEqual(new Vector3(size / 2, size / 2, size / 2));

    const points = [
      new Vector3(0, 0, 0),
      new Vector3(1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(1, 1, 0),
      new Vector3(0, 0, 1),
      new Vector3(1, 0, 1),
      new Vector3(0, 1, 1),
      new Vector3(1, 1, 1)
    ];

    for (let i = 0; i < points.length; i++) {
      // pick a point in the centre of each block
      const p = minPoint.add(
        points[i]
          .multiply(blockSize)
          .add(blockSize.divide(new Vector3(2, 2, 2)))
      );
      const blocks = tree.getContainingBlocks(p, lod);
      expect(blocks[0].mortonNumber).toBe(i.toString());

      for (let b = 0; b < blocks.length; b++) {
        expect(blocks[b].lod).toBe(lod - b);
      }
    }

    const oppositePointLod1 = minPoint.add(points[7].multiply(blockSize));

    // test at lod 2, 64 blocks
    lod = 2;
    blockSize = maxPoint.subtract(minPoint).scale(1 / Math.pow(2, lod));

    // pick the start block (0, 0, 0) and test its decomposition, each child block should be its parent code (0) + i
    for (let i = 0; i < points.length; i++) {
      // pick a point in the centre of each block
      const p = minPoint.add(
        points[i]
          .multiply(blockSize)
          .add(blockSize.divide(new Vector3(2, 2, 2)))
      );

      const blocks = tree.getContainingBlocks(p, lod);

      expect(blocks[0].mortonNumber).toBe(i.toString());

      for (let b = 0; b < blocks.length; b++) {
        expect(blocks[b].lod).toBe(lod - b);
      }
    }

    // test at lod 2 the opposite block away from the origin each child block should be its parent code (7 << 3) + i
    const oppositeMortonNumber =
      parseInt(
        tree.getContainingBlocks(oppositePointLod1, 2)[0].mortonNumber
      ) >> 3;
    expect(oppositeMortonNumber).toBe(7);

    for (let i = 0; i < points.length; i++) {
      // pick a point in the centre of each block
      const p = oppositePointLod1.add(
        points[i]
          .multiply(blockSize)
          .add(blockSize.divide(new Vector3(2, 2, 2)))
      );

      expect(tree.getContainingBlocks(p, lod)[0].mortonNumber).toBe(
        ((7 << 3) + i).toString()
      );
    }

    // test at lod 3 - we should get lod 2 results as maxDepth is 2
    lod = 3;
    // block size remains at lod 2 to put the points in the correct regions
    for (let i = 0; i < points.length; i++) {
      // pick a point in the centre of each block
      const p = oppositePointLod1.add(
        points[i]
          .multiply(blockSize)
          .add(blockSize.divide(new Vector3(2, 2, 2)))
      );

      expect(tree.getContainingBlocks(p, lod)[0].mortonNumber).toBe(
        ((7 << 3) + i).toString()
      );
    }
  });
});
