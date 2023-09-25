import { Mesh, Scene } from '@babylonjs/core';
import { BaseResponse } from '../types';

export interface UpdateOptions<T extends BaseResponse> {
  response?: T;
}

export abstract class Tile<T extends BaseResponse> {
  protected mesh: Mesh;
  protected scene: Scene;

  public readonly index: number[];

  constructor(scene: Scene, response: T) {
    this.index = response.index;
    this.scene = scene;
    this.mesh = new Mesh(this.index.toString(), this.scene);
    this.mesh.alwaysSelectAsActiveMesh = true;
  }

  public abstract update<U extends UpdateOptions<T>>(updateOptions: U): void;

  public dispose() {
    this.mesh.dispose(false, true);
  }
}
