import { HeapTreeArrayModel, MoctreeArrayModel } from "../point-cloud/model";
import { MoctreeBlock } from "../point-cloud/octree";
import { HTBlock } from "../point-cloud/octree/heaptree";
import { OnMessage, onmessageHeapTree, onmessageMoctree } from "../point-cloud/workers/tiledb.worker";

export type OctreeBlockType = MoctreeBlock;
export type ArrayModelType = MoctreeArrayModel;
export const ArrayModelClass = MoctreeArrayModel;
export const onmessage: OnMessage<OctreeBlockType> = onmessageMoctree;
// export type OctreeBlockType = HTBlock;
// export type ArrayModelType = HeapTreeArrayModel;
// export const ArrayModelClass = HeapTreeArrayModel;
// export const onmessage: OnMessage<OctreeBlockType> = onmessageHeapTree;
