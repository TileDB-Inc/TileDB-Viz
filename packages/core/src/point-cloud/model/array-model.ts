import {
  Color3,
  Color4,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  PointsCloudSystem,
  Scene,
  SolidParticleSystem,
  SolidParticle,
  StandardMaterial,
  Vector3,
  Particle
} from '@babylonjs/core';

import { encodeMorton, Moctree, MoctreeBlock } from '../octree';
import {
  DataRequest,
  InitialRequest,
  SparseResult,
  WorkerType
} from './sparse-result';
import { ParticleShaderMaterial, TileDBPointCloudOptions } from '../utils';
import { TileDBWorkerPool } from '../workers';

/**
 * The ArrayModel manages the client octree
 */
class ArrayModel {
  groupName?: string;
  namespace?: string;
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
  rayOrigin = Vector3.Zero();
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
  debugOctant: Mesh;
  debugOrigin: Mesh;
  scene?: Scene;
  poolSize: number;
  particleBuffer: SolidParticle[] = [];

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
    this.poolSize = options.workerPoolSize || 5;
    this.debug = options.debug || false;

    this.debugOctant = MeshBuilder.CreateBox('debugOctant');
    this.debugOctant.visibility = 0;
    this.debugOctant.isPickable = false;
    const matOctantLabel = new DynamicTexture('debugOctantMatLabel', {
      width: 512,
      height: 256
    });

    const matOctant = new StandardMaterial('debugOctantMat');
    matOctant.diffuseTexture = matOctantLabel;
    matOctant.diffuseColor = Color3.Green();
    matOctant.alpha = 0.8;
    this.debugOctant.material = matOctant;

