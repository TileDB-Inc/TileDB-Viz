import {
  Color3,
  Color4,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  PointsCloudSystem,
  Scene,
  SolidParticle,
  StandardMaterial,
  Vector3
} from '@babylonjs/core';

import { encodeMorton, Moctree, MoctreeBlock } from '../octree';
import { TileDBPointCloudOptions } from '../utils/tiledb-pc';
import {
  DataRequest,
  InitialRequest,
  SparseResult,
  WorkerType
} from './sparse-result';
import ParticleShaderMaterial from './particle-shader';

/**
 * The ArrayModel manages the client octree
 */
class ArrayModel {
  arrayName?: string;
  namespace?: string;
  octree!: Moctree;
  bufferSize: number;
  particleScale: number;
  rgbMax!: number;
  edlStrength: number;
  edlRadius: number;
  edlNeighbours: number;
  particleMaterial?: ParticleShaderMaterial;
  maxLevel: number;
  token?: string;
  refreshRate: number;
  particleType: string;
  particleSize: number;
  pickedBlockCode = -1;
  rayOrigin = Vector3.Zero();
  maxNumCacheBlocks: number;
  renderBlocks: MoctreeBlock[] = [];
  isBuffering = false;
  neighbours?: Generator<MoctreeBlock, undefined, undefined>;
  particleSystems: Map<number, PointsCloudSystem>;
  worker?: Worker;
  colorScheme?: string;
  particlePool: Array<SolidParticle> = [];
  debug = false;
  particleBudget: number;
  particleCount = 0;
  fanOut = 3;
  useShader = true;
  debugOctant: Mesh;
  debugOrigin: Mesh;
  isActive = false;
  scene?: Scene;

  constructor(options: TileDBPointCloudOptions) {
    this.arrayName = options.arrayName;
    this.namespace = options.namespace;
    this.token = options.token;
    this.bufferSize = options.bufferSize || 200000000;
    this.particleScale = options.particleScale || 0.001;
    this.maxLevel = options.maxLevels || 1;
    this.refreshRate = options.refreshRate || 5;
    this.particleType = options.particleType || 'box';
    this.particleSize = options.particleSize || 0.05;
    this.edlStrength = options.edlStrength || 4.0;
    this.edlRadius = options.edlRadius || 1.4;
    this.edlNeighbours = options.edlNeighbours || 8;
    this.colorScheme = options.colorScheme || 'blue';
    this.maxNumCacheBlocks = options.maxNumCacheBlocks || 100;
    this.particleBudget = options.numParticles || 500_000;
    this.fanOut = options.fanOut || 100;
    if (options.useShader === false) {
      this.useShader = false;
    }

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
    this.particleSystems = new Map<number, PointsCloudSystem>();
  }

