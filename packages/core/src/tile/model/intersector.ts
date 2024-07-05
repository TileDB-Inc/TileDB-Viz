import { Mesh, Ray } from '@babylonjs/core';
import { TileContent } from './tileContent';

export type IntersectionResult = {
  ids: bigint[];
  minPoint: [number, number, number];
  maxPoint: [number, number, number];
};

export abstract class Intersector<T extends TileContent> {
  protected data: T;

  constructor(data: T) {
    this.data = data;
  }

  public abstract intersectRay(ray: Ray): IntersectionResult;

  public abstract intersectMesh(mesh: Mesh): IntersectionResult;

  public abstract pickObject(id: bigint): void;
}
