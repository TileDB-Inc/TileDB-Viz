import { Ray, Vector3 } from '@babylonjs/core';
import {
  decodeMorton,
  encodeMorton,
  getMortonRange,
  Moctree,
  MoctreeBlock
} from './moctree';

describe('moctree tests', () => {
  // most tests use a unit cube but for those that don't we use these values
  const minPoint = new Vector3(-1, -1, -1);
  const maxPoint = new Vector3(1, 1, 1);

  test('morton ordering', () => {
    // a series of simple tests that check encode / decode and walk through the algorithm, start here to understand the moctree

    // this test assumes a unit cube, origin vector is included for clarity
    const blockSize1 = new Vector3(0.5, 0.5, 0.5);
    const blockSize2 = blockSize1.scale(0.5);
    const blockSize3 = blockSize2.scale(0.5);
    const lod1Range = getMortonRange(1);
    const lod2Range = getMortonRange(2);
    const lod3Range = getMortonRange(3);

    for (let i = 0; i < 8; i++) {
      const code1 = (1 << 3) + i; // offset from 1
      expect(code1).toBeGreaterThanOrEqual(lod1Range.minMorton);
      expect(code1).toBeLessThanOrEqual(lod1Range.maxMorton);

      // next two lines are obvious but test out vector3 and morton codes
      const actualPosition1 = Vector3.Zero().add(
        Moctree.indexes[i].multiply(blockSize1)
      );
      const relativeBlockPosition1 = actualPosition1
        .subtract(Vector3.Zero())
        .divide(blockSize1);

      expect(relativeBlockPosition1).toEqual(Moctree.indexes[i]);

      expect(decodeMorton(code1)).toEqual(relativeBlockPosition1);
      expect(relativeBlockPosition1.multiply(blockSize1)).toEqual(
        actualPosition1
      );
      expect(encodeMorton(relativeBlockPosition1, 1)).toEqual(code1);

      // go one level down for each octant
      for (let j = 0; j < 8; j++) {
        // next two lines are obvious but test out vector3 and morton codes
        const actualPosition2 = actualPosition1.add(
          Moctree.indexes[j].multiply(blockSize2)
        );
        const relativeBlockPosition2 = actualPosition2
          .subtract(actualPosition1)
          .divide(blockSize2);

        expect(relativeBlockPosition2).toEqual(Moctree.indexes[j]);

        const code2 = (code1 << 3) + j;
        expect(code2).toBeGreaterThanOrEqual(lod2Range.minMorton);
        expect(code2).toBeLessThanOrEqual(lod2Range.maxMorton);

        expect(decodeMorton(code2)).toEqual(
          actualPosition2.subtract(Vector3.Zero()).divide(blockSize2)
        );

        expect(
          encodeMorton(
            actualPosition2.subtract(Vector3.Zero()).divide(blockSize2),
            2
          )
        ).toEqual(code2);

        // go down one more level
        for (let k = 0; k < 8; k++) {
          // next two lines are obvious but test out vector3 and morton codes
          const actualPosition3 = actualPosition2.add(
            Moctree.indexes[k].multiply(blockSize3)
          );
          const relativeBlockPosition3 = actualPosition3
            .subtract(actualPosition2)
            .divide(blockSize3);

          expect(relativeBlockPosition3).toEqual(Moctree.indexes[k]);

          const code3 = (code2 << 3) + k;
          expect(code3).toBeGreaterThanOrEqual(lod3Range.minMorton);
          expect(code3).toBeLessThanOrEqual(lod3Range.maxMorton);
          expect(decodeMorton(code3)).toEqual(
            actualPosition3.subtract(Vector3.Zero()).divide(blockSize3)
          );
          expect(
            encodeMorton(
              actualPosition3.subtract(Vector3.Zero()).divide(blockSize3),
              3
            )
          ).toEqual(code3);
        }
      }
    }
  });

  test('multi-level moctree by ray', () => {
    const maxDepth = 2;
    const tree = new Moctree(minPoint, maxPoint, Vector3.Zero(), maxDepth, 1);

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
    const tree = new Moctree(minPoint, maxPoint, Vector3.Zero(), maxDepth, 1);

    const lod = 10;
    const ray = new Ray(minPoint, maxPoint.subtract(minPoint));
    expect(tree.getContainingBlocksByRay(ray, lod).length).toBe(lod);
  });

  test('empty blocks in moctree', () => {
    // instantiate blocks and then mark as empty to simulate an empty return from the server
    const maxDepth = 2;
    const tree = new Moctree(minPoint, maxPoint, Vector3.Zero(), maxDepth, 1);

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

    // set upper high resolution octant to not be empty and test
    lowerBlocks[0].entries = {
      X: [0],
      Y: [0],
      Z: [0],
      Red: [1],
      Green: [1],
      Blue: [1]
    };
    expect(lowerBlocks[0].isEmpty).toBe(false);

    // set upper high resolution octant to be empty and add to the cache
    lowerBlocks[0].entries = {
      X: [],
      Y: [],
      Z: [],
      Red: [],
      Green: [],
      Blue: []
    };
    expect(lowerBlocks[0].isEmpty).toEqual(true);
    tree.blocks.set(lowerBlocks[0].mortonNumber, lowerBlocks[0]);

    // check we have shifted a block away
    const lowerBlocks2 = tree.getContainingBlocksByRay(ray, lod);
    expect(lowerBlocks2.length).toBe(2);
    expect(lowerBlocks2[0].minPoint.x).toEqual(minPoint.add(blockSize).x);

    // empty all blocks
    for (let i = 0; i < Moctree.indexes.length; i++) {
      const code = (1 << 3) + i;
      const st = minPoint.add(Moctree.indexes[i].multiply(blockSize.scale(2)));

      const block = new MoctreeBlock(
        1,
        code,
        st,
        st.add(blockSize.scale(2)),
        Vector3.Zero(),
        {
          X: [],
          Y: [],
          Z: [],
          Red: [],
          Green: [],
          Blue: []
        }
      );
      expect(block.isEmpty).toEqual(true);
      tree.blocks.set(code, block);
    }

    expect(tree.getContainingBlocksByRay(ray, 1).length).toBe(0);
  });

  test('get neighbours', () => {
    const maxDepth = 3;
    // operate on a unit cube
    const tree = new Moctree(
      Vector3.Zero(),
      new Vector3(1, 1, 1),
      Vector3.Zero(),
      maxDepth,
      1
    );
    // relative position of the centre at lod 3 is 4 blocks away from the origin
    const centre = new Vector3(4, 4, 4);
    const centreCode = encodeMorton(centre, 3);
    // 8 blocks across
    const centreVector = decodeMorton(centreCode).scale(1 / 8);
    expect(centreVector).toEqual(new Vector3(0.5, 0.5, 0.5));

    const neighbours = tree.getNeighbours(centreCode);
    const firstBlock = neighbours.next().value;
    expect(firstBlock).toBeDefined();
    expect(firstBlock?.lod).toBe(3);
    expect(firstBlock?.mortonNumber).toBe(centreCode - 1);
    expect(firstBlock?.maxPoint.subtract(firstBlock.minPoint)).toEqual(
      new Vector3(1, 1, 1).scale(1 / 8)
    );
    // this block should be touching on one of the axis with the centre
    const firstBlockCoords = firstBlock?.minPoint
      .asArray()
      .concat(firstBlock?.maxPoint.asArray());
    expect(firstBlockCoords?.indexOf(0.5)).toBeGreaterThan(-1);

    const secondBlock = neighbours.next().value;
    expect(secondBlock).toBeDefined();
    expect(secondBlock?.lod).toBe(3);
    expect(secondBlock?.mortonNumber).toBe(centreCode + 1);
    expect(secondBlock?.maxPoint.subtract(secondBlock.minPoint)).toEqual(
      new Vector3(1, 1, 1).scale(1 / 8)
    );
    // this block should be touching on one of the axis with the centre
    const secondBlockCoords = secondBlock?.minPoint
      .asArray()
      .concat(secondBlock?.maxPoint.asArray());
    expect(secondBlockCoords?.indexOf(0.5)).toBeGreaterThan(-1);

    // with a fanout of 1 we should be at the next lod level up
    const thirdBlock = neighbours.next().value;
    expect(thirdBlock).toBeDefined();
    expect(thirdBlock?.lod).toBe(2);
    expect(thirdBlock?.mortonNumber).toBe((centreCode >> 3) - 1);
    expect(thirdBlock?.maxPoint.subtract(thirdBlock.minPoint)).toEqual(
      new Vector3(1, 1, 1).scale(1 / 4)
    );

    // this block should be touching on one of the axis with the centre
    const thirdBlockCoords = thirdBlock?.minPoint
      .asArray()
      .concat(thirdBlock?.maxPoint.asArray());
    expect(thirdBlockCoords?.indexOf(0.5)).toBeGreaterThan(-1);

    // run generator and retrieve count of returned blocks
    const nItr = tree.getNeighbours(centreCode);

    // expect 8 + 64 + 512 - 3 = 581 results (-3 because of the centre for each of the levels)
    let c = 0;
    let block: MoctreeBlock | undefined;
    while ((block = nItr.next().value)) {
      expect(block).toBeDefined();
      c++;
    }
    expect(c).toBe(581);
    expect(nItr.next().value).toBeUndefined();

    // shift a level up and we will get less blocks
    // expect 8 + 64 - 2 = 70 results (-2 because of the centre for each of the levels)
    const nItr2 = tree.getNeighbours(centreCode >> 3);
    c = 0;
    while ((block = nItr2.next().value)) {
      expect(block).toBeDefined();
      c++;
    }
    expect(c).toBe(70);
    expect(nItr2.next().value).toBeUndefined();

    // shift a level up and we will get less blocks
    // expect 8 - 1 results (-1 because of the centre for each of the levels)
    const nItr3 = tree.getNeighbours(centreCode >> 6);
    c = 0;
    while ((block = nItr3.next().value)) {
      expect(block).toBeDefined();
      c++;
    }
    expect(c).toBe(7);
    expect(nItr3.next().value).toBeUndefined();
  });

  test('get neighbours with fan out larger than one', () => {
    const maxDepth = 3;
    const fanOut = 5;
    // operate on a unit cube
    const tree = new Moctree(
      Vector3.Zero(),
      new Vector3(1, 1, 1),
      Vector3.Zero(),
      maxDepth,
      fanOut
    );
    // relative position of the centre at lod 3 is 4 blocks away from the origin
    const centre = new Vector3(4, 4, 4);
    const centreCode = encodeMorton(centre, 3);

    // run generator and retrieve count of returned blocks
    const nItr = tree.getNeighbours(centreCode);

    // expect 8 + 64 + 512 - 3 = 581 results (-3 because of the centre for each of the levels)
    let c = 0;
    let block: MoctreeBlock | undefined;
    while ((block = nItr.next().value)) {
      expect(block).toBeDefined();
      c++;
    }
    expect(c).toBe(581);
    expect(nItr.next().value).toBeUndefined();

    // shift a level up and we will get less blocks
    // expect 8 + 64 - 2 = 70 results (-2 because of the centre for each of the levels)
    const nItr2 = tree.getNeighbours(centreCode >> 3);
    c = 0;
    while ((block = nItr2.next().value)) {
      expect(block).toBeDefined();
      c++;
    }
    expect(c).toBe(70);
    expect(nItr2.next().value).toBeUndefined();

    // shift a level up and we will get less blocks
    // expect 8 - 1 results (-1 because of the centre for each of the levels)
    const nItr3 = tree.getNeighbours(centreCode >> 6);
    c = 0;
    while ((block = nItr3.next().value)) {
      expect(block).toBeDefined();
      c++;
    }
    expect(c).toBe(7);
    expect(nItr3.next().value).toBeUndefined();
  });

  test('load block metadata', () => {
    // known data, block 1-1-1-1 (D-X-Y-Z) is missing
    // map has a depth of one
    const blockData = {
      '0-0-0-0': 1,
      '1-0-0-0': 2,
      '1-1-0-0': 3,
      '1-0-1-0': 4,
      '1-1-1-0': 5,
      '1-0-0-1': 6,
      '1-1-0-1': 7,
      '1-0-1-1': 8
      // '1-1-1-1': 0
    };

    // unit cube
    const octree = new Moctree(
      Vector3.Zero(),
      new Vector3(1, 1, 1),
      Vector3.Zero(),
      1,
      1
    );
    const blockMap = new Map<string, number>(Object.entries(blockData));

    blockMap.forEach((v, k) => {
      const parts = k.split('-').map(Number);
      // swap z and y
      const morton = encodeMorton(
        new Vector3(parts[1], parts[3], parts[2]),
        parts[0]
      );
      octree.knownBlocks.set(morton, v);
    });

    expect(octree.knownBlocks.has(15)).toBe(false);

    // test get neighbours block count
    const nItr = octree.getNeighbours(1 << 3);
    let block: MoctreeBlock | undefined;
    let c = 0;
    while ((block = nItr.next().value)) {
      expect(block).toBeDefined();
      c++;
    }
    // minus one empty block and the origin block used (1 << 3)
    expect(c).toBe(6);
  });
});
