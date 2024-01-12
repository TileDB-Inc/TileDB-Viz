import { Vector3 } from '@babylonjs/core';
import { MathNumericType, matrix, max, min, multiply } from 'mathjs';
import {
  encodeMorton,
  Moctree,
  MoctreeBlock
} from '../../../point-cloud/octree';

export function constructOctree(
  minPoint: Vector3,
  maxPoint: Vector3,
  depth: number,
  blocks: { [index: `${number}-${number}-${number}-${number}`]: number }
): Moctree {
  const octree = new Moctree(minPoint, maxPoint, depth);
  const size = octree.maxPoint.subtract(minPoint);
  const flipMatrix = matrix([
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, -1]
  ]);

  for (const [index, pointCount] of Object.entries(blocks)) {
    const [lod, x, y, z] = index.split('-').map(Number);
    const mortonIndex = encodeMorton(new Vector3(x, z, y), lod);

    const blocksPerDimension = Math.pow(2, lod);
    const stepX = size.x / blocksPerDimension;
    const stepY = size.y / blocksPerDimension;
    const stepZ = size.z / blocksPerDimension;

    // This bounds are Y-Z swapped so we need to only swap the indices tof the block

    let minPoint = new Vector3(
      octree.minPoint.x + x * stepX,
      octree.minPoint.y + z * stepY,
      octree.minPoint.z + y * stepZ
    );
    let maxPoint = new Vector3(
      octree.minPoint.x + (x + 1) * stepX,
      octree.minPoint.y + (z + 1) * stepY,
      octree.minPoint.z + (y + 1) * stepZ
    );

    const minPointTransformed = multiply(
      flipMatrix,
      minPoint.asArray()
    ).toArray() as MathNumericType[];
    const maxPointTransformed = multiply(
      flipMatrix,
      maxPoint.asArray()
    ).toArray() as MathNumericType[];

    [minPoint, maxPoint] = [
      Vector3.FromArray(
        matrix(
          min([minPointTransformed, maxPointTransformed], 0) as any
        ).toArray() as number[]
      ),
      Vector3.FromArray(
        matrix(
          max([minPointTransformed, maxPointTransformed], 0) as any
        ).toArray() as number[]
      )
    ];

    octree.blocklist.set(
      mortonIndex,
      new MoctreeBlock(lod, mortonIndex, minPoint, maxPoint, pointCount)
    );
  }

  return octree;
}
