import {
  VertexData,
  Scene,
  VertexBuffer,
  UniformBuffer,
  ShaderMaterial,
  MeshBuilder
} from '@babylonjs/core';
import { Feature, FeatureType } from '@tiledb-inc/viz-common';
import {
  PointCloudMaterial,
  PointCloudMaterialWebGPU
} from '../../materials/pointShaderMaterial';
import { PointResponse, PointShape, TypedArray } from '../../types';
import { Tile, UpdateOptions } from '../tile';

const MAX_GROUPS = 32;

export interface PointUpdateOptions extends UpdateOptions<PointResponse> {
  pointOptions?: UniformBuffer;
  feature?: Feature;
  groupUpdate?: { categoryIndex: number; group: number };
  groupState?: Map<string, Map<number, number>>;
  pointShape?: PointShape;
}

export class PointTile extends Tile<PointResponse> {
  protected material?: ShaderMaterial;
  private groups!: Int32Array;
  private state!: Float32Array;
  private meshData: Record<string, TypedArray>;
  private vertexCount: number;
  private activeFeature?: Feature;
  private vertexMap: Map<bigint, number>;

  constructor(scene: Scene, response: PointResponse) {
    super(scene, response);

    if (this.scene.getEngine().isWebGPU) {
      this.mesh.dispose();
      this.mesh = MeshBuilder.CreateBox(
        `${this.index.toString()}_${response.index}`,
        { size: 1 },
        this.scene
      );
      this.mesh.alwaysSelectAsActiveMesh = true;
    } else {
      this.material = PointCloudMaterial(this.scene);
      this.mesh.material = this.material;
    }

    this.meshData = {};
    this.vertexCount = 0;
    this.mesh.layerMask = 0b1;
    this.mesh.renderingGroupId = 3;
    this.vertexMap = new Map<bigint, number>();

    this.update({ response });
  }

  private updateWebGPU(updateOptions: PointUpdateOptions): void {
    // WebGPU uses instanced rendering bor point clouds so the
    // updates need to be done differently

    if (updateOptions.response) {
      this.meshData = updateOptions.response.attributes;

      this.vertexCount =
        updateOptions.response.attributes['position'].length / 3;
      this.groups = new Int32Array(this.vertexCount).fill(0);
      this.state = new Float32Array(this.vertexCount).fill(0);

      this.setupInstanceBuffersWebGPU(
        updateOptions.response.attributes['position'] as Float32Array
      );

      if (updateOptions.response.attributes['Picking ID']?.length) {
        const ids = updateOptions.response.attributes[
          'Picking ID'
        ] as BigInt64Array;
        this.vertexMap = new Map(
          Array.from(ids).map((value, index) => [value, index])
        );

        this.mesh.setVerticesBuffer(
          new VertexBuffer(
            this.scene.getEngine(),
            this.state,
            'state',
            true,
            false,
            1
          )
        );
      }
    }

    if (updateOptions.feature) {
      this.activeFeature = updateOptions.feature;

      this.material = PointCloudMaterialWebGPU(
        this.scene,
        updateOptions.feature.type
      );
      this.mesh.material = this.material;

      switch (updateOptions.feature.type) {
        case FeatureType.FLAT_COLOR:
          //skip
          break;
        case FeatureType.RGB:
          this.mesh.setVerticesBuffer(
            new VertexBuffer(
              this.scene.getEngine(),
              this.meshData[updateOptions.feature.name],
              'colorAttr',
              {
                size: 3,
                stride: 3,
                instanced: true
              }
            )
          );
          break;
        case FeatureType.CATEGORICAL:
          {
            this.groups.fill(MAX_GROUPS);
            const state = updateOptions.groupState?.get(
              updateOptions.feature.name
            );
            const categories = this.meshData[
              updateOptions.feature.name
            ] as Int32Array;

            if (state) {
              for (let index = 0; index < this.groups.length; ++index) {
                this.groups[index] = state.get(categories[index]) ?? MAX_GROUPS;
              }
            }

            this.mesh.setVerticesBuffer(
              new VertexBuffer(this.scene.getEngine(), this.groups, 'group', {
                size: 1,
                stride: 1,
                instanced: true
              })
            );
          }
          break;
        default:
          throw new Error(`Unknown feature type ${updateOptions.feature.type}`);
      }
    }

    if (updateOptions.pointOptions) {
      this.material?.setUniformBuffer(
        'pointOptions',
        updateOptions.pointOptions
      );
    }

    if (updateOptions.groupUpdate && this.activeFeature) {
      const categories = this.meshData[this.activeFeature.name];

      for (let index = 0; index < this.groups.length; ++index) {
        if (categories[index] === updateOptions.groupUpdate.categoryIndex) {
          this.groups[index] = updateOptions.groupUpdate.group;
        }
      }

      this.mesh.setVerticesBuffer(
        new VertexBuffer(this.scene.getEngine(), this.groups, 'group', {
          size: 1,
          stride: 1,
          instanced: true
        }),
        true
      );
    }

    if (updateOptions.pointShape) {
      switch (updateOptions.pointShape) {
        case PointShape.CIRCLE:
          {
            const sphere = MeshBuilder.CreateSphere(this.mesh.name, {
              diameter: 1,
              segments: 1,
              updatable: true
            });
            const buffer = new VertexData();

            buffer.positions = sphere.getVerticesData(
              VertexBuffer.PositionKind
            );
            buffer.normals = sphere.getVerticesData(VertexBuffer.NormalKind);
            buffer.uvs = sphere.getVerticesData(VertexBuffer.UVKind);
            buffer.indices = sphere.getIndices();

            buffer.applyToMesh(this.mesh);

            sphere.dispose();
          }
          break;
        case PointShape.SQUARE:
          {
            const box = MeshBuilder.CreateBox(this.mesh.name, {
              size: 1,
              updatable: true
            });

            const buffer = new VertexData();

            buffer.positions = box.getVerticesData(VertexBuffer.PositionKind);
            buffer.normals = box.getVerticesData(VertexBuffer.NormalKind);
            buffer.uvs = box.getVerticesData(VertexBuffer.UVKind);
            buffer.indices = box.getIndices();

            buffer.applyToMesh(this.mesh);

            box.dispose();
          }
          break;
      }
    }
  }

