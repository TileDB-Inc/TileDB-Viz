import {
  Color4,
  MeshBuilder,
  Scene,
  SolidParticle,
  SolidParticleSystem,
  Vector3
} from '@babylonjs/core';
import TileDBClient, { TileDBQuery, QueryData } from '@tiledb-inc/tiledb-cloud';

import { Moctree, MoctreeBlock } from '../octree';
import { SparseResult } from '.';
import { TileDBPointCloudOptions } from '../utils/tiledb-pc';
import getTileDBClient from '../../utils/getTileDBClient';
import stringifyQuery from '../utils/stringifyQuery';
import { getQueryDataFromCache, writeToCache } from '../../utils/cache';

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
  rgbMax?: number;
  maxLevel: number;
  tiledbQuery!: TileDBQuery;
  tiledbClient!: TileDBClient;
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
  }

  private loadSystem(index: number, result: SparseResult) {
    const trans_x = this.translateX;
    const trans_y = this.translateY;
    const trans_z = this.translateZ;
    const sps = this.particleSystems[index];
    let numPoints = result.X.length;

    const pointBuilder = function (particle: SolidParticle, i: number) {
      // set properties of particle
      particle.position.set(
        result.X[i] - trans_x,
        result.Z[i] - trans_y,
        result.Y[i] - trans_z
      );
      if (particle.color) {
        particle.color?.set(result.Red[i], result.Green[i], result.Blue[i], 1);
      } else {
        particle.color = new Color4(
          result.Red[i],
          result.Green[i],
          result.Blue[i]
        );
      }
    };
    if (index === 0) {
      // immutable SPS for LoD 0
      const particle = MeshBuilder.CreateBox(this.particleType, {
        size: this.particleSize // TODO scale particle size according to index level
      });
      // bbox is created by using position function - https://doc.babylonjs.com/divingDeeper/particles/solid_particle_system/sps_visibility
      sps.addShape(particle, numPoints, {
        positionFunction: pointBuilder
      });
      particle.dispose();
      sps.buildMesh();
    } else {
      if (numPoints > sps.nbParticles) {
        numPoints = numPoints - sps.nbParticles;
        const particle = MeshBuilder.CreateBox(this.particleType, {
          size: this.particleSize + index * this.particleScale // increase particle point size for higher LODs
        });
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
    }
  }

  private async fetchData(block: MoctreeBlock) {
    block.loading = true; // stop future updates on this block while the data is retrieved

    // load points into block
    const ranges = [
      [block.minPoint.x + this.translateX, block.maxPoint.x + this.translateX],
      [
        block.minPoint.z + this.translateZ, // Y is Z
        block.maxPoint.z + this.translateZ
      ],
      [block.minPoint.y + this.translateY, block.maxPoint.y + this.translateY]
    ];

    const queryData = {
      layout: 'row-major',
      ranges: ranges,
      attributes: ['X', 'Y', 'Z', 'Red', 'Green', 'Blue'], // choose a subset of attributes
      bufferSize: this.bufferSize
    } as QueryData;

    const queryCacheKey = stringifyQuery(
      queryData,
      this.namespace as string,
      this.arrayName + '_' + block.lod
    );

    const dataFromCache = await getQueryDataFromCache(queryCacheKey);

    if (dataFromCache) {
      block.entries = dataFromCache as SparseResult;
      block.loading = false;
      return;
    }

    for await (const results of this.tiledbQuery.ReadQuery(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.namespace!,
      this.arrayName + '_' + block.lod,
      queryData
    )) {
      block.entries = results as SparseResult;
      block.loading = false;
      await writeToCache(queryCacheKey, results);
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
        this.particleSystems.push(
          new SolidParticleSystem('sps_' + i, scene, {
            expandable: true,
            isPickable: true
          })
        );
      }
    }

    const config = {
      apiKey: this.token
    };
    this.tiledbClient = getTileDBClient(config);
    this.tiledbQuery = this.tiledbClient.query;

    this.rgbMax = rgbMax;

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
      this.loadSystem(0, data);
    } else {
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
            // start loading high resolution from the lowest block, find parent blocks and load next resolution and so on up
            this.pickedBlockCode = pickCode;
            this.renderBlocks = this.octree.getParentBlocks(
              pickingInfo.pickedPoint,
              this.maxLevel
            );
          }
        }
        if (this.renderBlocks.length > 0) {
          const block = this.renderBlocks.pop();
          // fetch if not cached
          if (block && !block.entries) {
            await this.fetchData(block);
          }
          if (block?.entries) {
            this.loadSystem(block.lod, block.entries);
          }
        }
      }
    } else {
      // load immutable layer first and wait
      const block = this.octree.blocks[0][0];
      if (!block.entries && !block.loading) {
        await this.fetchData(block);
        if (block.entries) {
          this.loadSystem(0, block.entries);
        }
      }
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
