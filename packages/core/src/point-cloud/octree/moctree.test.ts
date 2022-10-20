import { Ray, Vector3 } from '@babylonjs/core';
import { decodeMorton, encodeMorton, Moctree, MoctreeBlock } from './moctree';

describe('moctree tests', () => {
  const minPoint = new Vector3(-1, -1, -1);
  const maxPoint = new Vector3(1, 1, 1);

  test('multi-level moctree by ray', () => {
    const maxDepth = 2;
    const tree = new Moctree(minPoint, maxPoint, maxDepth);

    // test at lod 1, a diagonal ray
    let lod = 1;
    let blockSize = maxPoint.subtract(minPoint).scale(1 / Math.pow(2, lod));
    const ray = new Ray(minPoint, maxPoint.subtract(minPoint));

    let blocks = tree.getContainingBlocksByRay(ray, lod);
    expect(blocks.length).toBe(1);
    // get block opposite as we pick the closest block
    expect(blocks[0].minPoint).toEqual(minPoint);
    expect(blocks[0].maxPoint).toEqual(minPoint.add(blockSize));
    expect(blocks[0].lod).toBe(1);

    // opposite block, reverse direction
    ray.origin = maxPoint;
    ray.direction = minPoint.subtract(maxPoint);
    blocks = tree.getContainingBlocksByRay(ray, lod);
    expect(blocks[0].minPoint).toEqual(minPoint.add(blockSize));
    expect(blocks[0].maxPoint).toEqual(maxPoint);
    expect(blocks.length).toBe(1);
    expect(blocks[0].lod === 1);

    // test at lod 2, a diagonal ray
    lod = 2;
    blockSize = maxPoint.subtract(minPoint).scale(1 / Math.pow(2, lod));
    ray.origin = minPoint;
    ray.direction = maxPoint.subtract(minPoint);
    blocks = tree.getContainingBlocksByRay(ray, lod);
    expect(blocks.length).toBe(2);
    expect(blocks[0].minPoint).toEqual(minPoint);
    expect(blocks[0].maxPoint).toEqual(minPoint.add(blockSize));
    expect(blocks[1].minPoint).toEqual(minPoint);
    expect(blocks[1].maxPoint).toEqual(minPoint.add(blockSize.scale(2)));

    ray.origin = maxPoint;
    ray.direction = minPoint.subtract(maxPoint);
    blocks = tree.getContainingBlocksByRay(ray, lod);
    expect(blocks.length).toBe(2);
    expect(blocks[0].minPoint).toEqual(maxPoint.subtract(blockSize));
    expect(blocks[0].maxPoint).toEqual(maxPoint);
    expect(blocks[1].minPoint).toEqual(maxPoint.subtract(blockSize.scale(2)));
    expect(blocks[1].maxPoint).toEqual(maxPoint);

    // test at lod 3 - we should get lod 2 results as maxDepth is 2
    lod = 3;
    ray.origin = minPoint;
    ray.direction = maxPoint.subtract(minPoint);
    blocks = tree.getContainingBlocksByRay(ray, lod);
    expect(blocks[0].minPoint).toEqual(minPoint);
    expect(blocks[0].maxPoint).toEqual(minPoint.add(blockSize));
    expect(blocks[1].minPoint).toEqual(minPoint);
    expect(blocks[1].maxPoint).toEqual(minPoint.add(blockSize.scale(2)));
  });

  test('deep multi-level moctree by ray', () => {
    const maxDepth = 10;
    const tree = new Moctree(minPoint, maxPoint, maxDepth);

    const lod = 10;
    const ray = new Ray(minPoint, maxPoint.subtract(minPoint));
    expect(tree.getContainingBlocksByRay(ray, lod).length).toBe(lod);
  });

  test('empty blocks in moctree', () => {
    // instantiate blocks and then mark as empty to simulate an empty return from the server
    const maxDepth = 2;
    const tree = new Moctree(minPoint, maxPoint, maxDepth);

    // test at lod 2, 64 blocks, a diagonal ray
    const lod = 2;
    const blockSize = maxPoint.subtract(minPoint).scale(1 / Math.pow(2, lod));
    const ray = new Ray(minPoint, maxPoint.subtract(minPoint));

    // test that we get the expected upper octant (furthest away from the ray)
    const lowerBlocks = tree.getContainingBlocksByRay(ray, lod);
    expect(lowerBlocks.length).toBe(2);
    expect(lowerBlocks[0].minPoint).toEqual(minPoint);
    expect(lowerBlocks[0].maxPoint).toEqual(minPoint.add(blockSize));
    expect(lowerBlocks[1].minPoint).toEqual(minPoint);
    expect(lowerBlocks[1].maxPoint).toEqual(minPoint.add(blockSize.scale(2)));

    // set upper high resolution octant to be empty and add to the cache
    lowerBlocks[0].isEmpty = true;
    tree.blocks.set(lowerBlocks[0].mortonNumber.toString(), lowerBlocks[0]);

    // check we have shifted a block away
    const lowerBlocks2 = tree.getContainingBlocksByRay(ray, lod);
    expect(lowerBlocks2.length).toBe(2);
    expect(lowerBlocks2[0].minPoint.x).toEqual(minPoint.add(blockSize).x);

    // empty all blocks
    for (let i = 0; i < Moctree.indexes.length; i++) {
      const code = (1n << 3n) + BigInt(i);
      const st = minPoint.add(Moctree.indexes[i].multiply(blockSize.scale(2)));

      const block = new MoctreeBlock(
        1,
        code.toString(),
        st,
        st.add(blockSize.scale(2))
      );
      block.isEmpty = true;
      tree.blocks.set(code.toString(), block);
    }

    const blocks = tree.getContainingBlocksByRay(ray, 1);
    blocks.forEach(block => {
      block.isEmpty = true;
      tree.blocks.set(block.mortonNumber, block);
    });
    expect(tree.getContainingBlocksByRay(ray, 1).length).toBe(0);
  });

  test('morton encoding', () => {
    const v = new Vector3(4, 4, 4);
    const morton = encodeMorton(v);
    const result = decodeMorton(morton);
    expect(v).toEqual(result);
  });

  test('simple get neighbours', () => {
    const maxDepth = 1;
    const tree = new Moctree(minPoint, maxPoint, maxDepth);
    const neighbours = tree.getNeighbours();
    // first yield is always the lod 0 block (by definition)
    const b = neighbours.next().value;
    expect(b).toBeDefined();
    if (b) {
      expect(b.lod).toBe(0);
      expect(b.minPoint).toEqual(minPoint);
      expect(b.maxPoint).toEqual(maxPoint);
      expect(b.mortonNumber).toBe('1');
    }

    // inject value into generator
    // expect 7 blocks
    const firstBlock = neighbours.next((1 << 3).toString()).value;
    expect(firstBlock?.lod).toBe(1);
    expect(firstBlock?.mortonNumber).toBe('9');

    for (let b = 2; b < 8; b++) {
      const anotherBlock = neighbours.next().value;
      expect(anotherBlock?.lod).toBe(1);
      // test that we don't match the reference block
      expect(anotherBlock?.mortonNumber).toBe((8 + b).toString());
    }

    // next call should give undefined
    expect(neighbours.next().value).toBeUndefined();
  });

  test('deeper get neighbours', () => {
    const maxDepth = 2;
    const tree = new Moctree(minPoint, maxPoint, maxDepth);
    const neighbours = tree.getNeighbours();
    // first yield is always the lod 0 block (by definition)
    const b = neighbours.next().value;
    expect(b).toBeDefined();
    if (b) {
      expect(b.lod).toBe(0);
      expect(b.minPoint).toEqual(minPoint);
      expect(b.maxPoint).toEqual(maxPoint);
      expect(b.mortonNumber).toBe('1');
    }

    // inject value into generator
    // expect 16 - 2 = 14 blocks
    const firstBlock = neighbours.next((1 << 6).toString()).value;
    expect(firstBlock?.lod).toBe(2);
    expect(firstBlock?.mortonNumber).toBe(((1 << 6) + 1).toString());

    for (let b = 2; b < 15; b++) {
      const anotherBlock = neighbours.next().value;
      if (b < 8) {
        // check
        expect(anotherBlock?.lod).toBe(2);
        expect(anotherBlock?.mortonNumber).toBe(((1 << 6) + b).toString());
      } else {
        expect(anotherBlock?.lod).toBe(1);
        expect(anotherBlock?.mortonNumber).toBe(
          ((1 << 3) + (b - 8) + 1).toString()
        );
      }
    }

    // next call should give undefined
    expect(neighbours.next().value).toBeUndefined();
  });
});