  private setupInstanceBuffersWebGPU(positions: Float32Array) {
    this.mesh._thinInstanceDataStorage.instancesCount = this.vertexCount;
    this.mesh.setVerticesBuffer(
      new VertexBuffer(this.scene.getEngine(), positions, 'loc', {
        size: 3,
        stride: 3,
        instanced: true
      })
    );
    this.mesh.setVerticesBuffer(
      new VertexBuffer(this.scene.getEngine(), this.state, 'state', {
        size: 1,
        stride: 1,
        instanced: true
      })
    );
  }

  public update(updateOptions: PointUpdateOptions): void {
    if (this.scene.getEngine().isWebGPU) {
      this.updateWebGPU(updateOptions);
      return;
    }

    if (updateOptions.response) {
      this.meshData = updateOptions.response.attributes;
      const vertexData = new VertexData();

      vertexData.positions = updateOptions.response.attributes[
        'position'
      ] as Float32Array;
      vertexData.applyToMesh(this.mesh, false);

      this.vertexCount = vertexData.positions.length / 3;
      this.groups = new Int32Array(this.vertexCount).fill(0);
      this.state = new Float32Array(this.vertexCount);

      if (updateOptions.response.attributes['Picking ID']?.length) {
        const ids = updateOptions.response.attributes[
          'Picking ID'
        ] as BigInt64Array;
        this.vertexMap = new Map(
          Array.from(ids).map((value, index) => [value, index])
        );

        this.mesh.setVerticesBuffer(
          new VertexBuffer(
            this.scene.getEngine(),
            this.state,
            'state',
            true,
            false,
            1
          )
        );
      }
    }

    if (updateOptions.pointOptions) {
      this.material?.setUniformBuffer(
        'pointOptions',
        updateOptions.pointOptions
      );
    }

    if (updateOptions.pointShape) {
      this.material?.setDefine(
        'POINT_TYPE',
        updateOptions.pointShape.toString()
      );
    }

    if (updateOptions.feature) {
      this.material?.setDefine(
        'FEATURE_TYPE',
        updateOptions.feature.type.toString()
      );
      this.activeFeature = updateOptions.feature;

      switch (updateOptions.feature.type) {
        case FeatureType.FLAT_COLOR:
          //skip
          break;
        case FeatureType.RGB:
          this.mesh.setVerticesBuffer(
            new VertexBuffer(
              this.scene.getEngine(),
              this.meshData[updateOptions.feature.name],
              'colorAttr',
              true,
              false,
              3
            )
          );
          break;
        case FeatureType.CATEGORICAL:
          {
            this.groups.fill(MAX_GROUPS);
            this.mesh.setVerticesBuffer(
              new VertexBuffer(
                this.scene.getEngine(),
                this.groups,
                'group',
                true,
                false,
                1
              )
            );

            const state = updateOptions.groupState?.get(
              updateOptions.feature.name
            );
            const categories = this.meshData[
              updateOptions.feature.name
            ] as Int32Array;

            if (state) {
              for (let index = 0; index < this.groups.length; ++index) {
                this.groups[index] = state.get(categories[index]) ?? MAX_GROUPS;
              }

              // 'updateVerticesData' accepts a a Float32Array which is not mandatory
              // since we have declated an int vertex attribute. This cast should be removed
              // once the BabylonJS library fixes that type issue.
              this.mesh.updateVerticesData('group', this.groups as any);
            }
          }
          break;
        default:
          throw new Error(`Unknown feature type ${updateOptions.feature.type}`);
      }
    }

    if (updateOptions.groupUpdate && this.activeFeature) {
      const categories = this.meshData[this.activeFeature.name];

      for (let index = 0; index < this.groups.length; ++index) {
        if (categories[index] === updateOptions.groupUpdate.categoryIndex) {
          this.groups[index] = updateOptions.groupUpdate.group;
        }
      }

      this.mesh.updateVerticesData('group', this.groups as any);
    }
  }

  public updateSelection(ids: bigint[]) {
    if (ids.length) {
      for (const id of ids) {
        if (!this.vertexMap.has(id)) {
          continue;
        }

        const index = this.vertexMap.get(id)!;
        this.state[index] = 1;
      }
    } else {
      this.state.fill(0);
    }

    if (this.scene.getEngine().isWebGPU) {
      this.mesh.setVerticesBuffer(
        new VertexBuffer(this.scene.getEngine(), this.state, 'state', {
          stride: 1,
          size: 1,
          instanced: true
        }),
        true
      );
    } else {
      this.mesh.updateVerticesData('state', this.state);
    }
  }

  public updatePicked(id: bigint, previousID?: bigint) {
    if (previousID) {
      const index = this.vertexMap.get(previousID)!;
      this.state[index] = 1;
    }

    const index = this.vertexMap.get(id)!;
    this.state[index] = 2;

    if (this.scene.getEngine().isWebGPU) {
      this.mesh.setVerticesBuffer(
        new VertexBuffer(this.scene.getEngine(), this.state, 'state', {
          size: 1,
          stride: 1,
          instanced: true
        }),
        true
      );
    } else {
      this.mesh.updateVerticesData('state', this.state);
    }
  }
}
