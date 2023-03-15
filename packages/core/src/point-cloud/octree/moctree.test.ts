import { Vector3 } from '@babylonjs/core';
import { SparseResult } from '../model';
import {
  decodeMorton,
  encodeMorton,
  getMortonRange,
  Moctree,
  MoctreeBlock
} from './moctree';

describe('moctree tests', () => {
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

  test('load block metadata', () => {
    // known data, block 1-1-1-1 (15) (D-X-Y-Z) is missing
    const blockData = new Map<string, number>();

    // set lod 0
    blockData.set('0-0-0-0', 1);

    for (let l = 1; l <= 2; l++) {
      const range = getMortonRange(l);
      for (let m = range.minMorton; m < range.maxMorton; m++) {
        // furthest octant is empty
        if (m === 15 || m >> 3 === 15) {
          continue;
        }
        const v = decodeMorton(m);
        blockData.set(`${l}-${v.x}-${v.z}-${v.y}`, m);
      }
    }

    // (level 0) + (level 1) - (one lod1 octant) + (level 2) - (8 lod2 octants)
    expect(blockData.size).toBe(1 + 8 - 1 + 64 - 8);

    // unit cube
    const octree = new Moctree(Vector3.Zero(), new Vector3(1, 1, 1), 2, 10);

    blockData.forEach((v, k) => {
      const parts = k.split('-').map(Number);
      // swap z and y
      const morton = encodeMorton(
        new Vector3(parts[1], parts[3], parts[2]),
        parts[0]
      );
      octree.knownBlocks.set(morton, v);
    });

    expect(octree.knownBlocks.has(14)).toBe(true);
    expect(octree.knownBlocks.has(15)).toBe(false);
  });

  test('create entries', () => {
    // required for code coverage
    const entries: SparseResult = {
      X: new Float32Array([]),
      Y: new Float32Array([]),
      Z: new Float32Array([]),
      Red: new Uint16Array([]),
      Green: new Uint16Array([]),
      Blue: new Uint16Array([])
    };
    const block = new MoctreeBlock(
      1,
      1,
      Vector3.Zero(),
      new Vector3(1, 1, 1),
      entries
    );

    expect(block.entries).toBeDefined();
  });
});
