import { ImageResponse, types } from '../types';
import {
  Mesh,
  VertexData,
  Scene,
  RawTexture2DArray,
  UniformBuffer
} from '@babylonjs/core';
import { BioimageShaderMaterial } from '../materials/bioimageShaderMaterial';

export class Tile {
  private mesh: Mesh;
  private scene: Scene;
  private tileOptions: UniformBuffer;

  constructor(
    bounds: number[],
    tileSize: number,
    tileOptions: UniformBuffer,
    response: ImageResponse,
    scene: Scene
  ) {
    this.scene = scene;
    const index = response.index;
    this.tileOptions = tileOptions;

    const left = Math.max(bounds[0], (index[0] * tileSize) / 2 ** index[2]);
    const right = Math.min(
      bounds[2],
      ((index[0] + 1) * tileSize) / 2 ** index[2]
    );
    const bottom = Math.max(bounds[1], (index[1] * tileSize) / 2 ** index[2]);
    const top = Math.min(
      bounds[3],
      ((index[1] + 1) * tileSize) / 2 ** index[2]
    );

    const vertexData = new VertexData();
    vertexData.positions = [
      left,
      -index[2],
      bottom,
      right,
      -index[2],
      bottom,
      right,
      -index[2],
      top,
      left,
      -index[2],
      top
    ];
    vertexData.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    vertexData.indices = [0, 3, 1, 1, 3, 2];

    this.mesh = new Mesh(index.toString(), this.scene);
    this.mesh.alwaysSelectAsActiveMesh = true;

    vertexData.applyToMesh(this.mesh);

    this.update(tileOptions, response);
  }

  public update(tileOptions: UniformBuffer, response?: ImageResponse) {
    this.tileOptions = tileOptions;

    if (response) {
      this.mesh.material?.dispose(true, true);

      const material = BioimageShaderMaterial(
        response.index.toString(),
        this.scene,
        (types as any)[response.dtype].samplerType,
        response.channels
      );

      const intensityTexture = new RawTexture2DArray(
        response.data,
        response.width,
        response.height,
        response.channels,
        (types as any)[response.dtype].format,
        this.scene,
        false,
        false,
        (types as any)[response.dtype].filtering,
        (types as any)[response.dtype].type
      );

      intensityTexture.wrapU = RawTexture2DArray.CLAMP_ADDRESSMODE;
      intensityTexture.wrapV = RawTexture2DArray.CLAMP_ADDRESSMODE;

      material.setTexture('texture_arr', intensityTexture);
      material.setUniformBuffer('tileOptions', this.tileOptions);

      this.mesh.material = material;
      this.mesh.material.freeze();
    }
  }

  public dispose() {
    this.mesh.dispose(false, true);
  }
}
