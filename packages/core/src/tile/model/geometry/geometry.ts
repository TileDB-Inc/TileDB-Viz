import {
  VertexData,
  Scene,
  RenderTargetTexture,
  VertexBuffer,
  StandardMaterial,
  Color3,
  Color4,
  ShaderMaterial
} from '@babylonjs/core';
import { GeometryResponse, GeometryStyle, TypedArray } from '../../types';
import { PolygonShaderMaterial } from '../../materials/polygonShaderMaterial';
import { SelectionMaterialPlugin } from '../../materials/plugins/selectionPlugin';
import { Tile, UpdateOptions } from '../tile';
import { CategoricalMaterialPlugin } from '../../materials/plugins/categoricalPlugin';
import { Feature, FeatureType } from '@tiledb-inc/viz-common';

export interface GeometryUpdateOptions extends UpdateOptions<GeometryResponse> {
  style?: GeometryStyle;

  outlineThickness?: number;
  outlineColor?: Color3;

  fillOpacity?: number;
  fillColor?: Color3;

  groupUpdate?: { categoryIndex: number; group: number };
  groupState?: Map<string, Map<number, number>>;
  colorScheme?: Float32Array;
  renderingGroup?: number;

  feature?: Feature;
}

export class GeometryTile extends Tile<GeometryResponse> {
  private vertexMap: Map<bigint, number[]>;
  private categoricalPlugin;
  private groups!: Int32Array;
  private meshData: Record<string, TypedArray>;
  private vertexCount: number;
  private polygonPickingMaterial?: ShaderMaterial;

  constructor(
    assetID: string,
    updateOptions: GeometryUpdateOptions,
    renderTarget: RenderTargetTexture,
    scene: Scene
  ) {
    super(scene, updateOptions.response!, assetID);

    if (!this.scene.getEngine().isWebGPU) {
      this.polygonPickingMaterial = PolygonShaderMaterial(
        `${assetID}_${this.index.toString()}`,
        this.scene
      );
    }

    const material = new StandardMaterial(
      `standardPolygonMaterial_${assetID}`,
      this.scene
    );
    material.diffuseColor = new Color3(0, 0, 1);

    const selectionPlugin = new SelectionMaterialPlugin(material);
    selectionPlugin.isEnabled = true;

    this.categoricalPlugin = new CategoricalMaterialPlugin(
      material,
      updateOptions.feature!
    );
    this.categoricalPlugin.isEnabled = true;

    this.mesh.material = material;
    this.mesh.scaling.z = -1;
    this.mesh.layerMask = 0b1;
    this.mesh.renderingGroupId = 1;

    if (!this.scene.getEngine().isWebGPU) {
      renderTarget.renderList?.push(this.mesh);
      renderTarget.setMaterialForRendering(
        this.mesh,
        this.polygonPickingMaterial
      );
    }

    this.vertexMap = new Map<bigint, number[]>();
    this.meshData = {};
    this.vertexCount = 0;

    this.update(updateOptions);
  }

  public update(updateOptions: GeometryUpdateOptions) {
    if (
      updateOptions.response &&
      updateOptions.response.attributes['positions'].length
    ) {
      this.categoricalPlugin.colorScheme = updateOptions.colorScheme!;
      this.meshData = updateOptions.response.attributes;
      const vertexData = new VertexData();

      vertexData.positions = updateOptions.response.attributes[
        'positions'
      ] as Float32Array;
      vertexData.indices = updateOptions.response.attributes[
        'indices'
      ] as Int32Array;
      this.vertexCount = vertexData.positions.length / 3;
      this.groups = new Int32Array(this.vertexCount).fill(0);

      vertexData.applyToMesh(this.mesh, true);

      this.mesh.setVerticesBuffer(
        new VertexBuffer(
          this.scene.getEngine(),
          new Uint32Array(updateOptions.response.attributes['ids'].buffer),
          'id',
          false,
          false,
          2
        )
      );

      if (updateOptions.response.attributes['ids'].length) {
        const ids = updateOptions.response.attributes['ids'] as BigInt64Array;
        let lastID = ids[0];
        let currentId;
        let start = 0,
          size = 0;
        let index = 0;
        do {
          currentId = ids[index];

          if (lastID !== currentId) {
            this.vertexMap.set(lastID, [start, size]);
            start = index;
            size = 0;
          }

          lastID = currentId;
          ++size;
          ++index;
        } while (index < ids.length);
      }

      this.mesh.setVerticesBuffer(
        new VertexBuffer(
          this.scene.getEngine(),
          new Float32Array(updateOptions.response.attributes['ids'].length),
          'state',
          true,
          false,
          1
        )
      );

      this.mesh.enableEdgesRendering();
      this.mesh.edgesRenderer!.isEnabled = false;
    }

    if (updateOptions.renderingGroup) {
      this.mesh.renderingGroupId = updateOptions.renderingGroup;
    }

    if (updateOptions.feature) {
      switch (updateOptions.feature.type) {
        case FeatureType.FLAT_COLOR:
          this.categoricalPlugin.feature = updateOptions.feature;
          break;
        case FeatureType.CATEGORICAL:
          {
            this.groups.fill(32);
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
            this.categoricalPlugin.feature = updateOptions.feature;

            const state = updateOptions.groupState?.get(
              updateOptions.feature.name
            );
            const categories = this.meshData[
              this.categoricalPlugin.feature.name
            ] as Int32Array;

            if (state) {
              for (let index = 0; index < this.groups.length; ++index) {
                this.groups[index] = state.get(categories[index]) ?? 32;
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

    if (updateOptions.style) {
      this.mesh.material!.disableColorWrite = !(
        updateOptions.style & GeometryStyle.FILLED
      );

      if (this.mesh.edgesRenderer) {
        this.mesh.edgesRenderer.isEnabled = Boolean(
          updateOptions.style & GeometryStyle.OUTLINED
        );
      }
    }

    this.mesh.visibility = updateOptions.fillOpacity ?? this.mesh.visibility;
    this.mesh.edgesWidth =
      updateOptions.outlineThickness ?? this.mesh.outlineWidth;

    this.mesh.edgesColor = updateOptions.outlineColor
      ? Color4.FromColor3(updateOptions.outlineColor)
      : this.mesh.edgesColor;
    (this.mesh.material as StandardMaterial).diffuseColor =
      updateOptions.fillColor ??
      (this.mesh.material as StandardMaterial).diffuseColor;

    if (updateOptions.groupUpdate) {
      const categories = this.meshData[this.categoricalPlugin.feature.name];

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

        const [start, size] = this.vertexMap.get(id) ?? [0, -1];

        for (let i = start; i < start + size; ++i) {
          state[i] = 1;
        }
      }
    } else {
      state.fill(0);
    }

    this.mesh.updateVerticesData('state', state);
  }

  public updatePicked(id: bigint, previousID?: bigint) {
    const state = this.mesh.getVerticesData('state') ?? new Float32Array();

    if (previousID) {
      const [start, size] = this.vertexMap.get(previousID) ?? [0, -1];

      for (let i = start; i < start + size; ++i) {
        state[i] = 1;
      }
    }

    const [start, size] = this.vertexMap.get(id) ?? [0, -1];

    for (let i = start; i < start + size; ++i) {
      state[i] = 2;
    }

    this.mesh.updateVerticesData('state', state);
  }
}
