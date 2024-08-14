import { Axis, DeepImmutableObject, Mesh, Ray, Vector3 } from '@babylonjs/core';

export function edgeInMesh(
  mesh: Mesh,
  a: DeepImmutableObject<Vector3>,
  b: DeepImmutableObject<Vector3>
): boolean {
  const direction = b.subtract(a);
  const threshold = direction.length();
  const ray = new Ray(a, direction.normalize(), threshold);

  return ray.intersectsMesh(mesh).hit;
}

export function pointInMesh(
  mesh: DeepImmutableObject<Mesh>,
  vertex: DeepImmutableObject<Vector3>
): boolean {
  const boundInfo = mesh.getBoundingInfo();
  const max = boundInfo.maximum;
  const min = boundInfo.minimum;
  const diameter = 2 * boundInfo.boundingSphere.radius;

  if (vertex.x < min.x || vertex.x > max.x) {
    return false;
  }
  if (vertex.y < min.y || vertex.y > max.y) {
    return false;
  }
  if (vertex.z < min.z || vertex.z > max.z) {
    return false;
  }

  let hitCount = 0;
  const ray = new Ray(Vector3.Zero(), Axis.X, diameter);
  let pickInfo;
  const direction = vertex.clone();
  const refPoint = vertex.clone();

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

export function pointInRadius(
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
