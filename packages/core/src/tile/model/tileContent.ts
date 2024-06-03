import { Mesh, Scene } from '@babylonjs/core';
import { Tile } from './tile';

export type TileUpdateOptions = {
  opacity?: number;
};

export class TileContent {
  public meshes: Array<Mesh>;

  public buffers: Record<string, Float32Array | Int32Array>;

  protected scene: Scene;
  protected tile: Tile<any, any>;

  constructor(scene: Scene, tile: Tile<any, any>) {
    this.scene = scene;
    this.tile = tile;

    this.meshes = [];
    this.buffers = {};
  }

  public dispose() {
    for (const mesh of this.meshes) {
      mesh.dispose(false, true);
    }
  }

  public update(options: TileUpdateOptions): void {
    for (const mesh of this.meshes) {
      mesh.visibility = options.opacity || mesh.visibility;
    }
  }
}
