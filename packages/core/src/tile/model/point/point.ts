import {
  VertexData,
  Scene,
  VertexBuffer,
  UniformBuffer,
  ShaderMaterial
} from '@babylonjs/core';
import { Feature, FeatureType } from '../../../types';
import { PointCloudMaterial } from '../../materials/pointShaderMaterial';
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
  protected material: ShaderMaterial;
  private groups!: Int32Array;
  private meshData: Record<string, TypedArray>;
  private vertexCount: number;
  private activeFeature?: Feature;
  private vertexMap: Map<bigint, number>;

  constructor(scene: Scene, response: PointResponse) {
    super(scene, response);

    this.material = PointCloudMaterial(this.scene);
    this.mesh.material = this.material;
    this.meshData = {};
    this.vertexCount = 0;
    this.mesh.layerMask = 0b1;
    this.mesh.renderingGroupId = 3;
    this.vertexMap = new Map<bigint, number>();

    this.update({ response });
  }

  public update(updateOptions: PointUpdateOptions): void {
    if (updateOptions.response) {
      this.meshData = updateOptions.response.attributes;
      const vertexData = new VertexData();

      vertexData.positions = updateOptions.response.attributes[
        'position'
      ] as Float32Array;
      vertexData.applyToMesh(this.mesh, false);

      this.vertexCount = vertexData.positions.length / 3;
      this.groups = new Int32Array(this.vertexCount).fill(0);

      if (updateOptions.response.attributes['Picking ID'].length) {
        const ids = updateOptions.response.attributes[
          'Picking ID'
        ] as BigInt64Array;
        this.vertexMap = new Map(
          Array.from(ids).map((value, index) => [value, index])
        );
      }

      this.mesh.setVerticesBuffer(
        new VertexBuffer(
          this.scene.getEngine(),
          new Float32Array(
            updateOptions.response.attributes['Picking ID'].length
          ),
          'state',
          true,
          false,
          1
        )
      );
    }

    if (updateOptions.pointOptions) {
      this.material.setUniformBuffer(
        'pointOptions',
        updateOptions.pointOptions
      );
    }

    if (updateOptions.pointShape) {
      this.material.setDefine(
        'POINT_TYPE',
        updateOptions.pointShape.toString()
      );
    }

    if (updateOptions.feature) {
      this.material.setDefine(
        'FEATURE_TYPE',
        updateOptions.feature.type.toString()
      );
      this.activeFeature = updateOptions.feature;

      switch (updateOptions.feature.type) {
        case FeatureType.FLAT_COLOR:
          //skip
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
    const state = this.mesh.getVerticesData('state') ?? new Float32Array();

    if (ids.length) {
      for (const id of ids) {
        if (!this.vertexMap.has(id)) {
          continue;
        }

        const index = this.vertexMap.get(id)!;
        state[index] = 1;
      }
    } else {
      state.fill(0);
    }

    this.mesh.updateVerticesData('state', state);
  }
}
