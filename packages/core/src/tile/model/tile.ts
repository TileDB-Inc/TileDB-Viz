import { LevelRecord, TypedArray, types } from '../types';
import {
  Mesh,
  VertexData,
  Scene,
  RawTexture2DArray,
  UniformBuffer,
  Nullable
} from '@babylonjs/core';
import { BioimageShaderMaterial } from '../materials/bioimageShaderMaterial';
import { Attribute, Dimension } from '../../types';
import { Events } from '@tiledb-inc/viz-components';

export class Tile {
  public isLoaded: boolean;
  public isPending: boolean;
  public canEvict: boolean;
  public index: number[];
  public mesh: Nullable<Mesh>;

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
    this.mesh = null;
    this.scene = scene;
    this.index = index;
    this.level = level;
    this.dimensions = dimensions;
    this.attribute = attribute;
    this.namespace = namespace;
    this.token = token;
    this.basePath = basePath;
    this.canEvict = false;
    this.isLoaded = false;
    this.isPending = false;
    this.tileOptions = tileOptions;
    this.tileSize = tileSize;

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

    this.vertexData = new VertexData();
    this.vertexData.positions = [
      left,
      -index[2], //0,
      bottom,
      right,
      -index[2], //0,
      bottom,
      right,
      -index[2], //0,
      top,
      left,
      -index[2], //0,
      top
    ];
    this.vertexData.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    this.vertexData.indices = [0, 3, 1, 1, 3, 2];
  }

  public updateTileOptionsAndData(
    channelRanges: number[],
    dimensions: Dimension[],
    tileOptions: UniformBuffer
  ) {
    if (!this.isLoaded) {
      this.updateLoadingStatus(true);
      this.worker.terminate();
    }

    this.dimensions = dimensions;
    this.tileOptions = tileOptions;
    this.load(channelRanges);
  }

  public load(channelRanges: number[]) {
    this.updateLoadingStatus(false);

    const data = {
      index: this.index,
      tileSize: this.tileSize,
      levelRecord: this.level,
      namespace: this.namespace,
      attribute: this.attribute,
      channelRanges: channelRanges,
      dimensions: this.dimensions,
      token: this.token,
      basePath: this.basePath
    };

    this.worker = new Worker(
      new URL('../worker/tiledb.tile.worker', import.meta.url),
      {
        type: 'module'
      }
    );

    this.worker.onmessage = (event: any) => {
      this.worker.terminate();
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

      this.mesh = new Mesh(this.index.toString(), this.scene);
      this.mesh.alwaysSelectAsActiveMesh = true;

      this.vertexData.applyToMesh(this.mesh);
      const material = BioimageShaderMaterial(
        this.index.toString(),
        this.scene,
        (types as any)[dtype].samplerType,
        channels
      );

      material.setTexture('texture_arr', intensityTexture);
      material.setUniformBuffer('tileOptions', this.tileOptions);

      this.mesh.material = material;
      this.mesh.material.freeze();

      this.updateLoadingStatus(true);

      this.isLoaded = true;
      this.isPending = false;
    };

    this.isLoaded = false;
    this.isPending = true;

    this.worker.postMessage(data);
  }

  public dispose() {
    if (!this.isLoaded) {
      this.updateLoadingStatus(true);
      this.worker.terminate();
    }

    this.mesh?.dispose(false, true);
  }

  private updateLoadingStatus(loaded: boolean) {
    window.dispatchEvent(
      new CustomEvent(Events.ENGINE_INFO_UPDATE, {
        bubbles: true,
        detail: {
          type: 'LOADING_TILE',
          loaded
        }
      })
    );
  }
}
