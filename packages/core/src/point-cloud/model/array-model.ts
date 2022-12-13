import {
  Color3,
  Color4,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  PointsCloudSystem,
  Scene,
  StandardMaterial,
  Vector3,
  BoundingInfo
} from '@babylonjs/core';

import { BoundsRequest, DataBlock, encodeMorton, HeapTree, Moctree, MoctreeBlock } from '../octree';
import { TileDBPointCloudOptions } from '../utils/tiledb-pc';
import {
  DataRequest,
  BoundsDataRequest,
  BoundsSetDataRequest,
  InitialRequest,
  SparseResult,
  WorkerType
} from './sparse-result';
import ParticleShaderMaterial from './particle-shader';
import { TileDBWorkerPool } from '../workers';

/**
 * The ArrayModel manages the client octree
 */
class ArrayModel {
  arrayName?: string;
  namespace?: string;
  octree!: Moctree;
  htree!: HeapTree;
  bufferSize: number;
  particleScale: number;
  rgbMax!: number;
  translationVector!: Vector3;
  edlStrength: number;
  edlRadius: number;
  edlNeighbours: number;
  particleMaterial?: ParticleShaderMaterial;
  maxLevel: number;
  token?: string;
  particleType: string;
  particleSize: number;
  pickedBlockCode = -2;
  rayOrigin = Vector3.Zero();
  maxNumCacheBlocks: number;
  renderBlocks: MoctreeBlock[] = [];
  isBuffering = false;
  neighbours?: Generator<MoctreeBlock, undefined, undefined>;
  htreeIdcs?: Generator<number, undefined>;
  htPathAndNeighbours?: Generator<number[], undefined>;
  // htreeIdcs: number[] = [];
  nextHtreeIdx = 0;
  basePcs?: PointsCloudSystem;
  particleSystems: Map<number, PointsCloudSystem>;
  pcsArray: Array<PointsCloudSystem>;
  workerPool?: TileDBWorkerPool;
  colorScheme?: string;
  debug = false;
  particleBudget: number;
  particleCount = 0;
  fanOut = 3;
  useShader = true;
  debugOctant: Mesh;
  debugOrigin: Mesh;
  scene?: Scene;
  poolSize: number;

  constructor(options: TileDBPointCloudOptions) {
    // console.log('ArrayModel CSTR: options: ', options);
    this.arrayName = options.arrayName;
    this.namespace = options.namespace;
    this.token = options.token;
    this.bufferSize = options.bufferSize || 10_000_000_000;
    this.particleScale = options.particleScale || 0.001;
    this.maxLevel = options.maxLevels || 3;
    this.particleType = options.particleType || 'box';
    this.particleSize = options.particleSize || 0.05;
    this.edlStrength = options.edlStrength || 4.0;
    this.edlRadius = options.edlRadius || 1.4;
    this.edlNeighbours = options.edlNeighbours || 8;
    this.colorScheme = options.colorScheme || 'blue';
    this.maxNumCacheBlocks = options.maxNumCacheBlocks || 100;
    // this.particleBudget = options.numParticles || 5_000_000_000;
    this.particleBudget = 100_000_000;
    this.fanOut = options.fanOut || 100;
    this.particleCount = 0;
    if (options.useShader === false) {
      this.useShader = false;
    }
    this.poolSize = options.workerPoolSize || 40;

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
    this.pcsArray = new Array<PointsCloudSystem>((Math.pow(8, this.maxLevel + 1) - 1)/7);
  }


  private loadSystemDataBlock(block: DataBlock) {
    console.log('loadSystemDataBlock: heapIdx: ', block.heapIdx);
    if (block.entries !== undefined && this.scene) {
      const numPoints = block.entries.X.length;

      this.particleCount += numPoints;

      const pcs = this.pcsArray[block.heapIdx];
      if (this.particleCount >= this.particleBudget) { // need to fix
        this.particleCount -= numPoints;
        this.pcsArray[block.heapIdx] = undefined;
        console.log('particle budget reached');
        return;
      }

      const transX = this.translationVector.x;
      const transY = this.translationVector.y;
      const transZ = this.translationVector.z;
      const rgbMax = this.rgbMax;

      const pointBuilder = function (particle: any, i: number) {
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
      };
      pcs.addPoints(numPoints, pointBuilder);
      pcs.buildMeshAsync().then(() => {
        pcs.setParticles();
        pcs.refreshVisibleSize();
      });
    }
  }

