import {
  CreateBox,
  Nullable,
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
import { Feature } from '@tiledb-inc/viz-common';
import { FeatureType } from '@tiledb-inc/viz-common';

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
  private material: Nullable<ShaderMaterial>;

  constructor(scene: Scene, tile: Tile<PointDataContent, PointTileContent>) {
    super(scene, tile);

    this.pointCount = 0;
    this.material = null;
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
    this.buffers = data.attributes;

    if (this.meshes.length === 0) {
      this.meshes.push(
        CreateBox(
          `${this.tile.id}`,
          {
            size: 1,
            updatable: true
          },
          this.scene
        )
      );

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

    if (options.feature) {
      this.onFeatureUpdateWebGPU(options.feature);

      if (this.scene.getEngine().isWebGPU) {
        this.material = PointCloudMaterialWebGPU(
          this.scene,
          options.feature.type
        );
      } else {
        this.material = PointCloudMaterial(this.scene);
      }

      for (const mesh of this.meshes) {
        mesh.material = this.material;
      }
    }

    if (options.UBO) {
      this.material?.setUniformBuffer('pointOptions', options.UBO);
    }

    if (options.FrameUBO) {
      this.material?.setUniformBuffer('frameOptions', options.FrameUBO);
    }
  }

  private onFeatureUpdateWebGPU(feature: Feature) {
    switch (feature.type) {
      case FeatureType.FLAT_COLOR:
        for (const mesh of this.meshes) {
          mesh.removeVerticesData('group');
        }
        break;
      case FeatureType.CATEGORICAL:
        for (const mesh of this.meshes) {
          if (mesh.isVerticesDataPresent('group')) {
            mesh.updateVerticesData(
              'group',
              this.buffers[feature.attributes[0].name] as Float32Array
            );
          } else {
            mesh.setVerticesBuffer(
              new VertexBuffer(
                this.scene.getEngine(),
                this.buffers[feature.attributes[0].name],
                'group',
                {
                  stride: 1,
                  instanced: true,
                  updatable: true
                }
              )
            );
          }
        }
        break;
    }
  }

  private updateWebGL(options: PointCloudUpdateOptions) {}
}
