import {
  AbstractMesh,
  ArcRotateCamera,
  Camera,
  ComputeShader,
  Constants,
  Effect,
  Frustum,
  HemisphericLight,
  Matrix,
  Mesh,
  Scene,
  SceneLoader,
  StorageBuffer,
  Vector3,
  VertexBuffer,
  VertexData
} from '@babylonjs/core';
import { Manager } from '../manager';
import { Block, TilesMetadata } from '@tiledb-inc/viz-common';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { TDB3DTile } from './3DTile';
import { load3DTileset } from '../../../utils/metadata-utils/3DTiles/3DTileLoader';
import { shaderBuilder } from '../../materials/shaders/compile';
import proj4 from 'proj4';
import { inv, matrix } from 'mathjs';
import { PriorityQueue } from '@tiledb-inc/viz-common';

interface TileOptions {
  metadata: TilesMetadata<TDB3DTile>;
  transformation: number[];
  baseCRS: string;
}

enum TileStatus {
  LOADING = 1,
  VISIBLE = 2
}

export class TileManager extends Manager<any> {
  private status: Map<string, TileStatus>;
  private sseThreshold: number;
  private metadata: TilesMetadata<TDB3DTile>;
  private tranformation: number[];
  private baseCRS: string;
  private compute?: ComputeShader;

  constructor(
    scene: Scene,
    workerPool: WorkerPool,
    tileSize: number,
    tileOptions: TileOptions
  ) {
    super(scene, workerPool, 0, 0, 0);

    this.metadata = tileOptions.metadata;
    this.tranformation = tileOptions.transformation;
    this.baseCRS = tileOptions.baseCRS;
    this.status = new Map<string, TileStatus>();
    this.sseThreshold = 15;
    new HemisphericLight('Skylight', new Vector3(0, 1, 0.1), this.scene);

    if (this.scene.getEngine().isWebGPU && tileOptions.baseCRS) {
      const inverse = inv(
        matrix([
          [this.tranformation[1], 0, 0, this.tranformation[0]],
          [0, this.tranformation[5], 0, this.tranformation[3]],
          [0, 0, this.tranformation[1], 0],
          [0, 0, 0, 1]
        ])
      );

      const projectionComputeShader = `
          @group(0) @binding(0) var<storage,read_write> position : array<f32>;
          @group(0) @binding(1) var<storage, read> transformation : mat4x4<f32>;

          const projection : mat4x4<f32> = mat4x4<f32>(vec4<f32>(${inverse.get([
            0, 0
          ])}, 0, 0, 0), vec4<f32>(0, ${inverse.get([
        1, 1
      ])}, 0, 0), vec4<f32>(0, 0, ${inverse.get([
        2, 2
      ])}, 0), vec4<f32>(${inverse.get([0, 3])}, ${inverse.get([1, 3])}, 0, 1));

          ${shaderBuilder(
            proj4.Proj(
              '+proj=geocent +datum=WGS84 +units=m +no_defs +type=crs'
            ),
            proj4.Proj(tileOptions.baseCRS)
          )}

          @compute @workgroup_size(1, 1, 1)
          fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
            for (var i : u32 = 0u; i < arrayLength(&position); i = i + 3u) {

              let transformedPosition2: vec4<f32> = transformation * vec4<f32>(position[i], position[i + 1], position[i + 2], 1);
              let transformedPosition: vec4<f32> = vec4<f32>(position[i], position[i + 1], position[i + 2], 1);
              var p: vec4<f32> = projection * vec4<f32>(project(vec3<f32>(-transformedPosition.x, -transformedPosition.z, transformedPosition.y)), 1);

              position[i] = p[0];
              position[i + 1] = p[2];
              position[i + 2] = -p[1];
            }
          }
        `;

      this.compute = new ComputeShader(
        'projectionShader',
        this.scene.getEngine(),
        { computeSource: projectionComputeShader },
        {
          bindingsMapping: {
            position: { group: 0, binding: 0 },
            transformation: { group: 0, binding: 1 }
          }
        }
      );
    }
  }

