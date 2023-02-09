import { Ray, Vector3 } from '@babylonjs/core';

interface Octree<BlockType> {
    knownBlocks: any;
    minPoint: Vector3;
    maxPoint: Vector3;
    getContainingBlocksByRay(ray: Ray, lod: number): BlockType[];
    getNeighbours(code: number): Generator<BlockType, undefined, undefined>;
}
  
export default Octree;