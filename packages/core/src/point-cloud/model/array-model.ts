import {
  Color3,
  Color4,
  Material,
  MeshBuilder,
  Ray,
  RayHelper,
  Scene,
  SolidParticle,
  SolidParticleSystem,
  Vector3
} from '@babylonjs/core';

import { GridMaterial } from '@babylonjs/materials';

import { Moctree, MoctreeBlock, HTree8, HTBlock } from '../octree';
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
  htree!: HTree8;
  bufferSize: number;
  particleScale: number;
  minVector!: Vector3;
  maxVector!: Vector3;
  rgbMax!: number;
  edlStrength: number;
  edlRadius: number;
  edlNeighbours: number;
  shaderMaterial?: ParticleShaderMaterial;
  maxLevel: number;
  token?: string;
  frame = 0;
  refreshRate: number;
  particleType: string;
  particleSize: number;
  translateX = 0;
  translateY = 0;
  translateZ = 0;
  pickedBlockCode = -1;
  maxNumCacheBlocks: number;
  numGridSubdivisions: number;
  // renderBlocks: MoctreeBlock[] = [];
  renderBlocks: HTBlock[] = [];
  // renderedBlocks: MoctreeBlock[] = [];
  renderedBlocks: HTBlock[] = [];
  isBuffering = false;
  // neighbours?: Generator<MoctreeBlock, undefined, undefined>;
  neighbours?: Generator<HTBlock, undefined, undefined>;
  particleSystems: SolidParticleSystem[] = [];
  worker?: Worker;
  colorScheme?: string;
  particlePool: Array<SolidParticle> = [];
  debug = false;
  rayHelper?: RayHelper;
  particleBudget: number;
  count = 0;
  fanOut = 3;

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
    this.numGridSubdivisions = options.numGridSubdivisions || 10;
    this.particleBudget = options.numParticles || 2_000_000;
    this.fanOut = options.fanOut || 3;
  }

  private loadSystem(index: number, block: HTBlock) {
    // for now lets print the debug to show we are loading data
    console.log(
      'Loading: ' + index
      // ' LOD: ' +
      // block.lod +
      // ' Morton: ' +
      // block.mortonNumber
    );

    const buffering = this.isBuffering ? true : false;
    if (this.isBuffering) {
      console.log('Loading additional');
      console.log(block.entries?.X.length);
    }

    if (block.entries !== undefined) {
      const trans_x = this.translateX;
      const trans_y = this.translateY;
      const trans_z = this.translateZ;
      const rgbMax = this.rgbMax;
      const sps = this.particleSystems[index];
      let numPoints = block.entries.X.length;

      // increase particle point size for higher LODs
      const r =
        (this.particleSize + index * this.particleScale) / this.particleSize;

      this.count += numPoints;

      const pointBuilder = function (particle: SolidParticle, i: number) {
        if (block.entries !== undefined) {
          // set properties of particle
          particle.scaling = new Vector3(r, r, r);

          particle.position.set(
            block.entries.X[i] - trans_x,
            block.entries.Z[i] - trans_y,
            block.entries.Y[i] - trans_z
          );

          if (buffering) {
            if (particle.color) {
              particle.color.set(1, 0, 0, 1);
            } else {
              particle.color = new Color4(1, 0, 0);
            }
          } else {
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
        }
      };

      if (index === 0) {
        // immutable SPS for LoD 0
        const particle = MeshBuilder.CreateBox(this.particleType, {
          size: this.particleSize
        });
        particle.material = this.shaderMaterial?.shaderMaterial as Material;
        // bbox is created by using position function - https://doc.babylonjs.com/divingDeeper/particles/solid_particle_system/sps_visibility
        sps.addShape(particle, numPoints, {
          positionFunction: pointBuilder
        });
        particle.dispose();
        sps.buildMesh();
      } else {
        const offset = this.isBuffering ? sps.nbParticles : 0;
        if (numPoints > sps.nbParticles) {
          numPoints = numPoints - sps.nbParticles;
          // use cache first
          if (this.particlePool.length > 0) {
            const particles = this.particlePool.splice(numPoints);
            numPoints = numPoints - particles.length;
            sps.insertParticlesFromArray(particles);
          }

          if (numPoints > 0) {
            const particle = MeshBuilder.CreateBox(this.particleType, {
              size: this.particleSize
            });

            particle.material = this?.shaderMaterial
              ?.shaderMaterial as Material;
            sps.addShape(particle, numPoints);
            particle.dispose();
          }
        } else {
          if (!this.isBuffering) {
            this.particlePool.concat(
              sps.removeParticles(numPoints, sps.nbParticles)
            );
          }
        }
        sps.buildMesh();

        // set particle properties
        for (let i = offset; i < sps.nbParticles; i++) {
          pointBuilder(sps.particles[i], i - offset);
        }
        sps.setParticles();
        // we didn't use a position function when creating particles so refresh bbox so we can pick
        sps.refreshVisibleSize();
      }
    }

    // lru cache - reinsert this block
    // this.octree.blocks.delete(block.mortonNumber);
    // if (this.octree.blocks.size > this.maxNumCacheBlocks) {
    //   // simple lru cache, evict first key, this is fine as we are backed by local storage
    //   const k = this.octree.blocks.keys().next().value;
    //   this.octree.blocks.delete(k);
    // }
    // this.octree.blocks.set(block.mortonNumber, block);
    this.htree.blocks.delete(block.heapIdx);
    if (this.htree.blocks.size > this.maxNumCacheBlocks) {
      // simple lru cache, evict first key, this is fine as we are backed by local storage
      const k = this.htree.blocks.keys().next().value;
      this.htree.blocks.delete(k);
    }
    this.htree.blocks.set(block.heapIdx, block);
    this.renderedBlocks.push(block);
    console.log('Displaying ' + this.count + ' particles');
  }

  private onData(evt: MessageEvent) {
    // const block = evt.data as MoctreeBlock;
    const block = evt.data as HTBlock;
    block.isLoading = false;

    // recreate vector functions these are lost in serialization
    block.minPoint = new Vector3(
      block.minPoint.x,
      block.minPoint.y,
      block.minPoint.z
    );
    block.maxPoint = new Vector3(
      block.maxPoint.x,
      block.maxPoint.y,
      block.maxPoint.z
    );

    // this.loadSystem(block.lod, block);
    this.loadSystem(block.heapIdx, block);

    // send the next data request, either core or neighbours
    if (this.isBuffering) {
      console.log('going to neighbours');
      this.fetchBlock(this.neighbours?.next().value);
    } else {
      this.fetchBlock(this.renderBlocks.pop());
    }
  }

  // private async fetchBlock(block: MoctreeBlock | undefined) {
  private async fetchBlock(block: HTBlock | undefined) {
    // fetch if not cached, TODO check block is in camera frustum
    if (block) {
      if (!block.isLoading && !block.isEmpty && !block.entries) {
        block.isLoading = true;
        this.worker?.postMessage({
          type: WorkerType.data,
          block: block
        } as DataRequest);
      } else {
        // already have data
        // this.loadSystem(block.lod, block);
        this.loadSystem(block.heapIdx, block);
      }

      if (
        !this.isBuffering &&
        this.renderBlocks.length === 0 &&
        this.pickedBlockCode > 0
      ) {
        // we are now appending
        this.isBuffering = true;
        // this.neighbours = this.octree.getNeighbours(this.pickedBlockCode);
        console.log('going to nehgbours');
        this.neighbours = this.htree.getNeighbours(this.pickedBlockCode);
        this.fetchBlock(this.neighbours?.next().value);
      } else {
        this.fetchBlock(this.renderBlocks.pop());
      }
    }
  }

  private showDebug(
    debugOn: boolean,
    scene: Scene,
    ray: Ray,
    // blocks: MoctreeBlock[]
    blocks: HTBlock[]
  ) {
    if (debugOn) {
      // TODO make debug colors configurable
      const c = new Color3(1, 1, 0.1);
      if (!this.rayHelper) {
        this.rayHelper = RayHelper.CreateAndShow(ray, scene, c);
      } else {
        this.rayHelper.ray = ray;
        this.rayHelper.show(scene, c);
      }
    } else {
      this.rayHelper?.hide();
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
    for (let i = 0; i < this.maxLevel; i++) {
      if (i === 0) {
        this.particleSystems.push(
          new SolidParticleSystem('sps_0', scene, {
            expandable: false,
            isPickable: true
          })
        );
      } else {
        const sps = new SolidParticleSystem('sps_' + i, scene, {
          expandable: true,
          isPickable: true
        });
        sps.vars.mortonNumber = 0;
        this.particleSystems.push(sps);
      }
    }

    this.rgbMax = rgbMax || 65535;

    /**
     * EDL shader material
     */
    this.shaderMaterial = new ParticleShaderMaterial(
      scene,
      this.edlNeighbours,
      this.particleSize
    );

    // centred on 0, 0, 0 with z being y
    const spanX = (xmax - xmin) / 2.0;
    const spanY = (ymax - ymin) / 2.0;
    this.minVector = new Vector3(-spanX, 0, -spanY);
    this.maxVector = new Vector3(spanX, zmax - zmin, spanY);

    this.translateX = xmin + spanX;
    this.translateY = zmin;
    this.translateZ = ymin + spanY;
    this.octree = new Moctree(
      this.minVector,
      this.maxVector,
      this.maxLevel,
      this.fanOut
    );
    // this.neighbours = this.octree.getNeighbours(Moctree.startBlockIndex);

    this.htree = new HTree8(
      this.minVector,
      this.maxVector,
      this.maxLevel,
      this.fanOut
    );
    this.neighbours = this.htree.getNeighbours(HTree8.startHeapIdx);

    // skip over default lod zero
    this.neighbours?.next();

    // maintain compatibility with directly loading data
    if (data) {
      // load into first SPS
      // const block = new MoctreeBlock(
      //   0,
      //   Moctree.startBlockIndex,
      //   Vector3.Zero(),
      //   Vector3.Zero()
      // );

      const block = new HTBlock(
        HTree8.startHeapIdx,
        Vector3.Zero(),
        Vector3.Zero()
      );
      block.entries = data;
      this.loadSystem(0, block);
      // no need to save entries for LOD 0
      block.entries = undefined;
    } else {
      // create a ground so we always having picking for panning the scene
      const ground = MeshBuilder.CreateGround(
        'ground',
        {
          width: spanX * 2,
          height: spanY * 2,
          subdivisions: this.numGridSubdivisions
        },
        scene
      );

      // TODO make grid material configurable or even transparent
      const gridMaterial = new GridMaterial('groundMaterial', scene);
      gridMaterial.majorUnitFrequency = this.numGridSubdivisions;
      ground.material = gridMaterial;

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
        translateX: this.translateX,
        translateY: this.translateY,
        translateZ: this.translateZ,
        bufferSize: this.bufferSize
      } as InitialRequest);

      scene.onAfterRenderObservable.add(scene => {
        this.afterRender(scene);
      });
    }
    return scene;
  }

  public async fetchPoints(scene: Scene) {
    // fully load immutable layer
    if (this.particleSystems[0].nbParticles > 0) {
      // find centre point and load higher resolution around it
      if (scene.activeCamera) {
        const ray = scene.activeCamera.getForwardRay();

        // const parentBlocks = this.octree.getContainingBlocksByRay(
        //   ray,
        //   this.maxLevel - 1
        // );
        const parentBlocks = this.htree.getContainingBlocksByRay(
          ray,
          this.maxLevel - 1
        );

        if (parentBlocks.length > 0) {
          // highest resolution
          // const pickCode = parentBlocks[0].mortonNumber;
          const pickCode = parentBlocks[0].heapIdx;

          if (pickCode !== this.pickedBlockCode) {
            // start loading lowest resolution from the lowest block, find parent blocks and load next resolution and so on up
            this.pickedBlockCode = pickCode;
            this.renderBlocks = parentBlocks;
            this.renderedBlocks = [];
            this.isBuffering = false;
            // restart count to base level as we are going to redraw
            this.count = this.particleSystems[0].nbParticles;
            this.fetchBlock(this.renderBlocks.pop());
          } else if (this.isBuffering) {
            console.log('going to nehgbours');
            this.fetchBlock(this.neighbours?.next().value);
          }

          if (this.debug) {
            this.showDebug(true, scene, ray, parentBlocks);
          } else {
            this.showDebug(false, scene, ray, parentBlocks);
          }
        }
      }
    } else {
      // load immutable layer immediately
      // this.fetchBlock(this.octree.blocks.get(Moctree.startBlockIndex));
      this.fetchBlock(this.htree.blocks.get(HTree8.startHeapIdx));
    }
  }

  public afterRender(scene: Scene) {
    if (
      this.frame % this.refreshRate === 0 ||
      !this.particleSystems[0].nbParticles
    ) {
      this.fetchPoints(scene);
    }
    this.frame++;
  }
}

export default ArrayModel;
