import {
  ComputeShader,
  Mesh,
  Scene,
  StorageBuffer,
  TransformNode,
  UniformBuffer,
  VertexBuffer,
  Matrix as BJSMatrix,
  WebGPUEngine
} from '@babylonjs/core';
import { TileContent, TileUpdateOptions } from '../tileContent';
import { Tile } from '../tile';
import { shaderBuilder } from '../../materials/shaders/compile';
import proj4 from 'proj4';
import { Matrix } from 'mathjs';

type TDB3DTileData = {
  meshes: Mesh[];
  transformation?: Matrix;
  sourceCRS?: string;
  targetCRS?: string;
};

export type TDB3DTileUpdateOptions = TileUpdateOptions & {
  UBO?: UniformBuffer;
  data?: TDB3DTileData;
};

export class TDB3DTileContent extends TileContent {
  constructor(scene: Scene, tile: Tile<string, TDB3DTileContent>) {
    super(scene, tile);
  }

  public update(options: TDB3DTileUpdateOptions): void {
    super.update(options);

    if (options.data) {
      this.onDataUpdate(options.data);
    }
  }

  private onDataUpdate(data: TDB3DTileData) {
    // Dispose old meshes
    for (const mesh of this.meshes) {
      mesh.dispose(false, true);
    }

    // Initialize compute shader for projecting the meshes
    const projectionShaderSource = `
      struct Params {
        transformation : mat4x4<f32>
      };

      @group(0) @binding(0) var<storage,read_write> position : array<f32>;
      @group(0) @binding(1) var<uniform> params : Params;

      ${
        data.targetCRS
          ? `${shaderBuilder(
              proj4.Proj(data.sourceCRS),
              proj4.Proj(data.targetCRS)
            )}`
          : 'fn project(point: vec3<f32>) -> vec3<f32> { return point; }'
      }

      @compute @workgroup_size(1, 1, 1)
      fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
        for (var i : u32 = 0u; i < arrayLength(&position); i = i + 3u) {

          // Switch from Y-up to Z-up
          var p: vec4<f32> = params.transformation * vec4<f32>(project(vec3<f32>(position[i], -position[i + 2], position[i + 1])), 1);

          // Switch from Z-up to Y-up
          position[i] = p[0];
          position[i + 1] = p[2];
          position[i + 2] = -p[1];
        }
      }
    `;

    const projectionShader = new ComputeShader(
      'projectionShader',
      this.scene.getEngine(),
      { computeSource: projectionShaderSource },
      {
        bindingsMapping: {
          position: { group: 0, binding: 0 },
          params: { group: 0, binding: 1 }
        }
      }
    );

    for (const mesh of data.meshes) {
      // If mesh has no material skip it as it is a transform node
      // or mesh with no renderable data
      if (mesh.material === null) {
        continue;
      }

      // Reset world matrix for each child mesh
      const worldMatrix = (mesh.parent as TransformNode)._localMatrix.clone();

      mesh.parent = null;
      mesh.resetLocalMatrix();

      if (mesh instanceof Mesh) {
        mesh.material.backFaceCulling = false;
        mesh.bakeTransformIntoVertices(worldMatrix);
      }

      const positions = mesh.getVerticesData(VertexBuffer.PositionKind);

      const positionBuffer = new StorageBuffer(
        this.scene.getEngine() as WebGPUEngine,
        (positions as Float32Array).byteLength
      );
      positionBuffer.update(positions as Float32Array);

      const params = new UniformBuffer(this.scene.getEngine());

      if (data.transformation) {
        // Transpose the matrix bewcause WebGPU expects the bata order to be column major
        params.addMatrix(
          'transformation',
          BJSMatrix.FromArray(
            data.transformation.toArray().flatMap(x => x) as number[]
          ).transpose()
        );
      } else {
        params.addMatrix('transformation', BJSMatrix.Identity());
      }
      params.update();

      projectionShader.setStorageBuffer('position', positionBuffer);
      projectionShader.setUniformBuffer('params', params);
      projectionShader.dispatchWhenReady(1).then(() => {
        positionBuffer.read().then(gpuResult => {
          mesh.setVerticesData(
            VertexBuffer.PositionKind,
            new Float32Array(gpuResult.buffer),
            false
          );
          mesh.refreshBoundingInfo();
          this.meshes.push(mesh);
        });
      });
    }
  }
}
