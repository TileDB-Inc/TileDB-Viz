import {
  ArcRotateCamera,
  Camera,
  ComputeShader,
  Frustum,
  HemisphericLight,
  Mesh,
  Scene,
  SceneLoader,
  StorageBuffer,
  Vector3,
  VertexBuffer,
  TransformNode
} from '@babylonjs/core';
import { Manager, TileStatus } from '../manager';
import { Block, TileState, TilesMetadata } from '@tiledb-inc/viz-common';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { TDB3DTile } from './3DTile';
import { load3DTileset } from '../../../utils/metadata-utils/3DTiles/3DTileLoader';
import { shaderBuilder } from '../../materials/shaders/compile';
import proj4 from 'proj4';
import { inv, matrix } from 'mathjs';
import { PriorityQueue } from '@tiledb-inc/viz-common';
import { GUIEvent } from '@tiledb-inc/viz-common';
import { Events, SliderProps } from '@tiledb-inc/viz-components';
import { TilePanelInitializationEvent } from '@tiledb-inc/viz-common';

interface TileOptions {
  metadata: TilesMetadata<TDB3DTile>;
  transformation?: number[];
  baseCRS?: string;
}

export class TileManager extends Manager<any> {
  private sseThreshold: number;
  private metadata: TilesMetadata<TDB3DTile>;
  private transformation: number[];
  private baseCRS?: string;
  private compute?: ComputeShader;
  private visibility: number;

