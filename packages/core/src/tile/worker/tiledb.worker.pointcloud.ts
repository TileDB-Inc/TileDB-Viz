import { Mesh, NullEngine, Scene, Vector3, VertexData } from "@babylonjs/core";
import { encodeMorton, Moctree } from "../../point-cloud/octree";
import { PriorityQueue } from "../../point-cloud/utils/priority-queue";

export type PointCloudOperation = {
  operation: "INITIALIZE" | "ADD" | "DELETE" | "INTERSECT";
  id: string;
}

export type InitializeOctreeOperation = PointCloudOperation & {
  operation: "INITIALIZE";
  minPoint: number[];
  maxPoint: number[];
  maxDepth: number;
}

export type UpdateOctreeOperation = PointCloudOperation & {
  mortonCode: number;
  data: Float32Array;
}

export type IntersectOperation = PointCloudOperation & {
  operation: "INTERSECT";
  positions: Float32Array;
  indices: Int32Array;
}

const scene = new Scene(new NullEngine());
const octrees = new Map<string, Moctree>();

self.onmessage = function (event: MessageEvent<PointCloudOperation>) {
  switch (event.data.operation) {
    case "INITIALIZE":
      initializeOctree(event.data as InitializeOctreeOperation);
      break;
    case "ADD":
      break;
    case "DELETE":
      break;
    case "INTERSECT":
      intersect(event.data as IntersectOperation);
      break;
    default:
      console.warn(`Unknown point cloud operation "${event.data.operation}"`);
  }
}

function initializeOctree(operation: InitializeOctreeOperation) {
  octrees.set(operation.id, new Moctree(Vector3.FromArray(operation.minPoint), Vector3.FromArray(operation.maxPoint), operation.maxDepth));
}

function intersect(operation: IntersectOperation) {
  const octree = octrees.get(operation.id);

  if (!octree) {
    return;
  }

  // Build intersection mesh
  const mesh = new Mesh("Intersection Mesh", scene);
  const vertexData = new VertexData();

  vertexData.positions = operation.positions;
  vertexData.indices = operation.indices;
  vertexData.applyToMesh(mesh);

  // Find all octree block that intersect with the intersection mesh
  const root = octree.blocklist.get(encodeMorton(Vector3.ZeroReadOnly, 0));

  if (!root) {
    return;
  }

  const remainingBlocks = [root];

  while (remainingBlocks.length) {
    const block = remainingBlocks.shift();

    if (!block) {
      break;
    }

    if (!block.boundingInfo.intersects(mesh.getBoundingInfo(), true)) {
      continue;
    }

    //TODO: Do per point intersection test

    // Calculate children
    for (let i = 0; i < 8; ++i) {
      const code = (block.mortonNumber << 3) + i;

      if (!octree.blocklist.has(code)) {
        continue;
      }

      const child = octree.blocklist.get(code);
      if (child) {
        remainingBlocks.push(child);
      }
    }
  }
}