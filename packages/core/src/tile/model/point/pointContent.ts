import {
  CreateBox,
  CreateSphere,
  Mesh,
  Nullable,
  Scene,
  ShaderMaterial,
  UniformBuffer,
  VertexBuffer,
  VertexData
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
import { PointShape } from '@tiledb-inc/viz-common';
import { TypedArray } from '../../types';
import { PointIntersector } from './pointIntersector';

type PointCloudData = {
  position: Float32Array;
  attributes: Record<string, TypedArray>;
};

type PointSelection = {
  indices: number[];
};

export type PointCloudUpdateOptions = TileUpdateOptions & {
  data?: PointCloudData;
  UBO?: UniformBuffer;
  FrameUBO?: UniformBuffer;
  feature?: Feature;
  pointSize?: number;
  pointShape?: PointShape;
  selection?: PointSelection;
};

export class PointTileContent extends TileContent {
  private pointCount: number;
  private material: Nullable<ShaderMaterial>;

  constructor(scene: Scene, tile: Tile<PointDataContent, PointTileContent>) {
    super(scene, tile);

    this.pointCount = 0;
    this.material = null;
    this.intersector = new PointIntersector(this);
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
    this.buffers['position'] = data.position;
    this.buffers['state'] = new Uint8Array(this.pointCount).fill(0);

    if (this.meshes.length === 0) {
      console.error('Mesh is unitiliazed for point cloud tile');
    }

    this.meshes[0]._thinInstanceDataStorage.instancesCount = this.pointCount;
    this.meshes[0].layerMask = this.tile.mask;
    this.meshes[0].setVerticesBuffer(
      new VertexBuffer(this.scene.getEngine(), data.position, 'loc', {
        size: 3,
        stride: 3,
        instanced: true
      })
    );
    this.meshes[0].setVerticesBuffer(
      new VertexBuffer(this.scene.getEngine(), this.buffers['state'], 'state', {
        size: 1,
        stride: 1,
        instanced: true,
        type: VertexBuffer.UNSIGNED_BYTE,
        updatable: true
      })
    );
  }

  private onDataUpdateWebGL(data: PointCloudData) {
    this.pointCount = data.position.length / 3;

    if (this.meshes.length === 0) {
      this.material = PointCloudMaterial(this.scene);

      this.meshes.push(new Mesh(this.tile.id.toString(), this.scene));
      this.meshes[0].setBoundingInfo(this.tile.boundingInfo);
      this.meshes[0].material = this.material;
      this.meshes[0].layerMask = this.tile.mask;
    }

    const vertexData = new VertexData();

    vertexData.positions = data.position;
    vertexData.applyToMesh(this.meshes[0], false);

    this.buffers = data.attributes;
    this.buffers['position'] = data.position;
  }

  private updateWebGPU(options: PointCloudUpdateOptions) {
    if (options.pointShape) {
      this.onPointShapeUpdateWebGPU(options.pointShape);
    }

    if (options.data) {
      this.onDataUpdateWebGPU(options.data);
    }

    if (options.selection) {
      this.onSelectionUpdateWebGPU(options.selection);
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
      case FeatureType.RGB:
        for (const mesh of this.meshes) {
          if (mesh.isVerticesDataPresent('group')) {
            mesh.removeVerticesData('group');
          }

          if (mesh.isVerticesDataPresent('colorAttr')) {
            mesh.updateVerticesData(
              'colorAttr',
              this.buffers[feature.name] as Float32Array
            );
          } else {
            mesh.setVerticesBuffer(
              new VertexBuffer(
                this.scene.getEngine(),
                this.buffers[feature.name],
                'colorAttr',
                {
                  stride: 3,
                  updatable: true,
                  instanced: true
                }
              )
            );
          }
        }
        break;
      case FeatureType.CATEGORICAL:
        for (const mesh of this.meshes) {
          if (mesh.isVerticesDataPresent('colorAttr')) {
            mesh.removeVerticesData('colorAttr');
          }

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

  private onPointShapeUpdateWebGPU(shape: PointShape) {
    if (this.meshes.length === 0) {
      this.meshes.push(new Mesh(this.tile.id.toString(), this.scene));
    }

    switch (shape) {
      case PointShape.CIRCLE:
        {
          const sphere = CreateSphere('temp', {
            diameter: 1,
            segments: 1,
            updatable: true
          });
          const buffer = new VertexData();

          buffer.positions = sphere.getVerticesData(VertexBuffer.PositionKind);
          buffer.normals = sphere.getVerticesData(VertexBuffer.NormalKind);
          buffer.uvs = sphere.getVerticesData(VertexBuffer.UVKind);
          buffer.indices = sphere.getIndices();

          buffer.applyToMesh(this.meshes[0]);

          sphere.dispose();
        }
        break;
      case PointShape.SQUARE:
        {
          const box = CreateBox('temp', {
            size: 1,
            updatable: true
          });

          const buffer = new VertexData();

          buffer.positions = box.getVerticesData(VertexBuffer.PositionKind);
          buffer.normals = box.getVerticesData(VertexBuffer.NormalKind);
          buffer.uvs = box.getVerticesData(VertexBuffer.UVKind);
          buffer.indices = box.getIndices();

          buffer.applyToMesh(this.meshes[0]);

          box.dispose();
        }
        break;
    }

    this.meshes[0].setBoundingInfo(this.tile.boundingInfo);
  }

  private onSelectionUpdateWebGPU(selection: PointSelection) {
    console.log(selection);
    const state = this.buffers['state'] as Uint8Array;

    for (const idx of selection.indices) {
      state[idx] = 1;
    }

    // @ts-expect-error Update vertices data expects only Float arrays but should expect anything
    this.meshes[0].updateVerticesData('state', state);
  }

  private updateWebGL(options: PointCloudUpdateOptions) {
    if (options.data) {
      this.onDataUpdateWebGL(options.data);
    }

    if (options.feature) {
      this.onFeatureUpdateWebGL(options.feature);
    }

    if (options.pointShape) {
      this.material?.setDefine('POINT_TYPE', options.pointShape.toString());
    }

    if (options.UBO) {
      this.material?.setUniformBuffer('pointOptions', options.UBO);
    }
  }

  private onFeatureUpdateWebGL(feature: Feature) {
    this.material?.setDefine('FEATURE_TYPE', feature.type.toString());

    switch (feature.type) {
      case FeatureType.FLAT_COLOR:
        //skip
        break;
      case FeatureType.RGB:
        for (const mesh of this.meshes) {
          if (mesh.isVerticesDataPresent('group')) {
            mesh.removeVerticesData('group');
          }

          if (mesh.isVerticesDataPresent('colorAttr')) {
            mesh.updateVerticesData(
              'colorAttr',
              this.buffers[feature.name] as Float32Array
            );
          } else {
            mesh.setVerticesBuffer(
              new VertexBuffer(
                this.scene.getEngine(),
                this.buffers[feature.name],
                'colorAttr',
                {
                  stride: 3,
                  updatable: true
                }
              )
            );
          }
        }
        break;
      case FeatureType.CATEGORICAL:
        for (const mesh of this.meshes) {
          if (mesh.isVerticesDataPresent('colorAttr')) {
            mesh.removeVerticesData('colorAttr');
          }

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
                  updatable: true
                }
              )
            );
          }
        }
        break;
      default:
        throw new Error(`Unknown feature type ${feature.type}`);
    }
  }
}
