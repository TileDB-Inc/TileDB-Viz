import { Mesh, Ray } from '@babylonjs/core';
import { TileContent } from './tileContent';

export abstract class Intersector<T extends TileContent> {
  protected data: T;

  constructor(data: T) {
    this.data = data;
  }

  public abstract intersectRay(ray: Ray): bigint[];

  public abstract intersectMesh(mesh: Mesh): bigint[];

  public abstract pickObject(id: bigint): void;
}
