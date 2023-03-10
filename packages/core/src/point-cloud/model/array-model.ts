import {
  Color4,
  MeshBuilder,
  PointsCloudSystem,
  Scene,
  SolidParticleSystem,
  SolidParticle,
  StandardMaterial,
  Vector3,
  Particle,
  Frustum,
  Camera
} from '@babylonjs/core';

import { AdvancedDynamicTexture, Rectangle, TextBlock } from '@babylonjs/gui';

import {
  decodeMorton,
  encodeMorton,
  getMortonRange,
  Moctree,
  MoctreeBlock
} from '../octree';
import {
  DataRequest,
  InitialRequest,
  SparseResult,
  WorkerType
} from './sparse-result';
import { ParticleShaderMaterial, TileDBPointCloudOptions } from '../utils';
import { TileDBWorkerPool } from '../workers';
import { getQueryDataFromCache } from '../../utils/cache';
import { ArraySchema } from '@tiledb-inc/tiledb-cloud/lib/v1';

/**
 * The ArrayModel manages the client octree
 */
class ArrayModel {
  groupName?: string;
  namespace?: string;
  arraySchema?: ArraySchema;
  octree!: Moctree;
  bufferSize: number;
  rgbMax!: number;
  translationVector!: Vector3;
  zScale: number;
  edlStrength: number;
  edlRadius: number;
  edlNeighbours: number;
  particleMaterial?: ParticleShaderMaterial;
  maxLevel?: number;
  token?: string;
  tiledbEnv?: string;
  pointType: string;
  pointSize: number;
  pickedBlockCode = -1;
  cameraHeight: number | undefined;
  maxNumCacheBlocks: number;
  renderBlocks: MoctreeBlock[] = [];
  isBuffering = false;
  neighbours?: Generator<MoctreeBlock, undefined, undefined>;
  basePcs?: SolidParticleSystem | PointsCloudSystem;
  particleSystems: Map<number, SolidParticleSystem | PointsCloudSystem>;
  workerPool?: TileDBWorkerPool;
  colorScheme?: string;
  debug = false;
  pointBudget: number;
  pointCount = 0;
  fanOut = 3;
  useShader = false;
  useStreaming = false;
  useSPS = false;
  scene?: Scene;
  poolSize: number;
  particleBuffer: SolidParticle[] = [];
  debugTexture?: AdvancedDynamicTexture;
  static groundName = 'ground';

  constructor(options: TileDBPointCloudOptions) {
    this.groupName = options.groupName;
    this.namespace = options.namespace;
    this.token = options.token;
    this.tiledbEnv = options.tiledbEnv;
    this.bufferSize = options.bufferSize || 200000000;
    this.pointType = options.pointType || 'box';
    this.pointSize = options.pointSize || 0.05;
    this.zScale = options.zScale || 1;
    this.edlStrength = options.edlStrength || 4.0;
    this.edlRadius = options.edlRadius || 1.4;
    this.edlNeighbours = options.edlNeighbours || 8;
    this.colorScheme = options.colorScheme || 'dark';
    this.maxNumCacheBlocks = options.maxNumCacheBlocks || 200;
    this.pointBudget = options.pointBudget || 500_000;
    this.fanOut = options.fanOut || 100;
    if (options.useShader === true) {
      this.useShader = true;
    }
    if (options.useSPS === true) {
      this.useSPS = true;
    }
    if (options.streaming === true) {
      this.useStreaming = true;
    }
    this.poolSize =
      options.workerPoolSize || navigator.hardwareConcurrency || 5;
    this.debug = options.debug || false;

    if (this.debug) {
      this.debugTexture = AdvancedDynamicTexture.CreateFullscreenUI('Debug UI');
    }

    this.particleSystems = new Map<
      number,
      SolidParticleSystem | PointsCloudSystem
    >();
  }

  private addDebugLabel(
    pcs: PointsCloudSystem | SolidParticleSystem,
    text: string
  ) {
    if (pcs && pcs.mesh && this.debugTexture) {
      pcs.mesh.showBoundingBox = true;

      // create a fixed size label
      const rect = new Rectangle();
      rect.width = '50px';
      rect.height = '50px';
      rect.cornerRadius = 20;
      rect.color = 'Orange';
      rect.thickness = 4;
      rect.background = 'green';
      this.debugTexture.addControl(rect);

      const label = new TextBlock();
      label.text = text;
      rect.addControl(label);

      rect.linkWithMesh(pcs.mesh);
      rect.linkOffsetY = -50;
    }
  }