  private loadSystemBlockSet(blocks: DataBlock[]) {
    console.log('loadSystemBlockSet: blocks: ', blocks);
    if (this.scene) {
      for (let block of blocks) {

        const numPoints = block.entries.X.length;
        this.particleCount += numPoints;

        const pcs = this.pcsArray[block.heapIdx];

        if (this.particleCount >= this.particleBudget) { // need to fix
          this.particleCount -= numPoints;
          this.pcsArray[block.heapIdx] = undefined;
          console.log('particle budget reached');
          continue;
        }

        const transX = this.translationVector.x;
        const transY = this.translationVector.y;
        const transZ = this.translationVector.z;
        const rgbMax = this.rgbMax;

        const pointBuilder = function (particle: any, i: number) {
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
        };
        pcs.addPoints(numPoints, pointBuilder);
        pcs.buildMeshAsync().then(() => {
          pcs.setParticles();
          pcs.refreshVisibleSize();
        });
      }
    }
  }


  private async fetchBlockData(bounds: BoundsRequest) {
    console.log('fetchBlockData: heapIdx: ', bounds.heapIdx);
    // console.log('numActive: ', this.workerPool?.numActive());
    this.workerPool?.postMessage({
      type: WorkerType.boundsData,
      bounds: bounds
    } as BoundsDataRequest);
  }

  private async fetchBlockSet(heapIdcs: number[]) {
    console.log('fetch block set: ', heapIdcs);
    const boundsSet: BoundsRequest[] = [];
    for (let idx of heapIdcs) {
      if (!this.pcsArray[idx]) {
        this.pcsArray[idx] = new PointsCloudSystem(
          idx.toString(),
          this.particleSize,
          this.scene,
          {
            updatable: false
          }
        );
        boundsSet.push(new BoundsRequest(idx, this.htree.bounds[idx][0], this.htree.bounds[idx][1]));
      }
    }
    if (boundsSet.length) {
      this.workerPool?.postMessage({type: WorkerType.boundsSetData, boundsSet: boundsSet} as BoundsSetDataRequest);
    }
  }

  private async init_worker_pool() {
    this.workerPool = new TileDBWorkerPool(
      {
        type: WorkerType.init,
        namespace: this.namespace,
        token: this.token,
        arrayName: this.arrayName,
        translateX: this.translationVector.x,
        translateY: this.translationVector.y,
        translateZ: this.translationVector.z,
        bufferSize: this.bufferSize
      } as InitialRequest,
      this.loadSystemDataBlock.bind(this),
      this.loadSystemBlockSet.bind(this),
      this.poolSize
    );
    console.log('init worker pool');
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
    console.log('init: scene: ', scene, ' data: ', data);
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
    this.translationVector = new Vector3(xmin + spanX, zmin, ymin + spanY);

    this.htree = new HeapTree(
      new Vector3(-spanX, 0, -spanY),
      new Vector3(spanX, zmax - zmin, spanY),
      this.maxLevel // need to correct
    );
    console.log('this.htree: ', this.htree);
    // maintain compatibility with directly loading data
    if (data) {
      console.log('!!data: ');
      const block = new DataBlock();
      block.heapIdx = HeapTree.startBlockIndex;
      block.entries = data;
      this.loadSystemDataBlock(block);
    } else {
      console.log('no data');
      // create a ground so we always having picking for panning the scene
      const ground = MeshBuilder.CreateGround(
        'ground',
        {
          width: 2 * spanX,
          height: 2 * spanY
        },
        scene
      );

      ground.isVisible = true;
      // make the ground transparent and pickable
      const mat = new StandardMaterial('groundMaterial', scene);
      mat.alpha = 0;
      ground.material = mat;
      ground.isPickable = true;

      console.log('new ground');
    }
    if (!this.workerPool) {
      this.init_worker_pool();
      scene.onAfterRenderObservable.add((scene: Scene) => {
        this.afterRender(scene);
      });
    }
    return scene;
  }

