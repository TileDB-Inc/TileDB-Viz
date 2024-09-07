import {
  Color4,
  Mesh,
  Nullable,
  Scene,
  ShaderMaterial,
  UniformBuffer,
  Vector4,
  VertexBuffer,
  VertexData
} from '@babylonjs/core';
import { ISelectable, TileContent, TileUpdateOptions } from '../tileContent';
import { GeometryStyle, Feature, FeatureType } from '@tiledb-inc/viz-common';
import { Tile } from '../tile';
import { GeometryDataContent } from '../../../types';
import { TypedArray } from '../../types';
import { GeometryIntersector } from './geometryIntersector';
import {
  PolygonShaderMaterialWebGL,
  PolygonShaderMaterialWebGPU
} from '../../materials/polygonShaderMaterial';

type GeometryData = {
  position: Float32Array;
  indices: Int32Array;
  ids?: BigInt64Array;
  attributes: Record<string, TypedArray>;
};

type GeometrySelection = {
  indices?: number[];
  pick?: { current: [number, number]; previous: [number, number] };
};

type GeometryStyleOptions = {
  style?: GeometryStyle;
  outlineThickness?: number;
  outline?: Vector4;
  renderingGroup?: number;
};

export type GeometryUpdateOptions = TileUpdateOptions & {
  data?: GeometryData;
  UBO?: UniformBuffer;
  styleOptions?: GeometryStyleOptions;
  feature?: Feature;
  selection?: GeometrySelection;
};

export class GeometryContent
  extends TileContent
  implements ISelectable<GeometryUpdateOptions>
{
  private material: Nullable<ShaderMaterial>;

  constructor(scene: Scene, tile: Tile<GeometryDataContent, GeometryContent>) {
    super(scene, tile);

    this.material = null;
    this.intersector = new GeometryIntersector(this);
  }

  public update(options: GeometryUpdateOptions): void {
    super.update(options);

    if (options.data) {
      this.onDataUpdate(options.data);
    }

    if (options.feature) {
      this.onFeatureUpdate(options.feature);

      if (this.scene.getEngine().isWebGPU) {
        this.material = PolygonShaderMaterialWebGPU(
          this.scene,
          options.feature.type
        );
      } else {
        if (!this.material) {
          this.material = PolygonShaderMaterialWebGL(this.scene);
        }

        this.material.setDefine(
          'FEATURE_TYPE',
          options.feature.type.toString()
        );
      }

      for (const mesh of this.meshes) {
        mesh.material = this.material;
      }
    }

    if (options.styleOptions) {
      this.onStyleUpdate(options.styleOptions);
    }

    if (options.selection) {
      this.onSelectionUpdate(options.selection);
    }

    if (options.UBO) {
      this.material?.setUniformBuffer('polygonOptions', options.UBO);
    }
  }

  onFeatureUpdate(feature: Feature) {
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
    this.ids = data.ids;

    this.meshes = [];
    this.buffers = data.attributes;
    this.buffers['state'] = new Uint8Array(data.position.length).fill(0);
    this.buffers['position'] = data.position;
    this.buffers['indices'] = data.indices;

    // Initialize new mesh
    const mesh = new Mesh(this.tile.id.toString(), this.scene);
    const vertexData = new VertexData();

    vertexData.positions = data.position;
    vertexData.indices = data.indices;
    vertexData.applyToMesh(mesh, false);

    mesh.setVerticesBuffer(
      new VertexBuffer(this.scene.getEngine(), this.buffers['state'], 'state', {
        size: 1,
        stride: 1,
        instanced: false,
        type: VertexBuffer.UNSIGNED_BYTE,
        updatable: true
      })
    );

    mesh.layerMask = this.tile.mask;
    this.meshes.push(mesh);
  }

  private onStyleUpdate(options: GeometryStyleOptions) {
    if (options.style && this.material) {
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

      mesh.renderingGroupId = options.renderingGroup ?? mesh.renderingGroupId;
      if (options.outline) {
        Color4.FromArrayToRef(options.outline.asArray(), 0, mesh.edgesColor);
      }
      mesh.edgesWidth = options.outlineThickness ?? mesh.edgesWidth;
    }
  }

  private onSelectionUpdate(selection: GeometrySelection) {
    const state = this.buffers['state'] as Uint8Array;
    const indices = this.buffers['indices'] as Int32Array | undefined;

    if (!indices) {
      return;
    }

    if (selection.indices && selection.indices.at(0) === -1) {
      state.fill(0);

      // @ts-expect-error Update vertices data expects only Float arrays but should expect anything
      this.meshes[0].updateVerticesData('state', state);

      return;
    }

    for (const idx of selection.indices ?? []) {
      state[idx] = 1;
    }

    if (selection.pick) {
      for (
        let idx = selection.pick.current[0];
        idx < selection.pick.current[1];
        ++idx
      ) {
        state[indices[idx]] = 2;
      }

      for (
        let idx = selection.pick.previous[0];
        idx < selection.pick.previous[1];
        ++idx
      ) {
        state[indices[idx]] = 1;
      }
    }

    // @ts-expect-error Update vertices data expects only Float arrays but should expect anything
    this.meshes[0].updateVerticesData('state', state);
  }
}
