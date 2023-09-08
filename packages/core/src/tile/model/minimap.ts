import { ImageResponse, types } from '../types';
import {
  Mesh,
  VertexData,
  Scene,
  RawTexture2DArray,
  UniformBuffer,
  Vector2,
  ShaderMaterial,
  Vector4
} from '@babylonjs/core';
import { BioimageMinimapShaderMaterial } from '../materials/bioimageMinimapMaterial';

export class Minimap {
  private mesh: Mesh;
  private scene: Scene;
  private tileOptions: UniformBuffer;
  private visibleArea: Vector4;
  private size: Vector2;
  private bounds: number[];
  private channelCount;

  public static readonly MINIMAP_MAX_SIZE = 200;
  public static readonly IMAGE_MAX_SIZE = 4096;

  constructor(
    bounds: number[],
    channelCount: number,
    tileOptions: UniformBuffer,
    response: ImageResponse,
    scene: Scene
  ) {
    this.scene = scene;
    this.tileOptions = tileOptions;
    this.bounds = bounds;
    this.channelCount = channelCount;

    const aspectRatio = Math.min(
      Minimap.MINIMAP_MAX_SIZE / bounds[2],
      Minimap.MINIMAP_MAX_SIZE / bounds[3]
    );
    this.size = new Vector2(aspectRatio * bounds[2], aspectRatio * bounds[3]);

    this.mesh = new Mesh('minimap', this.scene);
    this.mesh.alwaysSelectAsActiveMesh = true;

    const vertexData = new VertexData();

    vertexData.positions = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0];
    vertexData.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    vertexData.indices = [0, 3, 1, 1, 3, 2];
    vertexData.applyToMesh(this.mesh);

    this.visibleArea = new Vector4(1, 0, 0, 1);

    this.update(this.tileOptions, response);
  }

  public update(
    tileOptions: UniformBuffer,
    response?: ImageResponse,
    visibleBounds?: number[]
  ) {
    this.tileOptions = tileOptions;

    if (response) {
      this.mesh.material?.dispose(true, true);

      const intensityTexture = new RawTexture2DArray(
        response.data,
        response.width,
        response.height,
        response.channels,
        types[response.dtype].format,
        this.scene,
        false,
        false,
        types[response.dtype].filtering,
        types[response.dtype].type
      );

      intensityTexture.wrapU = RawTexture2DArray.CLAMP_ADDRESSMODE;
      intensityTexture.wrapV = RawTexture2DArray.CLAMP_ADDRESSMODE;

      const material = BioimageMinimapShaderMaterial(
        'minimap',
        this.scene,
        types[response.dtype].samplerType,
        this.channelCount
      );

      material.setVector2(
        'screenSize',
        new Vector2(
          this.scene.getEngine().getRenderWidth(),
          this.scene.getEngine().getRenderHeight()
        )
      );
      material.setVector2('minimapSize', this.size);
      material.setVector2('margins', new Vector2(20, 20));
      material.setTexture('texture_arr', intensityTexture);
      material.setUniformBuffer('tileOptions', this.tileOptions);

      this.mesh.material = material;
      this.mesh.material.freeze();
    }

    if (visibleBounds && this.mesh.material) {
      Vector4.FromFloatsToRef(
        visibleBounds[0] / this.bounds[2], // Left
        visibleBounds[1] / this.bounds[3], // Bottom
        visibleBounds[2] / this.bounds[2], // Right
        visibleBounds[3] / this.bounds[3], // Top
        this.visibleArea
      );

      (this.mesh.material as ShaderMaterial).setVector4(
        'visibleArea',
        this.visibleArea
      );
    }
  }

  public hide(visible: boolean) {
    this.mesh.isVisible = visible;
  }

  public resize() {
    if (this.mesh === null) {
      throw new Error('Minimap in not instantiated');
    }

    const aspectRatio = Math.min(200 / this.bounds[2], 200 / this.bounds[3]);

    const material = this.mesh.material as ShaderMaterial;

    material.setVector2(
      'screenSize',
      new Vector2(
        this.scene.getEngine().getRenderWidth(),
        this.scene.getEngine().getRenderHeight()
      )
    );
    material.setVector2(
      'minimapSize',
      new Vector2(aspectRatio * this.bounds[2], aspectRatio * this.bounds[3])
    );
  }

  public dispose() {
    this.mesh?.dispose(false, true);
  }
}
