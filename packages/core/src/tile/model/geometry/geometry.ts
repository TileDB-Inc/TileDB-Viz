import {
  Mesh,
  VertexData,
  Scene,
  RenderTargetTexture,
  VertexBuffer
} from '@babylonjs/core';
import { GeometryResponse } from '../../types';
import { PolygonShaderMaterial } from '../../materials/polygonShaderMaterial';
import { Tile, UpdateOptions } from '../tile';

export class GeometryTile extends Tile<GeometryResponse> {
  constructor(
    response: GeometryResponse,
    renderTarget: RenderTargetTexture,
    scene: Scene
  ) {
    super(scene, response);

    const material = PolygonShaderMaterial(this.index.toString(), this.scene);

    this.mesh.scaling.z = -1;
    this.mesh.layerMask = 3;
    this.mesh.renderingGroupId = 1;

    renderTarget.renderList?.push(this.mesh);
    renderTarget.setMaterialForRendering(this.mesh, material);

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

      vertexData.applyToMesh(this.mesh, false);

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
    }
  }
}
