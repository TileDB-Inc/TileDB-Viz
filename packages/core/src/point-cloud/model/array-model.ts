import {
  Color3,
  Color4,
  DynamicTexture,
  Material,
  Mesh,
  MeshBuilder,
  Scene,
  SolidParticle,
  SolidParticleSystem,
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
  particleSystems: SolidParticleSystem[] = [];
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
  frame = 0;

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
  }

  private loadSystem(index: number, block: MoctreeBlock) {
    // const st = Date.now();
    if (block.entries !== undefined) {
      const transVector = block.bbox.getWorldMatrix().getTranslation();
      const transX = transVector.x;
      const transY = transVector.y;
      const transZ = transVector.z;
      const rgbMax = this.rgbMax;
      const sps = this.particleSystems[index];
      let numPoints = block.entries.X.length;

      // increase particle point size for higher LODs
      const r =
        (this.particleSize + index * this.particleScale) / this.particleSize;

      this.particleCount += numPoints;
      if (this.particleCount < this.particleBudget) {
        const pointBuilder = function (particle: SolidParticle, i: number) {
          if (block.entries !== undefined) {
            // set properties of particle
            particle.scaling = new Vector3(r, r, r);

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

        if (index === 0) {
          // immutable SPS for LoD 0
          const particle = MeshBuilder.CreateBox(this.particleType, {
            size: this.particleSize
          });
          if (this.useShader) {
            particle.material = this.particleMaterial
              ?.shaderMaterial as Material;
          }
          sps.addShape(particle, numPoints, {
            positionFunction: pointBuilder
          });
          particle.dispose();
          sps.buildMesh();
        } else {
          const offset = this.isBuffering ? sps.nbParticles : 0;
          if (this.isBuffering) {
            // we are always adding more points to the SPS
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

              if (this.useShader) {
                particle.material = this.particleMaterial
                  ?.shaderMaterial as Material;
              }
              sps.addShape(particle, numPoints);
              particle.dispose();
            }
          } else {
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

                if (this.useShader) {
                  particle.material = this.particleMaterial
                    ?.shaderMaterial as Material;
                }
                sps.addShape(particle, numPoints);
                particle.dispose();
              }
            } else {
              this.particlePool.concat(
                sps.removeParticles(numPoints, sps.nbParticles)
              );
            }
          }

          sps.buildMesh();

          // set particle properties
          for (let i = offset; i < offset + numPoints; i++) {
            pointBuilder(sps.particles[i], i - offset);
          }

          sps.setParticles();
          // we didn't use a position function when creating particles so refresh bbox so we can pick
          sps.refreshVisibleSize();
        }
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
      }
      this.octree.blocks.set(block.mortonNumber, block);
    }

    console.log(this.particleCount);
  }

  private onData(evt: MessageEvent) {
    let block = evt.data as MoctreeBlock;

    // refresh block as it was serialized,
    block = new MoctreeBlock(
      block.lod,
      block.mortonNumber,
      new Vector3(block.minPoint._x, block.minPoint._y, block.minPoint._z),
      new Vector3(block.maxPoint._x, block.maxPoint._y, block.maxPoint._z),
      this.octree.bounds.getWorldMatrix().getTranslation().clone(),
      block.entries
    );

    if (!block.isEmpty) {
      this.loadSystem(block.lod, block);
    }
    this.isActive = false;
  }

  private async fetchBlock(block: MoctreeBlock | undefined) {
    // fetch if not cached
    if (block) {
      if (!block.isEmpty && !block.entries) {
        this.worker?.postMessage({
          type: WorkerType.data,
          block: block
        } as DataRequest);
      } else {
        // already have data
        this.loadSystem(block.lod, block);
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
    for (let i = 0; i < this.maxLevel; i++) {
      if (i === 0) {
        this.particleSystems.push(
          new SolidParticleSystem('sps_0', scene, {
            expandable: true,
            isPickable: true
          })
        );
      } else {
        const sps = new SolidParticleSystem('sps_' + i, scene, {
          expandable: true,
          isPickable: true
        });
        this.particleSystems.push(sps);
      }
    }

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
      // load into first SPS
      const block = new MoctreeBlock(
        0,
        Moctree.startBlockIndex,
        Vector3.Zero(),
        Vector3.Zero(),
        translationVector
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
    if (this.particleSystems[0].nbParticles > 0) {
      // find centre point and load higher resolution around it
      this.frame++;
      // wait approximiately 60 seconds or move on
      if (scene.activeCamera && (!this.isActive || this.frame % 60 === 0)) {
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
            this.particleCount = this.particleSystems[0].nbParticles;
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
          console.log(block.lod);
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
