import { Mesh, VertexData, Scene } from '@babylonjs/core';
import { GeometryResponse } from '../../types';
import { PolygonShaderMaterial } from '../../materials/polygonShaderMaterial';
import { Tile, UpdateOptions } from '../tile';

export class GeometryTile extends Tile<GeometryResponse> {
  constructor(response: GeometryResponse, scene: Scene) {
    super(scene, response);

    const material = PolygonShaderMaterial(this.index.toString(), this.scene);

    this.mesh = new Mesh(this.index.toString(), this.scene);
    this.mesh.alwaysSelectAsActiveMesh = true;
    this.mesh.material = material;
    this.mesh.material.freeze();

    this.mesh.position.addInPlaceFromFloats(0, -10, 0);

    this.update({ response });
  }

  public update(updateOptions: UpdateOptions<GeometryResponse>) {
    if (updateOptions.response && updateOptions.response.positions.length) {
      const vertexData = new VertexData();

      vertexData.positions = updateOptions.response.positions;
      vertexData.colors = updateOptions.response.colors;
      vertexData.indices = updateOptions.response.indices;

      vertexData.applyToMesh(this.mesh, false);
    }
  }

  public dispose() {
    this.mesh.dispose(false, true);
  }
}
