import { TileDBTileImageOptions } from '../types';
import { Scene } from '@babylonjs/core';

class ImageModel {
  assetID: string;
  namespace: string;
  token: string;
  scene: Scene;

  constructor(scene: Scene, options: TileDBTileImageOptions) {
    this.scene = scene;

    this.assetID = options.assetID;
    this.namespace = options.namespace;
    this.token = options.token;
  }
}

export default ImageModel;
