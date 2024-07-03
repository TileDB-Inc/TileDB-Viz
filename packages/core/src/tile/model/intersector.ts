import { Ray } from '@babylonjs/core';
import { TileContent } from './tileContent';

export abstract class Intersector<T extends TileContent> {
  protected data: T;

  constructor(data: T) {
    this.data = data;
  }

  public abstract intersect(ray: Ray): void;
}
