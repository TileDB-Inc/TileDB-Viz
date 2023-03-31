import { Vector3, Axis, Mesh, Ray } from '@babylonjs/core';

const pointIsInsideMesh = (
  mesh: Mesh,
  boundInfo: { min: Vector3; max: Vector3 },
  point: Vector3
) => {
  const max = boundInfo.max.add(mesh.position);
  const min = boundInfo.min.add(mesh.position);
  const diameter = max.subtract(min).length() * 2;

  if (point.x < min.x || point.x > max.x) {
    return false;
  }

  if (point.y < min.y || point.y > max.y) {
    return false;
  }

  if (point.z < min.z || point.z > max.z) {
    return false;
  }

  const directions: Vector3[] = [
    new Vector3(0, 1, 0),
    //new Vector3(0, -1, 0),
    new Vector3(-0.89, 0.45, 0),
    new Vector3(0.89, 0.45, 0)
  ];

  const ray = new Ray(point, Axis.X, diameter);

  for (let c = 0; c < directions.length; c++) {
    ray.direction = directions[c];
    if (!ray.intersectsMesh(mesh).hit) {
      return false;
    }
  }

  return true;
};

export default pointIsInsideMesh;