  private loadSystem(block: MoctreeBlock) {
    const st = Date.now();
    if (block.entries !== undefined && this.scene) {
      if (!this.particleSystems.has(block.mortonNumber)) {
        console.log('LOAD SYSTEM: ' + block.mortonNumber);
        const transVector = block.bbox.getWorldMatrix().getTranslation();
        const transX = transVector.x;
        const transY = transVector.y;
        const transZ = transVector.z;
        const rgbMax = this.rgbMax;

        const numPoints = block.entries.X.length;
        console.log(
          'NUM POINTS: ' +
            numPoints +
            ' : total - ' +
            (this.particleCount + numPoints)
        );

        this.particleCount += numPoints;
        if (this.particleCount < this.particleBudget) {
          const pcs = new PointsCloudSystem(
            block.mortonNumber.toString(),
            this.particleSize,
            this.scene,
            {
              updatable: false
            }
          );

          const pointBuilder = function (particle: any, i: number) {
            if (block.entries !== undefined) {
              // set properties of particle
              particle.position.set(
                block.entries.X[i] - transX,
                block.entries.Z[i] - transY,
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
          pcs.addPoints(numPoints, pointBuilder);
          pcs.buildMeshAsync().then(() => {
            pcs.setParticles();
            this.particleSystems.set(block.mortonNumber, pcs);
            this.isActive = false;
          });
        } else {
          console.log('particle budget reached: ' + this.particleCount);
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

        // lru cache - reinsert this block
        this.octree.blocks.delete(block.mortonNumber);
        if (this.octree.blocks.size > this.maxNumCacheBlocks) {
          // simple lru cache, evict first key, this is fine as we are backed by local storage
          const k = this.octree.blocks.keys().next().value;
          this.octree.blocks.delete(k);

          // delete pcs corresponding to this key
          this.particleSystems.get(k)?.dispose();
          this.particleSystems.delete(k);
        }
        this.octree.blocks.set(block.mortonNumber, block);
      }
    }

    console.log('Time taken to load: ' + (Date.now() - st));
  }

  private onData(evt: MessageEvent) {
    let block = evt.data as MoctreeBlock;

    console.log('on data Block');
    console.log(block);

    // refresh block as it was serialized,
    block = new MoctreeBlock(
      block.lod,
      block.mortonNumber,
      new Vector3(block.minPoint._x, block.minPoint._y, block.minPoint._z),
      new Vector3(block.maxPoint._x, block.maxPoint._y, block.maxPoint._z),
      this.octree.bounds.getWorldMatrix().getTranslation().clone(),
      block.entries
    );

    console.log('Empty:');
    console.log(block.isEmpty);

    if (!block.isEmpty) {
      this.loadSystem(block);
    } else {
      // block along the ray can be empty
      this.isActive = false;
    }
  }

  private async fetchBlock(block: MoctreeBlock | undefined) {
    // fetch if not cached
    if (block) {
      console.log('Fetch Block');
      if (!block.isEmpty && !block.entries) {
        this.worker?.postMessage({
          type: WorkerType.data,
          block: block
        } as DataRequest);
      } else {
        // already have data
        console.log('Fetch cached Block');
        console.log(block);
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
    rgbMax?: number,
    data?: SparseResult
  ) {
    this.scene = scene;
    this.rgbMax = rgbMax || 65535;

    /**
     * EDL shader material
     */
    if (this.useShader) {
      this.particleMaterial = new ParticleShaderMaterial(
        scene,
        this.edlNeighbours,
        this.particleSize
      );
    }
    // centred on 0, 0, 0 with z being y
    const spanX = (xmax - xmin) / 2.0;
    const spanY = (ymax - ymin) / 2.0;

    const translationVector = new Vector3(xmin + spanX, zmin, ymin + spanY);
    this.octree = new Moctree(
      new Vector3(-spanX, 0, -spanY),
      new Vector3(spanX, zmax - zmin, spanY),
      translationVector,
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
        Vector3.Zero(),
        translationVector
      );
      block.entries = data;
      this.loadSystem(block);
      // no need to save entries for LOD 0
      block.entries = undefined;
    } else {
      this.worker = new Worker(
        new URL('../workers/tiledb.worker', import.meta.url),
        { type: 'module' }
      );
      this.worker.onmessage = this.onData.bind(this);
      this.worker.postMessage({
        type: WorkerType.init,
        namespace: this.namespace,
        token: this.token,
        arrayName: this.arrayName,
        translateX: translationVector.x,
        translateY: translationVector.y,
        translateZ: translationVector.z,
        bufferSize: this.bufferSize
      } as InitialRequest);

      scene.onAfterRenderObservable.add((scene: Scene) => {
        this.afterRender(scene);
      });
    }
    return scene;
  }

  public async fetchPoints(scene: Scene) {
    // fully load immutable layer
    const base = this.particleSystems.get(Moctree.startBlockIndex);
    if (base && base.nbParticles > 0) {
      // find centre point and load higher resolution around it
      // wait approximiately 60 seconds or move on
      if (scene.activeCamera && !this.isActive) {
        this.isActive = true;
        const ray = scene.activeCamera.getForwardRay();
        const epsilon = Math.pow(10, -12);

        // have we panned
        if (!ray.origin.equalsWithEpsilon(this.rayOrigin, epsilon)) {
          console.log('Origin changed');
          this.rayOrigin = ray.origin.clone();
          const parentBlocks = this.octree.getContainingBlocksByRay(
            ray,
            this.maxLevel - 1
          );

          if (parentBlocks.length > 0) {
            const pickCode = parentBlocks[0].mortonNumber;
            this.pickedBlockCode = pickCode;
            this.renderBlocks = parentBlocks;
            this.isBuffering = false;
            // restart count to base level as we are going to redraw
            this.particleCount = base.nbParticles;
            this.neighbours = this.octree.getNeighbours(this.pickedBlockCode);
          }
        }

        let block = this.renderBlocks.pop();

        // check block is in frustrum and not empty
        if (!block) {
          // we are buffering
          this.isBuffering = true;
          block = this.neighbours?.next().value;

          if (block && !scene.activeCamera.isInFrustum(block.bbox)) {
            while (
              block &&
              block.isEmpty &&
              !scene.activeCamera.isInFrustum(block.bbox)
            ) {
              block = this.neighbours?.next().value;
            }
          }
        }

        if (block) {
          this.fetchBlock(block);
        }
      }
    } else {
      // load immutable layer immediately
      if (!this.isActive) {
        this.isActive = true;
        this.fetchBlock(this.octree.blocks.get(Moctree.startBlockIndex));
      }
    }
  }

  set metadata(m: Map<string, number>) {
    // TODO change this format to send morton codes in the node metadata from the server
    m.forEach((v, k) => {
      const parts = k.split('-').map(Number);
      // swap z and y
      const morton = encodeMorton(
        new Vector3(parts[1], parts[3], parts[2]),
        parts[0]
      );
      this.octree.knownBlocks.set(morton, v);
    });
  }

  public afterRender(scene: Scene) {
    this.fetchPoints(scene);
  }
}

export default ArrayModel;
