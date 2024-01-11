import { Axis, Mesh, Ray, Vector3 } from "@babylonjs/core";

export function pointIsInside(mesh: Mesh, point: number[]) {
  let boundInfo = mesh.getBoundingInfo();
  let max = boundInfo.maximum;
  let min = boundInfo.minimum;
  let diameter = 2 * boundInfo.boundingSphere.radius;

  if (point[0] < min.x || point[0] > max.x) {
    return false;
  }
  if (point[1] < min.y || point[1] > max.y) {
    return false;
  }
  if (point[2] < min.z || point[2] > max.z) {
    return false;
  }

  let hitCount = 0;
  let ray = new Ray(Vector3.Zero(), Axis.X, diameter);;
  let pickInfo;
  let direction = Vector3.FromArray(point);
  let refPoint = Vector3.FromArray(point);

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

  return (hitCount % 2) === 1;
}