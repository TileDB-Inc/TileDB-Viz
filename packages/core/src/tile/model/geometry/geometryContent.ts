import {
  Color3,
  Color4,
  Mesh,
  Scene,
  StandardMaterial,
  UniformBuffer,
  VertexBuffer,
  VertexData
} from '@babylonjs/core';
import { TileContent, TileUpdateOptions } from '../tileContent';
import { GeometryStyle, Feature, FeatureType } from '@tiledb-inc/viz-common';
import { CategoricalMaterialPlugin } from '../../materials/plugins/categoricalPlugin';
import { Tile } from '../tile';
import { GeometryDataContent } from '../../../types';
import { TypedArray } from '../../types';

type GeometryData = {
  position: Float32Array;
  indices: Int32Array;
  ids?: BigInt64Array;
  attributes: Record<string, TypedArray>;
};

type GeometryStyleOptions = {
  style?: GeometryStyle;
  outlineThickness?: number;
  outline?: Color3;
  renderingGroup?: number;
};

export type GeometryUpdateOptions = TileUpdateOptions & {
  data?: GeometryData;
  UBO?: UniformBuffer;
  fillOpacity?: number;
  fill?: Color3;
  styleOptions?: GeometryStyleOptions;
  feature?: Feature;
  colorScheme?: Float32Array;
  groupMap?: Float32Array;
};

export class GeometryContent extends TileContent {
  private material: StandardMaterial;
  private categoricalPlugin: CategoricalMaterialPlugin;

  constructor(scene: Scene, tile: Tile<GeometryDataContent, GeometryContent>) {
    super(scene, tile);

    this.material = new StandardMaterial(tile.id.toString(), this.scene);
    this.material.backFaceCulling = false;

    this.categoricalPlugin = new CategoricalMaterialPlugin(this.material);
    this.categoricalPlugin.isEnabled = true;
  }

  public update(options: GeometryUpdateOptions): void {
    super.update(options);

    if (options.data) {
      this.onDataUpdate(options.data);
    }

    if (options.feature) {
      this.onFeatureUpdate(options);
    }

    if (options.styleOptions) {
      this.onStyleUpdate(options.styleOptions);
    }

    this.material.diffuseColor = options.fill ?? this.material.diffuseColor;
    this.material.alpha = options.fillOpacity ?? this.material.alpha;

    this.categoricalPlugin.colorScheme =
      options.colorScheme ?? this.categoricalPlugin.colorScheme;
    this.categoricalPlugin.groupMap =
      options.groupMap ?? this.categoricalPlugin.groupMap;
  }

  onFeatureUpdate(options: GeometryUpdateOptions) {
    const feature = options.feature!;
    this.categoricalPlugin.feature = feature;

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
                  updatable: true
                }
              )
            );
          }
        }
        break;
    }
  }

  private onDataUpdate(data: GeometryData): void {
    // Clear any pre-existing mesh
    for (const mesh of this.meshes) {
      mesh.dispose();
    }
    this.meshes = [];
    this.buffers = data.attributes;

    // Initialize new mesh
    const mesh = new Mesh(this.tile.id.toString(), this.scene);
    const vertexData = new VertexData();

    vertexData.positions = data.position;
    vertexData.indices = data.indices;
    vertexData.applyToMesh(mesh, false);

    mesh.material = this.material;
    mesh.layerMask = this.tile.mask;
    this.meshes.push(mesh);
  }

  private onStyleUpdate(options: GeometryStyleOptions) {
    if (options.style) {
      this.material.disableColorWrite = !(options.style & GeometryStyle.FILLED);
    }

    for (const mesh of this.meshes) {
      if (options.style) {
        if (options.style & GeometryStyle.OUTLINED) {
          for (const mesh of this.meshes) {
            mesh.enableEdgesRendering();
          }
        } else {
          for (const mesh of this.meshes) {
            mesh.disableEdgesRendering();
          }
        }
      }

      mesh.renderingGroupId = options.renderingGroup ?? 1;
      mesh.edgesColor = options.outline
        ? Color4.FromColor3(options.outline)
        : mesh.edgesColor;
      mesh.edgesWidth = options.outlineThickness ?? mesh.edgesWidth;
    }
  }
}