  private loadSystem(block: MoctreeBlock) {
    if (
      block.entries !== undefined &&
      block.entries.X.length > 0 &&
      this.scene
    ) {
      // profiler is showing we don't need to check if the block is in frustrum but noting a possible optimization here
      if (!this.particleSystems.has(block.mortonNumber) || !this.basePcs) {
        const debugCoords = decodeMorton(block.mortonNumber);
        console.log(
          block.lod +
            ' ' +
            debugCoords.x +
            ' ' +
            debugCoords.z +
            ' ' +
            debugCoords.y
        );

        const transX = this.translationVector.x;
        const transY = this.translationVector.y;
        const transZ = this.translationVector.z;
        const rgbMax = this.rgbMax;
        const zScale = this.zScale;

        const numPoints = block.entries.X.length;

        this.pointCount += numPoints;

        // when streaming data, scale pointSize by LOD level
        let pointSize = this.pointSize;
        if (this.useStreaming) {
          pointSize = this.maxLevel
            ? this.pointSize * (block.lod / this.maxLevel)
            : this.pointSize;
        }

        const pointBuilder = function (particle: Particle, i: number) {
          if (block.entries !== undefined) {
            particle.position.set(
              block.entries.X[i] - transX,
              (block.entries.Z[i] - transY) * zScale,
              block.entries.Y[i] - transZ
            );

            if (particle.color) {
              particle.color.set(
                block.entries.Red[i] / rgbMax,
                block.entries.Green[i] / rgbMax,
                block.entries.Blue[i] / rgbMax,
                1
              );
            } else {
              particle.color = new Color4(
                block.entries.Red[i] / rgbMax,
                block.entries.Green[i] / rgbMax,
                block.entries.Blue[i] / rgbMax
              );
            }
          }
        };

        if (this.useSPS) {
          const sps = new SolidParticleSystem(
            block.mortonNumber.toString(),
            this.scene,
            { updatable: false }
          );

          const box = MeshBuilder.CreateBox(
            'b',
            { size: pointSize },
            this.scene
          );
          sps.computeBoundingBox = true;
          sps.addShape(box, numPoints, { positionFunction: pointBuilder });
          box.dispose();
          sps.buildMesh();

          if (this.debug && this.debugTexture && sps.mesh) {
            this.addDebugLabel(sps, block.mortonNumber.toString());
          }

          if (block.mortonNumber !== Moctree.startBlockIndex) {
            this.particleSystems.set(block.mortonNumber, sps);
          } else {
            this.basePcs = sps;
          }
        } else {
          const pcs = new PointsCloudSystem(
            block.mortonNumber.toString(),
            pointSize,
            this.scene,
            { updatable: false }
          );
          pcs.computeBoundingBox = true;
          pcs.addPoints(numPoints, pointBuilder);

          pcs.buildMeshAsync().then(() => {
            pcs.setParticles();
            if (block.mortonNumber !== Moctree.startBlockIndex) {
              this.particleSystems.set(block.mortonNumber, pcs);
            } else {
              this.basePcs = pcs;
            }
            if (this.debug && this.debugTexture && pcs.mesh) {
              this.addDebugLabel(pcs, block.mortonNumber.toString());
            }
          });
        }
      } else {
        // lru cache - reinsert this pcs
        if (block.mortonNumber !== Moctree.startBlockIndex) {
          const pcs = this.particleSystems.get(block.mortonNumber);
          if (pcs) {
            this.particleSystems.delete(block.mortonNumber);
            this.particleSystems.set(block.mortonNumber, pcs);
          }
        }
      }
    }
  }