  public loadTiles(camera: ArcRotateCamera, zoom: number): void {
    const frustrum = Frustum.GetPlanes(camera.getTransformationMatrix());

    // const tiles: TDB3DTile[] = [this.metadata.root];
    const tiles: PriorityQueue<TDB3DTile> = new PriorityQueue<TDB3DTile>(100);
    tiles.insert(
      screenSpaceError(
        this.metadata.root.geometricError,
        this.scene.activeCamera as Camera,
        this.scene
      ),
      this.metadata.root
    );
    while (!tiles.isEmpty()) {
      const block: Block<TDB3DTile> = tiles.extractMax();
      const [tile, sse] = [block.data, block.score];

      // Invalid BVH Node
      if (!tile) {
        console.warn('Invalid 3D tile BVH node');
        continue;
      }

      // Calculate screen space error of tile
      if (!tile.boundingInfo.isInFrustum(frustrum)) {
        continue;
      }

      if (sse > this.sseThreshold) {
        for (const child of tile.children) {
          tiles.insert(
            screenSpaceError(
              child.geometricError,
              this.scene.activeCamera as Camera,
              this.scene
            ),
            child
          );
        }
      }

      for (const uri of tile.contents) {
        if (this.status.has(uri)) {
          continue;
        }

        this.status.set(uri, TileStatus.LOADING);

        if (uri.endsWith('.json')) {
          load3DTileset(this.metadata.baseUrl + uri, {
            sourceCRS: '+proj=geocent +datum=WGS84 +units=m +no_defs +type=crs',
            targetCRS: this.baseCRS,
            transformation: this.tranformation
          }).then(x => {
            tile.children = x.root.children;
            this.status.set(uri, TileStatus.VISIBLE);
          });
        } else {
          SceneLoader.ImportMeshAsync(
            '',
            this.metadata.baseUrl,
            uri,
            this.scene
          )
            .then(x => {
              this.status.set(uri, TileStatus.VISIBLE);

              const meshes: Mesh[] = [];

              for (const mesh of x.meshes) {
                if (mesh.material === null) {
                  continue;
                }

                meshes.push(mesh as Mesh);
              }

              //return meshes;
              return Mesh.MergeMeshesAsync(
                meshes,
                true,
                true,
                undefined,
                undefined,
                true
              );
            })
            .then((mesh: Mesh) => {
              mesh.bakeCurrentTransformIntoVertices();
              const transformationBuffer = new StorageBuffer(
                this.scene.getEngine(),
                Float32Array.BYTES_PER_ELEMENT * 16
              );
              transformationBuffer.update(
                new Float32Array(mesh.computeWorldMatrix(true).asArray())
              );

              mesh.resetLocalMatrix();

              const data = mesh.getVerticesData(VertexBuffer.PositionKind);

              const positionBuffer = new StorageBuffer(
                this.scene.getEngine(),
                (data as Float32Array).byteLength
              );
              positionBuffer.update(data as Float32Array);

              this.compute?.setStorageBuffer('position', positionBuffer);

              this.compute?.setStorageBuffer(
                'transformation',
                transformationBuffer
              );
              this.compute?.dispatchWhenReady(1).then(() => {
                positionBuffer.read().then(result => {
                  mesh.name = tile.id.toString();
                  mesh.setVerticesData(
                    VertexBuffer.PositionKind,
                    new Float32Array(result.buffer)
                  );
                  (mesh as Mesh).refreshBoundingInfo();
                });
              });
            })
            .catch(x => console.log(x));
        }
      }
    }
  }

  public initializeGUIProperties(): void {}
}

function screenSpaceError(
  geometricError: number,
  camera: Camera,
  scene: Scene
): number {
  if (camera.mode == Camera.ORTHOGRAPHIC_CAMERA) {
    const pixelSize =
      Math.max(
        camera.orthoTop! - camera.orthoBottom!,
        camera.orthoRight! - camera.orthoLeft!
      ) /
      Math.max(
        scene.getEngine().getRenderWidth(),
        scene.getEngine().getRenderHeight()
      );

    return geometricError / pixelSize;
  } else {
    return 100; // TODO
  }
}
