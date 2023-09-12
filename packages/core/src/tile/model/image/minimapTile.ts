import {
  RawTexture2DArray,
  Scene,
  ShaderMaterial,
  UniformBuffer,
  Vector2,
  Vector4,
  VertexData
} from '@babylonjs/core';
import { MinimapShaderMaterial } from '../../materials/minimapMaterial';
import { ImageResponse, types } from '../../types';
import { Tile, UpdateOptions } from '../tile';

export interface MinimapUpdateOptions extends UpdateOptions<ImageResponse> {
  uniformBuffer?: UniformBuffer;
  visibleArea?: number[];
  visible?: boolean;
  maxSize?: number;
}

export class MinimapTile extends Tile<ImageResponse> {
  private channelCount: number;
  private baseSize: number[];
  private minimapSize!: Vector2;
  private maxSize: number;

  constructor(
    response: ImageResponse,
    scene: Scene,
    bounds: number[],
    maxSize: number,
    channelCount: number,
    tileOptions: UniformBuffer
  ) {
    super(scene, response);

    this.maxSize = maxSize;
    this.channelCount = channelCount;
    this.baseSize = [...bounds];

    this.calculateMinimapSize();

    const vertexData = new VertexData();

    vertexData.positions = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0];
    vertexData.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    vertexData.indices = [0, 3, 1, 1, 3, 2];

    vertexData.applyToMesh(this.mesh);

    this.update({
      uniformBuffer: tileOptions,
      response,
      visibleArea: [1, 0, 0, 1]
    });
  }

  public update(updateOptions: MinimapUpdateOptions): void {
    if (updateOptions.response) {
      this.mesh.material?.dispose(true, true);

      const material = MinimapShaderMaterial(
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

      material.setVector2('margins', new Vector2(20, 20));
      material.setTexture('texture_arr', intensityTexture);

      if (updateOptions.uniformBuffer) {
        material.setUniformBuffer('tileOptions', updateOptions.uniformBuffer);
      }

      this.mesh.material = material;
    }

    if (updateOptions.visibleArea && this.mesh.material) {
      const visibleMinimapArea = new Vector4(
        updateOptions.visibleArea[0] / this.baseSize[0], // Left
        updateOptions.visibleArea[1] / this.baseSize[1], // Bottom
        updateOptions.visibleArea[2] / this.baseSize[0], // Right
        updateOptions.visibleArea[3] / this.baseSize[1] // Top
      );

      (this.mesh.material as ShaderMaterial).setVector4(
        'visibleArea',
        visibleMinimapArea
      );
    }

    if (this.mesh.material) {
      this.maxSize = updateOptions.maxSize ?? this.maxSize;

      const material = this.mesh.material as ShaderMaterial;
      material.unfreeze();
      material.setVector2(
        'screenSize',
        new Vector2(
          this.scene.getEngine().getRenderWidth(),
          this.scene.getEngine().getRenderHeight()
        )
      );
      material.setVector2('minimapSize', this.minimapSize);
      material.freeze();
    }

    if (updateOptions.visible !== undefined) {
      this.mesh.isVisible = updateOptions.visible;
    }
  }

  private calculateMinimapSize() {
    const aspectRatio = Math.min(
      this.maxSize / this.baseSize[0],
      this.maxSize / this.baseSize[1]
    );

    this.minimapSize = new Vector2(
      aspectRatio * this.baseSize[0],
      aspectRatio * this.baseSize[1]
    );
  }
}