  private dropParticleSystems(targetPointCount?: number, lessDetail?: boolean) {
    const candidates: Array<number> = [];

    const activeCamera: Camera | undefined = this.scene?.activeCameras?.find(
      (camera: Camera) => {
        return !camera.name.startsWith('GUI');
      }
    );

    if (this.scene && activeCamera) {
      const planes = Frustum.GetPlanes(activeCamera.getTransformationMatrix());

      if (targetPointCount && this.maxLevel) {
        // different style of dropping particle systems, we want to preserve the scene
        let n = 0;

        // sort by lod and drop high LoDs first
        const keys = [...this.particleSystems.keys()].sort(
          (a, b) => 0 - (a > b ? 1 : -1)
        );

        const highRange = getMortonRange(this.maxLevel - 1);
        for (const k in keys) {
          const code = keys[k];

          if (lessDetail) {
            if (code >= highRange.minMorton && code <= highRange.maxMorton) {
              // don't count towards point count, we are intentionally getting less detail
              candidates.push(code);
              continue;
            }
          }

          const pcs = this.particleSystems.get(code);

          if (pcs && pcs.mesh && !pcs.mesh.isInFrustum(planes)) {
            candidates.push(code);
            n += pcs.nbParticles;
            if (n > targetPointCount) {
              break;
            }
          }
        }
      } else {
        // simple lru cache, evict first key if not in frustum, this is fine as we are backed by local storage
        const k = this.particleSystems.keys().next().value;
        const pcs = this.particleSystems.get(k);
        const bounds = pcs?.mesh?.getBoundingInfo();
        if (pcs && bounds && !bounds.isInFrustum(planes)) {
          candidates.push(k);
        }
      }
    }

    candidates.map(k => {
      // delete pcs corresponding to this key
      const p = this.particleSystems.get(k);
      if (p) {
        this.pointCount -= p.nbParticles;
        p.dispose();
        this.particleSystems.delete(k);
      }
    }, this);
  }

  private async fetchBlock(block: MoctreeBlock | undefined) {
    if (block) {
      // check memory cache
      if (!this.particleSystems.has(block.mortonNumber)) {
        const queryCacheKey = block.mortonNumber;
        const storeName = `${this.namespace}:${this.groupName}`;
        // check indexeddb cache
        const dataFromCache = await getQueryDataFromCache(
          storeName,
          queryCacheKey
        );
        if (dataFromCache) {
          this.loadSystem(dataFromCache);
        } else {
          this.workerPool?.postMessage({
            type: WorkerType.data,
            block: block
          } as DataRequest);
        }
      } else {
        // already have data
        this.loadSystem(block);
      }
    }
  }

  public async init(
    scene: Scene,
    xmin: number,
    xmax: number,
    ymin: number,
    ymax: number,
    zmin: number,
    zmax: number,
    conformingBounds: number[],
    arraySchema?: ArraySchema,
    nLevels?: number,
    rgbMax?: number,
    data?: SparseResult
  ) {
    this.scene = scene;
    this.rgbMax = rgbMax || 65535;
    this.maxLevel = nLevels || 1;
    this.arraySchema = arraySchema;

    // centred on 0, 0, 0 with z being y
    const spanX = (xmax - xmin) / 2.0;
    const spanY = (ymax - ymin) / 2.0;
    this.translationVector = new Vector3(xmin + spanX, zmin, ymin + spanY);
    this.octree = new Moctree(
      new Vector3(-spanX, 0, -spanY),
      new Vector3(spanX, zmax - zmin, spanY),
      this.maxLevel,
      this.fanOut
    );
    this.neighbours = this.octree.getNeighbours(Moctree.startBlockIndex);

    // maintain compatibility with directly loading data
    if (data) {
      // load into first PCS
      const block = new MoctreeBlock(
        0,
        Moctree.startBlockIndex,
        Vector3.Zero(),
        Vector3.Zero()
      );
      block.entries = data;
      this.loadSystem(block);
      // no need to save entries for LOD 0
      block.entries = undefined;
    } else {
      // create a ground so we always having picking for panning the scene
      const ground = MeshBuilder.CreateGround(
        ArrayModel.groundName,
        {
          width: 2 * spanX,
          height: 2 * spanY
        },
        scene
      );

      ground.position = new Vector3(
        0,
        conformingBounds[4] - this.translationVector.y,
        0
      );

      ground.isVisible = true;
      // make the ground transparent and pickable
      const mat = new StandardMaterial('groundMaterial', scene);
      mat.alpha = 0;
      ground.material = mat;
      ground.isPickable = true;

      this.workerPool = new TileDBWorkerPool(
        {
          type: WorkerType.init,
          namespace: this.namespace,
          token: this.token,
          tiledbEnv: this.tiledbEnv,
          groupName: this.groupName,
          arraySchema: this.arraySchema,
          translateX: this.translationVector.x,
          translateY: this.translationVector.y,
          translateZ: this.translationVector.z,
          bufferSize: this.bufferSize
        } as InitialRequest,
        this.loadSystem.bind(this),
        this.poolSize
      );

      scene.onAfterRenderObservable.add((scene: Scene) => {
        this.afterRender(scene);
      });
    }
    return scene;
  }

