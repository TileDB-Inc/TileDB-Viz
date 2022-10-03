import {
  Color4,
  Material,
  MeshBuilder,
  Scene,
  SolidParticle,
  SolidParticleSystem,
  Vector3
} from '@babylonjs/core';

import { Moctree, MoctreeBlock } from '../octree';
import { TileDBPointCloudOptions } from '../utils/tiledb-pc';
import getTileDBClient from '../../utils/getTileDBClient';
import {
  DataRequest,
  InitialRequest,
  SparseResult,
  WorkerType
} from './sparse-result';
import TileDBClient, { TileDBQuery } from '@tiledb-inc/tiledb-cloud';
import ParticleShaderMaterial from './particle-shader';
import PointCloudGUI from '../gui/point-cloud-gui';

/**
 * The ArrayModel manages to the local octree
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
  sps!: SolidParticleSystem;
  frame = 0;
  refreshRate: number;
  particleType: string;
  particleSize: number;
  translateX = 0;
  translateY = 0;
  translateZ = 0;
  pickedBlockCode = 0;
  renderBlocks: MoctreeBlock[] = [];
  particleSystems: SolidParticleSystem[] = [];
  tiledbClient!: TileDBClient;
  tiledbQuery!: TileDBQuery;
  worker?: Worker;

  constructor(options: TileDBPointCloudOptions) {
    this.arrayName = options.arrayName;
    this.namespace = options.namespace;
    this.token = options.token;
    this.bufferSize = options.bufferSize || 200000000;
    this.particleScale = options.particleScale || 0.001;
    this.maxLevel = options.maxLevels || 1;
    this.refreshRate = options.refreshRate || 15;
    this.particleType = options.particleType || 'box';
    this.particleSize = options.particleSize || 0.05;
    this.edlStrength = options.edlStrength || 4.0;
    this.edlRadius = options.edlRadius || 1.4;
    this.edlNeighbours = options.edlNeighbours || 8;
  }

  private loadSystem(index: number, block: MoctreeBlock) {
    // for now lets print the debug to show we are loading data, replace with visually showing the boxes and ray trace
    console.log('Loading: ' + index + ' LOD: ' + block.lod);
    if (block.entries !== undefined) {
      const trans_x = this.translateX;
      const trans_y = this.translateY;
      const trans_z = this.translateZ;
      const rgbMax = this.rgbMax;
      const sps = this.particleSystems[index];
      let numPoints = block.entries.X.length;

      const pointBuilder = function (particle: SolidParticle, i: number) {
        if (block.entries !== undefined) {
          // set properties of particle
          particle.position.set(
            block.entries.X[i] - trans_x,
            block.entries.Z[i] - trans_y,
            block.entries.Y[i] - trans_z
          );
          if (particle.color) {
            particle.color?.set(
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
        particle.material = this.shaderMaterial?.shaderMaterial as Material;
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
            const particle = MeshBuilder.CreateBox(this.particleType, {
              size: this.particleSize + index * this.particleScale // increase particle point size for higher LODs
            });
            particle.material = this.shaderMaterial?.shaderMaterial as Material;
            sps.addShape(particle, numPoints);
            particle.dispose();
          } else {
            // TODO cache removed particles to save future creation time
            sps.removeParticles(numPoints, sps.nbParticles);
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
  }

  private onData(evt: MessageEvent) {
    const block = evt.data;
    block.isLoading = false;
    this.octree.blocks[block.lod][block.mortonNumber] = block;
    // TODO we should load in afterRender so we can see if the block is in frustum or not
    this.loadSystem(block.lod, block);
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

    const config = {
      apiKey: this.token
    };
    this.tiledbClient = getTileDBClient(config);
    this.tiledbQuery = this.tiledbClient.query;

    this.rgbMax = rgbMax || 1;

    /**
     * EDL shader material
     */
    this.shaderMaterial = new ParticleShaderMaterial(
      scene,
      this.edlNeighbours,
      this.particleSize
    );

    /**
     * Add an interactive GUI
     */
    const pointCloudGUI = new PointCloudGUI(scene);
    pointCloudGUI.init(this);

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
      const block = new MoctreeBlock(0, 0, Vector3.Zero(), Vector3.Zero());
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
        const pickingInfo = ray.intersectsMesh(this.particleSystems[0].mesh);
        if (pickingInfo.pickedPoint !== null) {
          const pickCode = this.octree.getCode(
            pickingInfo.pickedPoint,
            this.maxLevel
          ).code;

          if (pickCode !== this.pickedBlockCode) {
            // start loading lowest resolution from the lowest block, find parent blocks and load next resolution and so on up
            this.pickedBlockCode = pickCode;
            this.renderBlocks = this.octree.getParentBlocks(
              pickingInfo.pickedPoint,
              this.maxLevel
            );
            this.fetchBlock(this.renderBlocks.pop());
          }
        }
      }
    } else {
      // load immutable layer immediately
      this.fetchBlock(this.octree.blocks[0][0]);
      // no need to save entries for LOD 0
      this.octree.blocks[0][0].entries = undefined;
    }
  }

  public afterRender(scene: Scene) {
    if (
      this.frame % this.refreshRate === 0 ||
      !this.particleSystems[0].nbParticles
    ) {
      this.fetchPoints(scene);
    }
  }
}

export default ArrayModel;
