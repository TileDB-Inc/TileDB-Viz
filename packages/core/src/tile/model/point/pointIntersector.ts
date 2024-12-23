import { Axis, Mesh, Ray, Vector3 } from '@babylonjs/core';
import { IntersectionResult, Intersector } from '../intersector';
import { PointTileContent } from './pointContent';

export class PointIntersector extends Intersector<PointTileContent> {
  private inverseIndex: Map<bigint, number>;
  private selection: bigint[];

  constructor(data: PointTileContent) {
    super(data);

    this.selection = [];
    this.inverseIndex = new Map();
  }

  public intersectRay(ray: Ray): IntersectionResult {
    const position = this.data.buffers['position'] as Float32Array | undefined;
    const indices = [];
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

    if (!position || !this.data.ids) {
      return {
        ids: [],
        minPoint: Vector3.ZeroReadOnly.asArray(),
        maxPoint: Vector3.ZeroReadOnly.asArray()
      };
    }

    for (let idx = 0; idx < position.length; idx += 3) {
      if (
        this._intersectPoint(
          ray,
          position[idx],
          position[idx + 1],
          position[idx + 2],
          1
        )
      ) {
        indices.push(idx / 3);
        ids.push(this.data.ids[idx / 3]);

        minPoint.minimizeInPlaceFromFloats(
          position[idx],
          position[idx + 1],
          position[idx + 2]
        );
        maxPoint.maximizeInPlaceFromFloats(
          position[idx],
          position[idx + 1],
          position[idx + 2]
        );
      }
    }

    this.data.update({ selection: { indices: indices } });

    return {
      ids: ids,
      minPoint: minPoint.asArray(),
      maxPoint: maxPoint.asArray()
    };
  }

  public intersectMesh(mesh: Mesh): IntersectionResult {
    const position = this.data.buffers['position'];
    const indices = [];
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

    if (!position || !this.data.ids) {
      return {
        ids: [],
        minPoint: Vector3.ZeroReadOnly.asArray(),
        maxPoint: Vector3.ZeroReadOnly.asArray()
      };
    }

    for (let idx = 0; idx < position.length; idx += 3) {
      if (
        this._intersectMesh(
          mesh,
          position[idx],
          position[idx + 1],
          position[idx + 2]
        )
      ) {
        indices.push(idx / 3);
        ids.push(this.data.ids[idx / 3]);
        this.inverseIndex.set(this.data.ids[idx / 3], idx / 3);

        minPoint.minimizeInPlaceFromFloats(
          position[idx],
          position[idx + 1],
          position[idx + 2]
        );
        maxPoint.maximizeInPlaceFromFloats(
          position[idx],
          position[idx + 1],
          position[idx + 2]
        );
      }
    }

    this.data.update({ selection: { indices: indices } });

    return {
      ids: ids,
      minPoint: minPoint.asArray(),
      maxPoint: maxPoint.asArray()
    };
  }

  public pickObject(id: bigint): void {
    this.data.update({
      selection: {
        pick: {
          current: this.inverseIndex.get(id) ?? -1,
          previous: this.inverseIndex.get(this.selection.at(0) ?? -1n) ?? -1
        }
      }
    });

    this.selection = id >= 0 ? [id] : [];
  }

  private _intersectMesh(mesh: Mesh, x: number, y: number, z: number): boolean {
    const boundInfo = mesh.getBoundingInfo();
    const max = boundInfo.maximum;
    const min = boundInfo.minimum;
    const diameter = 2 * boundInfo.boundingSphere.radius;

    if (x < min.x || x > max.x) {
      return false;
    }
    if (y < min.y || y > max.y) {
      return false;
    }
    if (z < min.z || z > max.z) {
      return false;
    }

    let hitCount = 0;
    const ray = new Ray(Vector3.Zero(), Axis.X, diameter);
    let pickInfo;
    const direction = new Vector3(x, y, z);
    const refPoint = new Vector3(x, y, z);

    hitCount = 0;
    ray.origin = refPoint;
    ray.direction = direction;
    ray.length = diameter;
    pickInfo = ray.intersectsMesh(mesh);
    while (pickInfo.hit && pickInfo.pickedPoint) {
      hitCount++;
      pickInfo.pickedPoint.addToRef(direction.scale(0.00000001), refPoint);
      ray.origin = refPoint;
      pickInfo = ray.intersectsMesh(mesh);
    }

    return hitCount % 2 === 1;
  }

  private _intersectPoint(
    ray: Ray,
    x: number,
    y: number,
    z: number,
    threshold: number
  ): boolean {
    const _x = x - ray.origin.x;
    const _y = y - ray.origin.y;
    const _z = z - ray.origin.z;
    const pyth = _x * _x + _y * _y + _z * _z;
    const rr = threshold * threshold;

    if (pyth <= rr) {
      return true;
    }

    const dot =
      _x * ray.direction.x + _y * ray.direction.y + _z * ray.direction.z;
    if (dot < 0.0) {
      return false;
    }

    const temp = pyth - dot * dot;

    return temp <= rr;
  }
}