  public async fetchPoints(
    scene: Scene,
    hasChanged?: boolean,
    lessDetail?: boolean
  ) {
    // fully load immutable layer
    if (this.basePcs && this.basePcs.nbParticles > 0) {
      // find centre point and load higher resolution around it
      if (this.workerPool?.isReady()) {
        if (this.pointCount <= this.pointBudget || hasChanged) {
          const activeCamera: Camera | undefined =
            this.scene?.activeCameras?.find((camera: Camera) => {
              return !camera.name.startsWith('GUI');
            });

          if (!activeCamera) {
            // nothing else to do
            return;
          }

          // check cache size, this is slightly different the point budget and refers to the number of particle systems and is a way to limit memory usage
          if (this.particleSystems.size > this.maxNumCacheBlocks) {
            this.dropParticleSystems();
          }

          // check we have initialized the scene
          if (hasChanged) {
            const ray = activeCamera.getForwardRay();
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const maxLevel = this.maxLevel! - 1;
            const parentBlocks = this.octree.getContainingBlocksByRay(
              ray,
              maxLevel
            );

            if (parentBlocks.length > 0) {
              const pickCode = parentBlocks[0].mortonNumber;
              this.pickedBlockCode = pickCode;
              this.renderBlocks = parentBlocks;
              this.isBuffering = false;
              this.neighbours = this.octree.getNeighbours(this.pickedBlockCode);
            }
          }

          // drop cache blocks if we are at the point budget, this is loose, if all blocks are in view we don't drop blocks but don't load any more as we have exceeded the point budget
          if (this.pointCount >= this.pointBudget) {
            const pointTargetCount = this.pointBudget / 4;
            this.dropParticleSystems(pointTargetCount, lessDetail);
          }

          if (this.pointCount < this.pointBudget) {
            let block = this.renderBlocks.pop();

            // check block is in frustrum and not empty
            if (!block && activeCamera) {
              const planes = Frustum.GetPlanes(
                activeCamera.getTransformationMatrix()
              );

              // we are buffering
              this.isBuffering = true;

              block = this.neighbours?.next().value;
              while (
                block &&
                !block.boundingInfo.isInFrustum(planes) // check the centre of each box
              ) {
                const g = this.neighbours?.next();
                if (g?.done) {
                  break;
                }
                block = this.neighbours?.next().value;
              }
            }

            if (block) {
              if (this.pointCount <= this.pointBudget) {
                this.fetchBlock(block);
              }
            }
          } else {
            // point budget reached
            console.log('particle budget reached: ' + this.pointCount);
          }
        }
      }
    } else {
      // load immutable layer immediately, we don't want to fire this off to multiple workers
      if (this.workerPool?.numActive() === 0) {
        await this.fetchBlock(
          new MoctreeBlock(
            0,
            Moctree.startBlockIndex,
            this.octree.minPoint,
            this.octree.maxPoint
          )
        );
        // initialize loading of blocks
        this.fetchPoints(scene, true);
      }
    }
  }

  set metadata(m: Map<string, number>) {
    // TODO change this format to send morton codes in the node metadata from the server
    m.forEach((v, k) => {
      if (!k.startsWith('_')) {
        const parts = k.split('-').map(Number);
        // swap z and y
        const morton = encodeMorton(
          new Vector3(parts[1], parts[3], parts[2]),
          parts[0]
        );
        this.octree.knownBlocks.set(morton, v);
      }
    });
  }

  public afterRender(scene: Scene) {
    this.fetchPoints(scene);
  }
}

export default ArrayModel;
