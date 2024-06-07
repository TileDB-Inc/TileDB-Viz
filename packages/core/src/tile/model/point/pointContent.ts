import {
  CreateBox,
  Scene,
  ShaderMaterial,
  UniformBuffer,
  VertexBuffer
} from '@babylonjs/core';
import { TileContent, TileUpdateOptions } from '../tileContent';
import { Tile } from '../tile';
import { PointDataContent } from '../../../types';
import {
  PointCloudMaterial,
  PointCloudMaterialWebGPU
} from '../../materials/pointShaderMaterial';
import { FeatureType } from '@tiledb-inc/viz-common';
import { Feature } from '@tiledb-inc/viz-common';

type PointCloudData = {
  position: Float32Array;
  attributes: Record<string, Float32Array>;
};

export type PointCloudUpdateOptions = TileUpdateOptions & {
  data?: PointCloudData;
  UBO?: UniformBuffer;
  FrameUBO?: UniformBuffer;
  feature?: Feature;
  pointSize?: number;
};

export class PointTileContent extends TileContent {
  private pointCount: number;
  private material: ShaderMaterial;

  constructor(scene: Scene, tile: Tile<PointDataContent, PointTileContent>) {
    super(scene, tile);

    this.pointCount = 0;

    if (this.scene.getEngine().isWebGPU) {
      this.material = PointCloudMaterialWebGPU(
        this.scene,
        FeatureType.FLAT_COLOR
      );
    } else {
      this.material = PointCloudMaterial(this.scene);
    }
  }

  public update(options: PointCloudUpdateOptions): void {
    super.update(options);

    if (this.scene.getEngine().isWebGPU) {
      this.updateWebGPU(options);
    } else {
      this.updateWebGL(options);
    }
  }

  private onDataUpdateWebGPU(data: PointCloudData) {
    this.pointCount = data.position.length / 3;

    if (this.meshes.length === 0) {
      this.meshes.push(
        CreateBox(`${this.tile.id}`, {
          size: 1,
          updatable: true
        })
      );

      this.meshes[0].material = this.material;
      this.meshes[0].setBoundingInfo(this.tile.boundingInfo);
    }

    this.meshes[0]._thinInstanceDataStorage.instancesCount = this.pointCount;
    this.meshes[0].setVerticesBuffer(
      new VertexBuffer(this.scene.getEngine(), data.position, 'loc', {
        size: 3,
        stride: 3,
        instanced: true
      })
    );
  }

  private onDataUpdateWebGL(data: PointCloudData) {
    this.pointCount = data.position.length / 3;
  }

  private updateWebGPU(options: PointCloudUpdateOptions) {
    if (options.data) {
      this.onDataUpdateWebGPU(options.data);
    }

    if (options.UBO) {
      this.material.setUniformBuffer('pointOptions', options.UBO);
    }

    if (options.FrameUBO) {
      this.material.setUniformBuffer('frameOptions', options.FrameUBO);
    }
  }

  private updateWebGL(options: PointCloudUpdateOptions) {}
}