  constructor(
    scene: Scene,
    workerPool: WorkerPool,
    tileSize: number,
    tileOptions: TileOptions
  ) {
    super(scene, workerPool, 0, 0, 0);

    this.metadata = tileOptions.metadata;
    this.baseCRS = tileOptions.baseCRS;
    this.transformation = tileOptions.transformation ?? [0, 1, 0, 0, 0, 1];
    this.sseThreshold = 15;
    this.visibility = 1;
    new HemisphericLight('Skylight', new Vector3(0, 1, 0.1), this.scene);

    if (this.scene.getEngine().isWebGPU) {
      //Decide whether a projection compute step is required
      const inverse = inv(
        matrix([
          [this.transformation[1], 0, 0, this.transformation[0]],
          [0, this.transformation[5], 0, this.transformation[3]],
          [0, 0, this.transformation[1], 0],
          [0, 0, 0, 1]
        ])
      );

      const projectionComputeShader = `
          @group(0) @binding(0) var<storage,read_write> position : array<f32>;

          const transformation : mat4x4<f32> = mat4x4<f32>(vec4<f32>(${inverse.get(
            [0, 0]
          )}, 0, 0, 0), vec4<f32>(0, ${inverse.get([
        1, 1
      ])}, 0, 0), vec4<f32>(0, 0, ${inverse.get([
        2, 2
      ])}, 0), vec4<f32>(${inverse.get([0, 3])}, ${inverse.get([1, 3])}, 0, 1));

        ${
          this.baseCRS
            ? `
        ${shaderBuilder(
          proj4.Proj('+proj=geocent +datum=WGS84 +units=m +no_defs +type=crs'),
          proj4.Proj(tileOptions.baseCRS)
        )}
        `
            : 'fn project(point: vec3<f32>) -> vec3<f32> { return point; }'
        }

          @compute @workgroup_size(1, 1, 1)
          fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
            for (var i : u32 = 0u; i < arrayLength(&position); i = i + 3u) {

              // Switch from Y-up to Z-up
              var p: vec4<f32> = transformation * vec4<f32>(project(vec3<f32>(position[i], -position[i + 2], position[i + 1])), 1);

              // Switch from Z-up to Y-up
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
            position: { group: 0, binding: 0 }
          }
        }
      );
    }

    this.setupEventListeners();
  }

  public loadTiles(camera: ArcRotateCamera, zoom: number): void {
    for (const [_, status] of this.tileStatus) {
      status.evict = true;
    }

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
        const status =
          this.tileStatus.get(uri) ??
          ({ evict: false, nonce: 0 } as TileStatus<any>);
        status.evict = false;

        if (status.state) {
          continue;
        }

        status.state = TileState.LOADING;
        this.tileStatus.set(uri, status);

        if (uri.endsWith('.json')) {
          load3DTileset(this.metadata.baseUrl + uri, {
            sourceCRS: '+proj=geocent +datum=WGS84 +units=m +no_defs +type=crs',
            targetCRS: this.baseCRS,
            transformation: this.transformation
          }).then(x => {
            tile.children = x.root.children;
            status.state = TileState.VISIBLE;
          });
        } else {
          SceneLoader.ImportMeshAsync(
            '',
            this.metadata.baseUrl,
            uri,
            this.scene
          )
            .then(x => {
              const meshes: Mesh[] = [];

              for (const mesh of x.meshes) {
                if (mesh.material === null) {
                  continue;
                }

                meshes.push(mesh as Mesh);

                const worldMatrix = (
                  mesh.parent as TransformNode
                )._localMatrix.clone();

                mesh.parent = null;
                mesh.resetLocalMatrix();

                if (mesh instanceof Mesh) {
                  mesh.material.backFaceCulling = false;
                  mesh.bakeTransformIntoVertices(worldMatrix);
                }
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
              const data = mesh.getVerticesData(VertexBuffer.PositionKind);

              const positionBuffer = new StorageBuffer(
                this.scene.getEngine(),
                (data as Float32Array).byteLength
              );
              positionBuffer.update(data as Float32Array);

              this.compute?.setStorageBuffer('position', positionBuffer);
              this.compute?.dispatchWhenReady(1).then(() => {
                positionBuffer.read().then(result => {
                  mesh.name = tile.id.toString();
                  mesh.setVerticesData(
                    VertexBuffer.PositionKind,
                    new Float32Array(result.buffer)
                  );
                  mesh.refreshBoundingInfo();
                  mesh.visibility = this.visibility;
                  tile.mesh = mesh;
                  status.state = TileState.VISIBLE;
                  status.tile = tile;
                });
              });
            })
            .catch(x => console.log(x));
        }
      }
    }

    for (const key of this.tileStatus.keys()) {
      const status = this.tileStatus.get(key);

      if (!status?.evict) {
        continue;
      }

      if (status.state !== TileState.VISIBLE) {
        // Currently we are not cancelling pending tiles
        continue;
      }

      this.tileStatus.delete(key);

      // Currently we are not cancelling pending tiles
      if (status.state === TileState.VISIBLE) {
        (status.tile as TDB3DTile)?.mesh?.dispose();
      }
    }
  }

  public setupEventListeners(): void {
    window.addEventListener(
      Events.SLIDER_CHANGE,
      this.sliderHandler.bind(this) as any,
      { capture: true }
    );
  }

  public sliderHandler(event: CustomEvent<GUIEvent<SliderProps>>): void {
    const target = event.detail.target.split('_');

    if (target[0] !== this.metadata.id) {
      return;
    }

    switch (target[1]) {
      case 'opacity':
        this.visibility = event.detail.props.value;
        for (const status of this.tileStatus.values()) {
          const tile = status.tile as TDB3DTile | undefined;

          if (tile?.mesh === undefined) {
            continue;
          }

          tile.mesh.visibility = this.visibility;
        }
        break;
    }
  }

  public initializeGUIProperties(): void {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<TilePanelInitializationEvent>>(
        Events.INITIALIZE,
        {
          bubbles: true,
          detail: {
            target: 'tile-panel',
            props: {
              id: this.metadata.id,
              name: this.metadata.name,
              sourceCRS: {
                name: 'Source CRS',
                id: 'sourceCRS',
                entries: [
                  { value: 0, name: 'EPSG 4978' },
                  { value: 1, name: 'Native' }
                ],
                default: 0
              },
              sseThreshold: {
                name: 'SSE Threshold',
                id: 'sseThreshold',
                min: 1,
                max: 100,
                default: 15,
                step: 1
              },
              opacity: {
                name: 'Opacity',
                id: 'opacity',
                min: 0,
                max: 1,
                default: 1,
                step: 0.01
              }
            }
          }
        }
      )
    );
  }
}

function screenSpaceError(
  geometricError: number,
  camera: Camera,
  scene: Scene
): number {
  if (camera.mode === Camera.ORTHOGRAPHIC_CAMERA) {
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
