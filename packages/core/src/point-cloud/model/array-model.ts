import {
  Color3,
  Color4,
  Material,
  MeshBuilder,
  RayHelper,
  Scene,
  SolidParticle,
  SolidParticleSystem,
  Vector3
} from '@babylonjs/core';

import { Moctree, MoctreeBlock } from '../octree';
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
  pickedBlockCode = '';
  maxNumCacheBlocks: number;
  renderBlocks: MoctreeBlock[] = [];
  particleSystems: SolidParticleSystem[] = [];
  worker?: Worker;
  particlePool: Array<SolidParticle> = [];
  debug = false;
  rayHelper?: RayHelper;

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
    this.maxNumCacheBlocks = options.maxNumCacheBlocks || 20;
  }

  private loadSystem(index: number, block: MoctreeBlock) {
    // for now lets print the debug to show we are loading data, replace with visually showing the boxes and ray trace
    console.log(
      'Loading: ' +
        index +
        ' LOD: ' +
        block.lod +
        ' Morton: ' +
        block.mortonNumber
    );
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

      const pointBuilder = function (particle: SolidParticle, i: number) {
        if (block.entries !== undefined) {
          // set properties of particle
          particle.scaling = new Vector3(r, r, r);

          particle.position.set(
            block.entries.X[i] - trans_x,
            block.entries.Z[i] - trans_y,
            block.entries.Y[i] - trans_z
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

      if (index === 0) {
        // immutable SPS for LoD 0
        const particle = MeshBuilder.CreateBox(this.particleType, {
          size: this.particleSize
        });
        particle.material = this?.shaderMaterial?.shaderMaterial as Material;
        // bbox is created by using position function - https://doc.babylonjs.com/divingDeeper/particles/solid_particle_system/sps_visibility
        sps.addShape(particle, numPoints, {
          positionFunction: pointBuilder
        });
        particle.dispose();
        sps.buildMesh();
      } else {
        if (block.mortonNumber !== sps.vars.mortonNumber) {
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
            this.particlePool.concat(
              sps.removeParticles(numPoints, sps.nbParticles)
            );
          }
          sps.buildMesh();

          // set particle properties
          for (let i = 0; i < sps.nbParticles; i++) {
            pointBuilder(sps.particles[i], i);
          }
          sps.setParticles();
          // we didn't use a position function when creating particles so refresh bbox so we can pick
          sps.refreshVisibleSize();
          sps.vars.mortonNumber = block.mortonNumber;
        }
      }
    }

    // lru cache - reinsert this block
    this.octree.blocks.delete(block.mortonNumber);
    if (this.octree.blocks.size > this.maxNumCacheBlocks) {
      // simple lru cache, evict first key, this is fine as we are backed by local storage
      const k = this.octree.blocks.keys().next().value;
      this.octree.blocks.delete(k);
    }
    this.octree.blocks.set(block.mortonNumber, block);
  }

  private onData(evt: MessageEvent) {
    const block = evt.data;
    block.isLoading = false;
    // no need to save the entries for LOD 0
    if (block.mortonNumber !== Moctree.startBlockIndex) {
      this.octree.blocks.set(block.mortonNumber, block);
    }
    if (!block.isEmpty) {
      this.loadSystem(block.lod, block);
    }
    // send the next data request
    if (this.renderBlocks.length) {
      this.fetchBlock(this.renderBlocks.pop());
    }
  }

  private async fetchBlock(block: MoctreeBlock | undefined) {
    // fetch if not cached
    if (block && !block.isLoading && !block.entries) {
      block.isLoading = true;
      this.worker?.postMessage({
        type: WorkerType.data,
        block: block
      } as DataRequest);
    } else if (block?.entries) {
      this.loadSystem(block.lod, block);
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

    this.shaderMaterial = new ParticleShaderMaterial(
      scene,
      this.edlNeighbours,
      this.particleSize
    );

    // centred on 0, 0, 0 with z being y
    const spanX = (xmax - xmin) / 2.0;
    const spanY = (ymax - ymin) / 2.0;
    const spanZ = (zmax - zmin) / 2.0;
    this.minVector = new Vector3(-spanX, -spanZ, -spanY);
    this.maxVector = new Vector3(spanX, spanZ, spanY);

    this.translateX = xmin + spanX;
    this.translateY = zmin + spanZ;
    this.translateZ = ymin + spanY;
    this.octree = new Moctree(this.minVector, this.maxVector, this.maxLevel);

    // maintain compatibility with directly loading data
    if (data) {
      // load into first SPS
      const block = new MoctreeBlock(
        0,
        Moctree.startBlockIndex.toString(),
        Vector3.Zero(),
        Vector3.Zero()
      );
      block.entries = data;
      this.loadSystem(0, block);
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

        if (this.debug) {
          RayHelper.CreateAndShow(ray, scene, new Color3(1, 1, 0.1));
        }

        const parentBlocks = this.octree.getContainingBlocksByRay(
          ray,
          this.maxLevel - 1
        );

        if (parentBlocks.length > 0) {
          // highest resolution
          const pickCode = parentBlocks[0].mortonNumber;

          if (pickCode !== this.pickedBlockCode) {
            // start loading lowest resolution from the lowest block, find parent blocks and load next resolution and so on up
            this.pickedBlockCode = pickCode;
            this.renderBlocks = parentBlocks;
            this.fetchBlock(this.renderBlocks.pop());
          }
        }
      }
    } else {
      // load immutable layer immediately
      this.fetchBlock(
        this.octree.blocks.get(Moctree.startBlockIndex.toString())
      );
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
