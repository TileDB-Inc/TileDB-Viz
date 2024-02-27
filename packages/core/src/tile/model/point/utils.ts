import { Vector3 } from '@babylonjs/core';
import { matrix, max, min, multiply } from 'mathjs';
import {
  encodeMorton,
  Moctree,
  MoctreeBlock
} from '../../../point-cloud/octree';

export function constructOctree(
  minPoint: Vector3,
  maxPoint: Vector3,
  nativeMinPoint: Vector3,
  nativeMaxPoint: Vector3,
  scaleCoeeficients: number[],
  depth: number,
  blocks: { [index: `${number}-${number}-${number}-${number}`]: number }
): Moctree {
  const octree = new Moctree(minPoint, maxPoint, depth);
  const nativeSize = nativeMaxPoint.subtract(nativeMinPoint);
  const size = octree.maxPoint.subtract(minPoint);
  const flipMatrix = matrix([
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, -1]
  ]);

  for (const [index, pointCount] of Object.entries(blocks)) {
    const [lod, x, y, z] = index.split('-').map(Number);
    const mortonIndex = encodeMorton(new Vector3(x, y, z), lod);

    const blocksPerDimension = Math.pow(2, lod);

    // If the affine transformation between CRS and pixel space contains a negative scale coeeficient
    // the octree indexing must be flipped in the axes where the negative coeeficients appear
    const xIndex = scaleCoeeficients[0] > 0 ? x : blocksPerDimension - x - 1;
    const yIndex = scaleCoeeficients[1] > 0 ? y : blocksPerDimension - y - 1;
    const zIndex = scaleCoeeficients[2] > 0 ? z : blocksPerDimension - z - 1;

    // Native block calculation
    const nativeStepX = nativeSize.x / blocksPerDimension;
    const nativeStepY = nativeSize.y / blocksPerDimension;
    const nativeStepZ = nativeSize.z / blocksPerDimension;

    const nativeMin = new Vector3(
      nativeMinPoint.x + x * nativeStepX,
      nativeMinPoint.y + y * nativeStepY,
      nativeMinPoint.z + z * nativeStepZ
    );
    const nativeMax = new Vector3(
      nativeMinPoint.x + (x + 1) * nativeStepX,
      nativeMinPoint.y + (y + 1) * nativeStepY,
      nativeMinPoint.z + (z + 1) * nativeStepZ
    );

    // Transformed block calculation
    const stepX = size.x / blocksPerDimension;
    const stepY = size.y / blocksPerDimension;
    const stepZ = size.z / blocksPerDimension;

    // These bounds are Y-Z swapped so we need to only swap the indices of the block

    let minPoint = new Vector3(
      octree.minPoint.x + xIndex * stepX,
      octree.minPoint.y + zIndex * stepY,
      octree.minPoint.z + yIndex * stepZ
    );
    let maxPoint = new Vector3(
      octree.minPoint.x + (xIndex + 1) * stepX,
      octree.minPoint.y + (zIndex + 1) * stepY,
      octree.minPoint.z + (yIndex + 1) * stepZ
    );

    const minPointTransformed = multiply(flipMatrix, minPoint.asArray());
    const maxPointTransformed = multiply(flipMatrix, maxPoint.asArray());

    [minPoint, maxPoint] = [
      Vector3.FromArray(
        matrix(
          min(
            [
              minPointTransformed.toArray(),
              maxPointTransformed.toArray()
            ] as number[][],
            0
          ) as any
        ).toArray() as number[]
      ),
      Vector3.FromArray(
        matrix(
          max(
            [
              minPointTransformed.toArray(),
              maxPointTransformed.toArray()
            ] as number[][],
            0
          ) as any
        ).toArray() as number[]
      )
    ];

    octree.blocklist.set(
      mortonIndex,
      new MoctreeBlock(
        lod,
        mortonIndex,
        minPoint,
        maxPoint,
        pointCount,
        undefined,
        nativeMin,
        nativeMax
      )
    );
  }

  return octree;
}
