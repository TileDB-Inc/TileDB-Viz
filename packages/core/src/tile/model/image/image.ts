import { ImageResponse, types } from '../../types';
import {
  VertexData,
  Scene,
  RawTexture2DArray,
  UniformBuffer
} from '@babylonjs/core';
import { ImageShaderMaterial } from '../../materials/imageShaderMaterial';
import { Tile, UpdateOptions } from '../tile';

export interface ImageUpdateOptions extends UpdateOptions<ImageResponse> {
  uniformBuffer?: UniformBuffer;
}

export class ImageTile extends Tile<ImageResponse> {
  private channelCount: number;

  constructor(
    bounds: number[],
    tileSize: number,
    channelCount: number,
    tileOptions: UniformBuffer,
    response: ImageResponse,
    scene: Scene
  ) {
    super(scene, response);
    this.channelCount = channelCount;

    const left = Math.max(
      bounds[0],
      (this.index[0] * tileSize) / 2 ** this.index[2]
    );
    const right = Math.min(
      bounds[2],
      ((this.index[0] + 1) * tileSize) / 2 ** this.index[2]
    );
    const bottom = Math.max(
      bounds[1],
      (this.index[1] * tileSize) / 2 ** this.index[2]
    );
    const top = Math.min(
      bounds[3],
      ((this.index[1] + 1) * tileSize) / 2 ** this.index[2]
    );

    const vertexData = new VertexData();
    vertexData.positions = [
      left,
      -this.index[2],
      bottom,
      right,
      -this.index[2],
      bottom,
      right,
      -this.index[2],
      top,
      left,
      -this.index[2],
      top
    ];
    vertexData.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    vertexData.indices = [0, 3, 1, 1, 3, 2];

    vertexData.applyToMesh(this.mesh);

    this.update({ uniformBuffer: tileOptions, response: response });
  }

  public update(updateOptions: ImageUpdateOptions) {
    if (updateOptions.response) {
      this.mesh.material?.dispose(true, true);

      const material = ImageShaderMaterial(
        this.index.toString(),
        this.scene,
        types[updateOptions.response.dtype].samplerType,
        this.channelCount
      );

      const intensityTexture = new RawTexture2DArray(
        updateOptions.response.data,
        updateOptions.response.width,
        updateOptions.response.height,
        updateOptions.response.channels,
        types[updateOptions.response.dtype].format,
        this.scene,
        false,
        false,
        types[updateOptions.response.dtype].filtering,
        types[updateOptions.response.dtype].type
      );

      intensityTexture.wrapU = RawTexture2DArray.CLAMP_ADDRESSMODE;
      intensityTexture.wrapV = RawTexture2DArray.CLAMP_ADDRESSMODE;

      material.setTexture('texture_arr', intensityTexture);
      material.setUniformBuffer('tileOptions', updateOptions.uniformBuffer!);

      this.mesh.material = material;
      this.mesh.material.freeze();
    }
  }
}
