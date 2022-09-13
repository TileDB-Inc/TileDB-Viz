import {
  Color4,
  MeshBuilder,
  Scene,
  SmartArray,
  SolidParticleSystem,
  Vector3
} from '@babylonjs/core';
import TileDBClient, { TileDBQuery, QueryData } from '@tiledb-inc/tiledb-cloud';

import { PointOctree, PointOctreeBlock } from '../octree';
import { SparsePoint, SparseResult } from '.';
import { TileDBPointCloudOptions } from '../utils/tiledb-pc';

/**
 * The ArrayModel manages to the local octree
 */
class ArrayModel {
  arrayName?: string;
  namespace?: string;
  octree!: PointOctree;
  bufferSize: number;
  minVector!: Vector3;
  maxVector!: Vector3;
  rgbMax?: number;
  maxLevel?: number;
  tiledbQuery!: TileDBQuery;
  tiledbClient!: TileDBClient;
  token?: string;
  depth: number;
  maxBlockCapacity: number;
  isDirty = false;
  sps!: SolidParticleSystem;
  frame = 0;
  pointBudget: number;
  refreshRate: number;
  particleType: string;
  particleSize: number;
  zScale: number;
  translateX = 0;
  translateY = 0;
  translateZ = 0;

  constructor(options: TileDBPointCloudOptions) {
    this.arrayName = options.arrayName;
    this.namespace = options.namespace;
    this.depth = options.depth || 10;
    this.token = options.token;
    this.maxBlockCapacity = options.maxBlockCapacity || 5000;
    this.bufferSize = options.bufferSize || 200000000;
    this.maxLevel = options.maxLevels;
    this.refreshRate = options.refreshRate || 15;
    this.pointBudget = options.pointBudget || 2_000_000;
    this.particleType = options.particleType || 'box';
    this.particleSize = options.particleSize || 0.1;
    this.zScale = options.zScale || 1.0;
  }

  private getActiveBlocks(scene: Scene, acc: Array<PointOctreeBlock>) {
    this.octree.blocks.forEach(block => {
      (block as PointOctreeBlock).getActiveBlocks(scene, acc);
    });
    return acc;
  }

  private async fetchData(block: PointOctreeBlock) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    if (++block.lod < this.maxLevel!) {
      block.loading = true; // stop future updates on this block while the data is retrieved
      // load points into block
      const ranges = [
        [
          block.minPoint.x + this.translateX,
          block.maxPoint.x + this.translateX
        ],
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

      for await (const results of this.tiledbQuery.ReadQuery(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.namespace!,
        this.arrayName + '_' + block.lod,
        queryData
      )) {
        const r = results as SparseResult;
        for (let p = 0; p < r.X.length; p++) {
          block.addEntry({
            x: r.X[p] - this.translateX,
            y: r.Z[p] - this.translateY,
            z: r.Y[p] - this.translateZ,
            red: r.Red[p],
            green: r.Green[p],
            blue: r.Blue[p]
          });
        }

        this.isDirty = true;
        block.loading = false;
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
    this.sps = new SolidParticleSystem('sps', scene, { expandable: true });

    const config = {
      apiKey: this.token
    };
    this.tiledbClient = new TileDBClient(config);
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

    this.octree = new PointOctree(this.maxBlockCapacity, this.depth);
    this.octree.update(this.minVector, this.maxVector, [], -1);

    // maintain compatibility with directly loading data
    if (data) {
      this.octree.blocks.forEach(block => {
        for (let p = 0; p < data.X.length; p++) {
          const b = block as PointOctreeBlock;
          b.addEntry({
            x: data.X[p] - this.translateX,
            y: data.Z[p] - this.translateY,
            z: data.Y[p] - this.translateZ,
            red: data.Red[p],
            green: data.Green[p],
            blue: data.Blue[p]
          });
          b.lod++;
        }
      });
      this.isDirty = true;
    } else {
      scene.onAfterRenderObservable.add(scene => {
        this.afterRender(scene);
      });
    }
    scene.onBeforeRenderObservable.add(scene => {
      this.beforeRender(scene);
    });
    return scene;
  }

  public select(scene: Scene): SmartArray<SparsePoint> | undefined {
    if (scene.frustumPlanes) {
      return this.octree.select(scene.frustumPlanes, true);
    } else {
      return undefined;
    }
  }

  public async fetchPoints(scene: Scene) {
    const activeBlocks = this.getActiveBlocks(
      scene,
      new Array<PointOctreeBlock>()
    );
    // load all data at lod zero for the scene
    activeBlocks.forEach(async (block: PointOctreeBlock) => {
      if (!block.loading) {
        if (block.lod === -1) {
          this.fetchData(block);
        }
      }
    });
    // find centre block
    let centreBlock: PointOctreeBlock | undefined;
    for (let b = 0; b < activeBlocks.length; b++) {
      const blk = activeBlocks[b];
      if (!blk.loading) {
        if (scene.activeCamera) {
          const ray = scene.activeCamera.getForwardRay();
          if (ray.intersectsBoxMinMax(blk.minPoint, blk.maxPoint)) {
            if (!centreBlock || blk.minPoint.y < centreBlock.minPoint.y) {
              centreBlock = blk;
            }
          }
        }
      }
    }
    if (centreBlock) {
      this.fetchData(centreBlock);
    }
  }

  public beforeRender(scene: Scene) {
    if (this.isDirty && this.frame % this.refreshRate === 0) {
      const pts = this.select(scene);
      if (pts) {
        this.isDirty = false;
        // expand as needed
        if (pts.length > this.sps.nbParticles) {
          const particle = MeshBuilder.CreateBox(this.particleType, {
            size: this.particleSize
          });
          let n = pts.length - this.sps.nbParticles;

          if (pts.length > this.pointBudget) {
            console.log('Exceeded point budget in render');
            n = this.pointBudget - this.sps.nbParticles;
          }

          this.sps.addShape(particle, n);
          particle.dispose();
        } else {
          this.sps.removeParticles(pts.length, this.sps.nbParticles);
        }
        this.sps.buildMesh();

        console.log("ArrayModel zScale");
        console.log(this.zScale);
    
        for (let i = 0; i < this.sps.nbParticles; i++) {
          const p = pts.data[i];
          this.sps.particles[i].position = new Vector3(p.x, p.y * this.zScale, p.z);
          this.sps.particles[i].color = new Color4(p.red, p.green, p.blue);
        }

        this.sps.setParticles();
      }
    }
    this.frame++;
  }

  public afterRender(scene: Scene) {
    // load point after render asynchronously
    this.fetchPoints(scene);
  }
}

export default ArrayModel;
