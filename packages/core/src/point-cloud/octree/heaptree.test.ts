/* eslint-disable prettier/prettier */
import { Ray, Vector3 } from '@babylonjs/core';
import { SparseResult } from '../model';
import {
  decodeMorton,
  encodeMorton,
  getMortonRange,
  Moctree,
  MoctreeBlock,
  HeapTree
} from './moctree';

describe('heaptree tests', () => {
    const minPoint = new Vector3(-1, -1, -1);
    const maxPoint = new Vector3(1, 1, 1);


    test('bounds for 2-level heaptree', () => {
      const maxLevel = 1; // idx based --> 2 levels: 9 blocks;
      const tree = new HeapTree(minPoint, maxPoint, maxLevel, 1);
      expect(tree.bounds[0][0]).toEqual(minPoint);
      expect(tree.bounds[0][1]).toEqual(maxPoint);
      const firstLevel1OctantMin = new Vector3(-1, -1, -1);
      const firstLevel1OctantMax = new Vector3(0, 0, 0);
      expect(tree.bounds[1][0]).toEqual(firstLevel1OctantMin);
      expect(tree.bounds[1][1]).toEqual(firstLevel1OctantMax);
      expect(tree.bounds.length).toBe(9);
    });

    test('htree lod from idx', () => {
      const maxLevel = 2;
      const tree = new HeapTree(minPoint, maxPoint, maxLevel, 1);
      const lodOfIdx4 = tree.lodFromIdx(4);
      expect(lodOfIdx4).toBe(1);
      const lodOfIdx15 = tree.lodFromIdx(15);
      expect(lodOfIdx15).toBe(2);
    });

    test('htree getContainingBlocks by ray - ordering', () => {
      const maxLevel = 2;
      const fanOut = 256;
      const tree = new HeapTree(minPoint, maxPoint, maxLevel, fanOut);
      const ray = new Ray(minPoint, maxPoint.subtract(minPoint));
      const intersectingBlocks = tree.getContainingBlocksByRay(ray, maxLevel);
      expect(intersectingBlocks.length).toBe(2); // lod 0 is skipped
      expect(intersectingBlocks[1].minPoint).toEqual(minPoint);
      expect(intersectingBlocks[1].maxPoint).toEqual(new Vector3(0, 0, 0));
      expect(intersectingBlocks[1].mortonNumber).toEqual(1);
      expect(intersectingBlocks[0].minPoint).toEqual(minPoint);
      expect(intersectingBlocks[0].maxPoint).toEqual(new Vector3(-0.5, -0.5, -0.5));
      expect(intersectingBlocks[0].mortonNumber).toEqual(9);
    });

    // test('htree getContainingBlocks by ray - fanOut in getContaining - toTraverse set-up', () => {
    //   const maxLevel = 2;
    //   const fanOut = 256;
    //   const tree = new HeapTree(minPoint, maxPoint, maxLevel, fanOut);
    //   const ray = new Ray(minPoint, maxPoint.subtract(minPoint));
    //   const _ = tree.getContainingBlocksByRay(ray, maxLevel);
    //   expect(tree.toTraverse.length).toBe(9); // 2 from level 1 fanOut; 7 from level 2
    //   expect(tree.toTraverse[0]).toBe(2);
    //   expect(tree.toTraverse[1]).toBe(8);
    //   expect(tree.toTraverse[2]).toBe(10);
    //   expect(tree.toTraverse[3]).toBe(16);
    // });

    test('htree getContainingBlocks by ray - fanOut in getNeighbours - toTraverse set-up', () => {
      const maxLevel = 2;
      const fanOut = 256;
      const tree = new HeapTree(minPoint, maxPoint, maxLevel, fanOut);
      const ray = new Ray(minPoint, maxPoint.subtract(minPoint));
      const _ = tree.getContainingBlocksByRay(ray, maxLevel);
      expect(tree.toTraverse.length).toBe(14); // 2 from level 1 fanOut; 7 from level 2
      expect(tree.toTraverse[0]).toBe(8);
      expect(tree.toTraverse[1]).toBe(2);
      expect(tree.toTraverse[2]).toBe(7);
      expect(tree.toTraverse[3]).toBe(3);
      expect(tree.toTraverse[7]).toBe(16);
      expect(tree.toTraverse[8]).toBe(10);
    });

    test('htree getNeighbours - fanOut', () => {
      const maxLevel = 4;
      const fanOut = 30;
      const tree = new HeapTree(minPoint, maxPoint, maxLevel, fanOut);
      const ray = new Ray(minPoint, maxPoint.subtract(minPoint));
      const _ = tree.getContainingBlocksByRay(ray, maxLevel);
      expect(tree.toTraverse.length).toBe(28); // 2 from level 1 fanOut; 7 from level 2
      const nbrsGen = tree.getNeighbours(1); // number not used in method
      let nxtNbr = nbrsGen.next();
      const nbrCountPerLevel = new Array(maxLevel + 1).fill(0);
      while (!nxtNbr.done) {
        const nbr = nxtNbr.value as MoctreeBlock;
        ++nbrCountPerLevel[nbr.lod];
        nxtNbr = nbrsGen.next();
      }
      for (let i = maxLevel; i > 0; --i) { // lvl 0 is not loaded here
        let lvlFanOut = Math.ceil(fanOut / (maxLevel - i + 1));
        if (i === 1) {
          lvlFanOut = 7; // max 7 nbrs at level 1;
        }
        expect(nbrCountPerLevel[i]).toBe(lvlFanOut);
      }



    });

    test('htree getNeighbours - ordering', () => {

    });

    // test('multi-level moctree by ray', () => {
        
    //     const maxDepth = 2;
    //     const tree = new HeapTree(minPoint, maxPoint, maxDepth, 1);

    //     // test at lod 1, a diagonal ray
    //     let lod = 1;
    //     let blockSize = maxPoint.subtract(minPoint).scale(1 / Math.pow(2, lod));
    //     const ray = new Ray(minPoint, maxPoint.subtract(minPoint));

    //     let blocks = tree.getContainingBlocksByRay(ray, lod);
    //     expect(blocks.length).toBe(1);
    //     // get block opposite as we pick the closest block
    //     expect(blocks[0].minPoint).toEqual(minPoint);
    //     expect(blocks[0].maxPoint).toEqual(minPoint.add(blockSize));
    //     expect(blocks[0].lod).toBe(1);

    //     // opposite block, reverse direction
    //     ray.origin = maxPoint;
    //     ray.direction = minPoint.subtract(maxPoint);
    //     blocks = tree.getContainingBlocksByRay(ray, lod);
    //     expect(blocks[0].minPoint).toEqual(minPoint.add(blockSize));
    //     expect(blocks[0].maxPoint).toEqual(maxPoint);
    //     expect(blocks.length).toBe(1);
    //     expect(blocks[0].lod === 1);

    //     // test at lod 2, a diagonal ray
    //     lod = 2;
    //     blockSize = maxPoint.subtract(minPoint).scale(1 / Math.pow(2, lod));
    //     ray.origin = minPoint;
    //     ray.direction = maxPoint.subtract(minPoint);
    //     blocks = tree.getContainingBlocksByRay(ray, lod);
    //     expect(blocks.length).toBe(2);
    //     expect(blocks[0].minPoint).toEqual(minPoint);
    //     expect(blocks[0].maxPoint).toEqual(minPoint.add(blockSize));
    //     expect(blocks[1].minPoint).toEqual(minPoint);
    //     expect(blocks[1].maxPoint).toEqual(minPoint.add(blockSize.scale(2)));

    //     ray.origin = maxPoint;
    //     ray.direction = minPoint.subtract(maxPoint);
    //     blocks = tree.getContainingBlocksByRay(ray, lod);
    //     expect(blocks.length).toBe(2);
    //     expect(blocks[0].minPoint).toEqual(maxPoint.subtract(blockSize));
    //     expect(blocks[0].maxPoint).toEqual(maxPoint);
    //     expect(blocks[1].minPoint).toEqual(maxPoint.subtract(blockSize.scale(2)));
    //     expect(blocks[1].maxPoint).toEqual(maxPoint);

    //     // test at lod 3 - we should get lod 2 results as maxDepth is 2
    //     lod = 3;
    //     ray.origin = minPoint;
    //     ray.direction = maxPoint.subtract(minPoint);
    //     blocks = tree.getContainingBlocksByRay(ray, lod);
    //     expect(blocks[0].minPoint).toEqual(minPoint);
    //     expect(blocks[0].maxPoint).toEqual(minPoint.add(blockSize));
    //     expect(blocks[1].minPoint).toEqual(minPoint);
    //     expect(blocks[1].maxPoint).toEqual(minPoint.add(blockSize.scale(2)));
    // });
});
