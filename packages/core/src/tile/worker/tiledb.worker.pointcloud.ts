import { Mesh, NullEngine, Scene, Vector3, VertexData } from '@babylonjs/core';
import {
  AddOctreeNodeOperation,
  DeleteOctreeNodeOperation,
  InitializeOctreeOperation,
  IntersectOperation,
  PointCloudOperation
} from '@tiledb-inc/viz-common';
import { encodeMorton, Moctree } from '../../point-cloud/octree';
import { constructOctree } from '../model/point/utils';
import { pointIsInside } from './utils/geometryOperations';

const scene = new Scene(new NullEngine());
const octrees = new Map<string, Moctree>();
const octreeData = new Map<string, Float32Array>();

self.onmessage = function (event: MessageEvent<PointCloudOperation>) {
  switch (event.data.operation) {
    case 'INITIALIZE':
      initializeOctree(event.data as InitializeOctreeOperation);
      break;
    case 'ADD':
      addOctreeNode(event.data as AddOctreeNodeOperation);
      break;
    case 'DELETE':
      deleteOctreeNode(event.data as DeleteOctreeNodeOperation);
      break;
    case 'INTERSECT':
      intersect(event.data as IntersectOperation);
      break;
    default:
      console.warn(`Unknown point cloud operation "${event.data.operation}"`);
  }
};

function addOctreeNode(operation: AddOctreeNodeOperation) {
  octreeData.set(`${operation.id}_${operation.mortonCode}`, operation.data);

  self.postMessage({ done: true });
}

function deleteOctreeNode(operation: DeleteOctreeNodeOperation) {
  octreeData.delete(`${operation.id}_${operation.mortonCode}`);

  self.postMessage({ done: true });
}

function initializeOctree(operation: InitializeOctreeOperation) {
  octrees.set(
    operation.id,
    constructOctree(
      new Vector3(
        operation.minPoint[0],
        operation.minPoint[2],
        operation.minPoint[1]
      ),
      new Vector3(
        operation.maxPoint[0],
        operation.maxPoint[2],
        operation.maxPoint[1]
      ),
      operation.maxDepth,
      operation.blocks
    )
  );

  self.postMessage({ done: true });
}

function intersect(operation: IntersectOperation) {
  const octree = octrees.get(operation.id);
  let count = 0;
  if (!octree) {
    return;
  }

  // Build intersection mesh
  const mesh = new Mesh('Intersection Mesh', scene);
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

    const data = octreeData.get(`${operation.id}_${block.mortonNumber}`);

    if (!block.boundingInfo.intersects(mesh.getBoundingInfo(), true) || !data) {
      continue;
    }

    //TODO: Do per point intersection test
    for (let index = 0; index < data.length; index += 3) {
      if (
        pointIsInside(mesh, [data[index], data[index + 1], data[index + 2]])
      ) {
        ++count;
      }
    }

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
  console.log(count);
  self.postMessage({ done: true });
}