  public async fetchPoints(scene: Scene) {
    // fully load immutable layer
    // console.log('fetchPoints');
    // console.log('basePcs: ', this.basePcs);
    // if (this.basePcs && this.basePcs.nbParticles > 0) {
      // find centre point and load higher resolution around it
      // console.log('this.basePcs');
      // console.log('workerPool is ready: ', this.workerPool?.isReady());
      // if (scene.activeCamera && this.workerPool?.isReady()) {
      if (scene.activeCamera) {
        const ray = scene.activeCamera.getForwardRay();
        const epsilon = Math.pow(10, -12);

        // have we panned
        if (!ray.origin.equalsWithEpsilon(this.rayOrigin, epsilon)) {
          this.rayOrigin = ray.origin.clone();
          console.log('rayOrigin changed');
          // const newHtreeIdcs = this.htree.getContainingBlocksByRay(ray, this.maxLevel);
          // if (newHtreeIdcs) {
          //   console.log('new htree idcs: ', newHtreeIdcs);
          //   this.htreeIdcs = newHtreeIdcs;
          //   this.nextHtreeIdx = 0;
          // }
          // const newHtreeIdcs = this.htree.getContainingBlocksByRay(ray, this.maxLevel);
          // if (newHtreeIdcs) {
          //   this.htreeIdcs = newHtreeIdcs;
          // }
          const newHtreeIdcs = this.htree.getContainingBlocksByRay(ray, this.maxLevel);
          if (newHtreeIdcs) {
            this.htPathAndNeighbours = newHtreeIdcs;
          }
        }
        // while (this.nextHtreeIdx < this.htreeIdcs.length) {
        //   const nextIdx = this.htreeIdcs[this.nextHtreeIdx++];
        //   console.log('next idx: ', nextIdx);
        //   if (!this.pcsArray[nextIdx]) {
        //     this.pcsArray[nextIdx] = new PointsCloudSystem(
        //       nextIdx.toString(),
        //       this.particleSize,
        //       this.scene,
        //       {
        //         updatable: false
        //       }
        //     );
        //     this.fetchBlockData(new BoundsRequest(nextIdx, this.htree.bounds[nextIdx][0], this.htree.bounds[nextIdx][1]));
        //     return;
        //   }
        //   console.log('found');
        // }
        // let nextIdxGen = this.htreeIdcs?.next();
        // while (!nextIdxGen?.done) {
        //   const nextIdx = nextIdxGen?.value as number;
        //   console.log('next idx: ', nextIdx);
        //   if (!this.pcsArray[nextIdx]) {
        //     this.pcsArray[nextIdx] = new PointsCloudSystem(
        //       nextIdx.toString(),
        //       this.particleSize,
        //       this.scene,
        //       {
        //         updatable: false
        //       }
        //     );
        //     this.fetchBlockData(new BoundsRequest(nextIdx, this.htree.bounds[nextIdx][0], this.htree.bounds[nextIdx][1]));
        //     return;
        //   }
        //   console.log('found');
        //   nextIdxGen = this.htreeIdcs?.next();
        // } 
        let nextSetGen = this.htPathAndNeighbours?.next();
        if (!nextSetGen?.done) {
          const nextIdxSet = nextSetGen?.value as number[];
          console.log('nextIdxSet: ', nextIdxSet);
          this.fetchBlockSet(nextIdxSet);
          // nextSetGen = this.htPathAndNeighbours?.next();
        } 
      }
    // } else {
    // //   // load immutable layer immediately, we don't want to fire this off to multiple workers
    //   // if (this.workerPool?.numActive() === 0) {
    //     // this.fetchBlockData(
    //     //   new BoundsRequest(
    //     //     HeapTree.startBlockIndex,
    //     //     this.htree.bounds[0][0],
    //     //     this.htree.bounds[0][1]
    //     //   )
    //     // );
    //     console.log('fetch start block');
    //     if (this.workerPool && this.workerPool.numActive() > 0) {
    //       // console.log('numActive > 0: ');
    //       this.workerPool.postMessage(
    //         {
    //           type: WorkerType.init,
    //           namespace: this.namespace,
    //           token: this.token,
    //           arrayName: this.arrayName,
    //           translateX: this.translationVector.x,
    //           translateY: this.translationVector.y,
    //           translateZ: this.translationVector.z,
    //           bufferSize: this.bufferSize
    //         } as InitialRequest
    //       );
    //     }
    //     this.pcsArray[HeapTree.startBlockIndex] = new PointsCloudSystem(
    //       HeapTree.startBlockIndex.toString(),
    //       this.particleSize,
    //       this.scene,
    //       {
    //         updatable: false
    //       }
    //     );
    //     this.basePcs = this.pcsArray[HeapTree.startBlockIndex];
    //     this.fetchBlockData(
    //       new BoundsRequest(
    //         HeapTree.startBlockIndex,
    //         this.htree.bounds[HeapTree.startBlockIndex][0],
    //         this.htree.bounds[HeapTree.startBlockIndex][1]
    //       )
    //     );
    // }
  }

  set metadata(m: Map<string, number>) {
    // TODO change this format to send morton codes in the node metadata from the server
    // m.forEach((v, k) => {
    //   if (!k.startsWith('_')) {
    //     const parts = k.split('-').map(Number);
    //     // swap z and y
    //     const morton = encodeMorton(
    //       new Vector3(parts[1], parts[3], parts[2]),
    //       parts[0]
    //     );
    //     // this.octree.knownBlocks.set(morton, v);
    //   }
    // });
  }

  public afterRender(scene: Scene) {
    // console.log('afterRender');
    this.fetchPoints(scene);
  }
}

export default ArrayModel;