    this.debugOrigin = MeshBuilder.CreateSphere('debugOrigin', {
      diameter: 100
    });
    this.debugOrigin.visibility = 0;
    this.debugOrigin.isPickable = false;
    const matOrigin = new StandardMaterial('debugOriginMat');
    matOrigin.diffuseColor = Color3.Purple();
    matOrigin.alpha = 0.8;
    this.debugOrigin.material = matOrigin;
    this.particleSystems = new Map<
      number,
      SolidParticleSystem | PointsCloudSystem
    >();
  }

  private loadSystem(block: MoctreeBlock) {
    if (block.entries !== undefined && this.scene) {
      if (!this.particleSystems.has(block.mortonNumber) || !this.basePcs) {
        console.log(
          'received: ' +
            block.entries?.X.length +
            ' of approximately: ' +
            this.octree.knownBlocks.get(block.mortonNumber)
        );

        const transX = this.translationVector.x;
        const transY = this.translationVector.y;
        const transZ = this.translationVector.z;
        const rgbMax = this.rgbMax;
        const zScale = this.zScale;

        const numPoints = block.entries.X.length;

        this.pointCount += numPoints;

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
            { size: this.pointSize },
            this.scene
          );
          sps.addShape(box, numPoints, { positionFunction: pointBuilder });
          box.dispose();
          sps.buildMesh();

          if (block.mortonNumber !== Moctree.startBlockIndex) {
            this.particleSystems.set(block.mortonNumber, sps);
          } else {
            this.basePcs = sps;
          }
        } else {
          const pcs = new PointsCloudSystem(
            block.mortonNumber.toString(),
            this.pointSize,
            this.scene,
            { updatable: false }
          );

          pcs.addPoints(numPoints, pointBuilder);

          pcs.buildMeshAsync().then(() => {
            pcs.setParticles();
            if (block.mortonNumber !== Moctree.startBlockIndex) {
              this.particleSystems.set(block.mortonNumber, pcs);
            } else {
              this.basePcs = pcs;
            }
          });
        }

        if (this.debug) {
          // TODO make box colors configurable
          this.debugOctant.scaling = block.maxPoint.subtract(block.minPoint);
          this.debugOctant.position = block.minPoint.add(
            this.debugOctant.scaling.scale(0.5)
          );
          const label =
            this.debugOctant.material?.getActiveTextures()[0] as DynamicTexture;
          const font = 'bold 44px monospace';
          label.drawText(
            block.entries.X.length.toString(),
            72,
            135,
            font,
            'red',
            'white',
            true,
            true
          );
          this.debugOctant.visibility = 1;
          this.debugOrigin.visibility = 1;
        } else {
          this.debugOctant.visibility = 0;
          this.debugOrigin.visibility = 0;
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

  private dropLRUParticleSystem() {
    // simple lru cache, evict first key, this is fine as we are backed by local storage
    const k = this.particleSystems.keys().next().value;
    // delete pcs corresponding to this key
    const p = this.particleSystems.get(k);
    if (p) {
      this.pointCount -= p.nbParticles;
      p.dispose();
      this.particleSystems.delete(k);
    }
  }

  private async fetchBlock(block: MoctreeBlock | undefined) {
    // fetch if not populated
    if (block) {
      if (!block.entries) {
        this.workerPool?.postMessage({
          type: WorkerType.data,
          block: block
        } as DataRequest);
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
    nLevels?: number,
    rgbMax?: number,
    data?: SparseResult
  ) {
    this.scene = scene;
    this.rgbMax = rgbMax || 65535;
    this.maxLevel = nLevels || 1;

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
        'ground',
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

  public async fetchPoints(scene: Scene) {
    // fully load immutable layer
    if (this.basePcs && this.basePcs.nbParticles > 0) {
      // find centre point and load higher resolution around it
      if (scene.activeCamera && this.workerPool?.isReady()) {
        const ray = scene.activeCamera.getForwardRay();
        const epsilon = Math.pow(10, -12);

        // check cache size, this is different the point budget and refers the number of particle systems
        if (this.particleSystems.size > this.maxNumCacheBlocks) {
          this.dropLRUParticleSystem();
        }

        // have we panned
        if (!ray.origin.equalsWithEpsilon(this.rayOrigin, epsilon)) {
          this.rayOrigin = ray.origin.clone();
          const parentBlocks = this.octree.getContainingBlocksByRay(
            ray,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this.maxLevel! - 1
          );

          if (parentBlocks.length > 0) {
            const pickCode = parentBlocks[0].mortonNumber;
            this.pickedBlockCode = pickCode;
            this.renderBlocks = parentBlocks;
            this.isBuffering = false;
            this.neighbours = this.octree.getNeighbours(this.pickedBlockCode);
          }

          // drop cache blocks if we are at the point budget
          if (this.pointCount >= this.pointBudget) {
            const n = this.pointBudget / 2;
            while (this.pointCount > n) {
              this.dropLRUParticleSystem();
            }
          }
        }

        if (this.pointCount < this.pointBudget) {
          let block = this.renderBlocks.pop();

          // check block is in frustrum and not empty
          if (!block) {
            // we are buffering
            this.isBuffering = true;
            block = this.neighbours?.next().value;
            while (
              block &&
              !scene.activeCamera.isInFrustum(block.boundingInfo)
            ) {
              const g = this.neighbours?.next();
              if (g?.done) {
                break;
              }
              block = this.neighbours?.next().value;
            }
          }

          if (block) {
            const nextPointCount = this.octree.knownBlocks.get(
              block.mortonNumber
            );

            if (
              nextPointCount &&
              this.pointCount + nextPointCount <= this.pointBudget
            ) {
              this.fetchBlock(block);
            }
          }
        } else {
          // point budget reached
          console.log('particle budget reached: ' + this.pointCount);
        }
      }
    } else {
      // load immutable layer immediately, we don't want to fire this off to multiple workers
      if (this.workerPool?.numActive() === 0) {
        this.fetchBlock(
          new MoctreeBlock(
            0,
            Moctree.startBlockIndex,
            this.octree.minPoint,
            this.octree.maxPoint
          )
        );
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
