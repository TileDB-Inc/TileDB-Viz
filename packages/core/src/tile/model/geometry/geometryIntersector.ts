import { Ray, Mesh, Vector3 } from '@babylonjs/core';
import { IntersectionResult, Intersector } from '../intersector';
import { GeometryContent } from './geometryContent';
import { edgeInMesh, pointInMesh } from '../../utils/geometry';

export class GeometryIntersector extends Intersector<GeometryContent> {
  public intersectRay(ray: Ray): IntersectionResult {
    const position = this.data.buffers['position'] as Float32Array | undefined;
    const indices = this.data.buffers['indices'] as Int32Array | undefined;
    const selectedIndices: number[] = [];

    const ids: bigint[] = [];
    const minPoint = new Vector3(
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER
    );
    const maxPoint = new Vector3(
      Number.MIN_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER
    );

    if (!position || !indices || !this.data.ids) {
      return {
        ids: [],
        minPoint: Vector3.ZeroReadOnly.asArray(),
        maxPoint: Vector3.ZeroReadOnly.asArray()
      };
    }

    const vertexA = Vector3.Zero();
    const vertexB = Vector3.Zero();
    const vertexC = Vector3.Zero();

    for (let idx = 0; idx < indices.length; idx += 3) {
      if (
        ray.intersectsTriangle(
          Vector3.FromArrayToRef(position, 3 * indices[idx], vertexA),
          Vector3.FromArrayToRef(position, 3 * indices[idx + 1], vertexB),
          Vector3.FromArrayToRef(position, 3 * indices[idx + 2], vertexC)
        )
      ) {
        const polygonID = this.data.ids[indices[idx]];

        ids.push(polygonID);

        minPoint.minimizeInPlace(vertexA);
        minPoint.minimizeInPlace(vertexB);
        minPoint.minimizeInPlace(vertexC);

        maxPoint.maximizeInPlace(vertexA);
        maxPoint.maximizeInPlace(vertexB);
        maxPoint.maximizeInPlace(vertexC);

        // Find the first vertex of the polygon
        while (idx - 3 >= 0 && this.data.ids[indices[idx - 3]] === polygonID) {
          idx -= 3;
        }

        // Iterate over all vertices of the polygon
        for (
          ;
          idx < indices.length && this.data.ids[indices[idx]] === polygonID;
          idx += 3
        ) {
          selectedIndices.push(
            indices[idx],
            indices[idx + 1],
            indices[idx + 2]
          );
        }
      }
    }

    this.data.update({ selection: { indices: selectedIndices } });

    return {
      ids: ids,
      minPoint: minPoint.asArray(),
      maxPoint: maxPoint.asArray()
    };
  }

  public intersectMesh(mesh: Mesh): IntersectionResult {
    const position = this.data.buffers['position'] as Float32Array | undefined;
    const indices = this.data.buffers['indices'] as Int32Array | undefined;
    const selectedIndices: number[] = [];

    const ids: bigint[] = [];
    const minPoint = new Vector3(
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER
    );
    const maxPoint = new Vector3(
      Number.MIN_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER
    );

    if (!position || !indices || !this.data.ids) {
      return {
        ids: [],
        minPoint: Vector3.ZeroReadOnly.asArray(),
        maxPoint: Vector3.ZeroReadOnly.asArray()
      };
    }

    const vertexA = Vector3.Zero();
    const vertexB = Vector3.Zero();
    const vertexC = Vector3.Zero();

    for (let idx = 0; idx < indices.length; idx += 3) {
      Vector3.FromArrayToRef(position, 3 * indices[idx], vertexA);
      Vector3.FromArrayToRef(position, 3 * indices[idx + 1], vertexB);
      Vector3.FromArrayToRef(position, 3 * indices[idx + 2], vertexC);

      if (
        !pointInMesh(mesh, vertexA) &&
        !pointInMesh(mesh, vertexB) &&
        !pointInMesh(mesh, vertexC) &&
        !edgeInMesh(mesh, vertexA, vertexB) &&
        !edgeInMesh(mesh, vertexB, vertexC) &&
        !edgeInMesh(mesh, vertexC, vertexA)
      ) {
        continue;
      }

      const polygonID = this.data.ids[indices[idx]];

      ids.push(polygonID);

      // Find the first vertex of the polygon
      while (idx - 3 >= 0 && this.data.ids[indices[idx - 3]] === polygonID) {
        idx -= 3;
      }

      // Iterate over all vertices of the polygon
      for (
        ;
        idx < indices.length && this.data.ids[indices[idx]] === polygonID;
        idx += 3
      ) {
        selectedIndices.push(indices[idx], indices[idx + 1], indices[idx + 2]);

        Vector3.FromArrayToRef(position, 3 * indices[idx], vertexA);
        Vector3.FromArrayToRef(position, 3 * indices[idx + 1], vertexB);
        Vector3.FromArrayToRef(position, 3 * indices[idx + 2], vertexC);

        minPoint.minimizeInPlace(vertexA);
        minPoint.minimizeInPlace(vertexB);
        minPoint.minimizeInPlace(vertexC);

        maxPoint.maximizeInPlace(vertexA);
        maxPoint.maximizeInPlace(vertexB);
        maxPoint.maximizeInPlace(vertexC);
      }
    }

    this.data.update({ selection: { indices: selectedIndices } });

    return {
      ids: ids,
      minPoint: minPoint.asArray(),
      maxPoint: maxPoint.asArray()
    };
  }

  public pickObject(id: bigint): void {
    throw new Error('Method not implemented.');
  }
}
