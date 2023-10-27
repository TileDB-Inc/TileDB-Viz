import {
  VertexData,
  Scene,
  RenderTargetTexture,
  VertexBuffer,
  StandardMaterial,
  Color3
} from '@babylonjs/core';
import { GeometryResponse } from '../../types';
import { PolygonShaderMaterial } from '../../materials/polygonShaderMaterial';
import { SelectionMaterialPlugin } from '../../materials/plugins/selectionPlugin';
import { Tile, UpdateOptions } from '../tile';

export class GeometryTile extends Tile<GeometryResponse> {
  private vertexMap: Map<bigint, number[]>;

  constructor(
    response: GeometryResponse,
    renderTarget: RenderTargetTexture,
    scene: Scene
  ) {
    super(scene, response);

    const polygonPickingMaterial = PolygonShaderMaterial(
      this.index.toString(),
      this.scene
    );

    const material = new StandardMaterial(
      'standardPolygonMaterial',
      this.scene
    );
    material.diffuseColor = new Color3(0, 0, 1);

    const selectionPlugin = new SelectionMaterialPlugin(material);
    selectionPlugin.isEnabled = true;

    this.mesh.material = material;
    this.mesh.scaling.z = -1;
    this.mesh.layerMask = 3;
    this.mesh.renderingGroupId = 1;

    renderTarget.renderList?.push(this.mesh);
    renderTarget.setMaterialForRendering(this.mesh, polygonPickingMaterial);

    this.vertexMap = new Map<bigint, number[]>();

    this.update({ response });
  }

  public update(updateOptions: UpdateOptions<GeometryResponse>) {
    if (updateOptions.response && updateOptions.response.positions.length) {
      const vertexData = new VertexData();

      vertexData.positions = updateOptions.response.positions;
      vertexData.indices = updateOptions.response.indices;

      if (updateOptions.response.normals) {
        vertexData.normals = updateOptions.response.normals;
      }

      vertexData.applyToMesh(this.mesh, true);

      this.mesh.setVerticesBuffer(
        new VertexBuffer(
          this.scene.getEngine(),
          new Uint32Array(updateOptions.response.ids.buffer),
          'id',
          false,
          false,
          2
        )
      );

      if (updateOptions.response.ids.length) {
        let lastID = updateOptions.response.ids[0];
        let currentId;
        let start = 0,
          size = 0;
        let index = 0;
        do {
          currentId = updateOptions.response.ids[index];

          if (lastID !== currentId) {
            this.vertexMap.set(lastID, [start, size]);
            start = index;
            size = 0;
          }

          lastID = currentId;
          ++size;
          ++index;
        } while (index < updateOptions.response.ids.length);
      }

      this.mesh.setVerticesBuffer(
        new VertexBuffer(
          this.scene.getEngine(),
          new Float32Array(updateOptions.response.ids.length),
          'state',
          true,
          false,
          1
        )
      );
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
