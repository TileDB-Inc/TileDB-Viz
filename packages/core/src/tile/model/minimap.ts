import { LevelRecord, TypedArray, types } from '../types';
import {
  Mesh,
  VertexData,
  Scene,
  RawTexture2DArray,
  UniformBuffer,
  Nullable,
  Vector2,
  ShaderMaterial,
  Vector4
} from '@babylonjs/core';
import { Attribute, Dimension } from '../../types';
import { BioimageMinimapShaderMaterial } from '../materials/bioimageMinimapMaterial';

export class Minimap {
  public isLoaded: boolean;
  public isPending: boolean;
  public mesh: Nullable<Mesh>;

  private bounds: number[];
  private scene: Scene;
  private vertexData: VertexData;
  private tileOptions: UniformBuffer;
  private worker!: Worker;

  private namespace: string;
  private token: string;
  private basePath: string;
  private tileSize: number;
  private level: LevelRecord;
  private attribute: Attribute;
  private dimensions: Dimension[];
  private visibleArea: Vector4;

  constructor(
    index: number[],
    bounds: number[],
    level: LevelRecord,
    dimensions: Dimension[],
    attribute: Attribute,
    tileSize: number,
    tileOptions: UniformBuffer,
    namespace: string,
    token: string,
    basePath: string,
    scene: Scene
  ) {
    this.bounds = bounds;
    this.mesh = null;
    this.scene = scene;
    this.level = level;
    this.dimensions = dimensions;
    this.attribute = attribute;
    this.namespace = namespace;
    this.token = token;
    this.basePath = basePath;
    this.tileOptions = tileOptions;
    this.tileSize = tileSize;
    this.isLoaded = false;
    this.isPending = false;

    this.vertexData = new VertexData();
    this.vertexData.positions = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0];
    this.vertexData.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    this.vertexData.indices = [0, 3, 1, 1, 3, 2];
    this.visibleArea = new Vector4(1, 0, 0, 1);
  }

  public updateTileOptionsAndData(
    channelRanges: number[],
    dimensions: Dimension[],
    tileOptions: UniformBuffer
  ) {
    if (!this.isLoaded) {
      this.worker.terminate();
    }

    this.dimensions = dimensions;
    this.tileOptions = tileOptions;
    this.load(channelRanges);
  }

  public load(channelRanges: number[]) {
    const data = {
      index: [0, 0, 0],
      tileSize: this.tileSize,
      levelRecord: this.level,
      namespace: this.namespace,
      attribute: this.attribute,
      channelRanges: channelRanges,
      dimensions: this.dimensions,
      token: this.token,
      basePath: this.basePath
    };

    if (this.tileSize > 4096) {
      this.isLoaded = true;
      console.warn('Base level is too large for minimap creation');

      return;
    }

    this.worker = new Worker(
      new URL('../worker/tiledb.tile.worker', import.meta.url),
      {
        type: 'module'
      }
    );

    this.worker.onmessage = (event: any) => {
      this.worker.terminate();
      this.isLoaded = true;
      this.isPending = false;
      const [data, width, height, channels] = Object.values(event.data) as [
        TypedArray,
        number,
        number,
        number
      ];
      const dtype = this.attribute.type.toLowerCase();

      const intensityTexture = new RawTexture2DArray(
        data,
        width,
        height,
        channels,
        (types as any)[dtype].format,
        this.scene,
        false,
        false,
        (types as any)[dtype].filtering,
        (types as any)[dtype].type
      );

      intensityTexture.wrapU = RawTexture2DArray.CLAMP_ADDRESSMODE;
      intensityTexture.wrapV = RawTexture2DArray.CLAMP_ADDRESSMODE;

      if (this.mesh) {
        this.mesh.dispose(false, true);
      }

      this.mesh = new Mesh('minimap', this.scene);
      this.mesh.alwaysSelectAsActiveMesh = true;

      this.vertexData.applyToMesh(this.mesh);
      const material = BioimageMinimapShaderMaterial(
        'minimap',
        this.scene,
        (types as any)[dtype].samplerType,
        channels
      );

      const aspectRatio = Math.min(200 / this.bounds[2], 200 / this.bounds[3]);

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
      material.setVector2('margins', new Vector2(20, 20));
      material.setTexture('texture_arr', intensityTexture);
      material.setUniformBuffer('tileOptions', this.tileOptions);

      this.mesh.material = material;
      this.mesh.material.freeze();
    };

    this.isLoaded = false;
    this.isPending = true;

    this.worker.postMessage(data);
  }

  public updateVisibleArea(
    top: number,
    left: number,
    bottom: number,
    right: number
  ) {
    if (!this.mesh) {
      return;
    }

    // Invert top and bottom
    Vector4.FromFloatsToRef(
      left / this.bounds[2],
      bottom / this.bounds[3],
      right / this.bounds[2],
      top / this.bounds[3],
      this.visibleArea
    );

    (this.mesh.material as ShaderMaterial).setVector4(
      'visibleArea',
      this.visibleArea
    );
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
    if (!this.isLoaded) {
      this.worker.terminate();
    }

    this.mesh?.dispose(false, true);
  }
}
