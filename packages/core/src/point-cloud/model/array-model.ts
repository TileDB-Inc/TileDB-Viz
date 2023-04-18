import {
  Color4,
  MeshBuilder,
  Scene,
  SolidParticleSystem,
  Vector3,
  Particle,
  Frustum,
  RawTexture,
  Constants,
  Camera,
  RenderTargetTexture,
  Mesh,
  ShaderMaterial
} from '@babylonjs/core';

import { AdvancedDynamicTexture, Rectangle, TextBlock } from '@babylonjs/gui';

import { encodeMorton, Moctree, MoctreeBlock } from '../octree';
import {
  DataRequest,
  InitialRequest,
  TransformedResult,
  WorkerType
} from './sparse-result';
import { ParticleShaderMaterial, TileDBPointCloudOptions } from '../utils';
import { TileDBWorkerPool } from '../workers';
import { getQueryDataFromCache } from '../../utils/cache';
import { ArraySchema } from '@tiledb-inc/tiledb-cloud/lib/v1';
import { PriorityQueue } from '../utils/priority-queue';
import { SimplePointsCloudSystem } from '../meshes/simple-point-cloud';
import { SparseResult } from './sparse-result';
import { buffersToTransformedResult } from '../utils/buffersToSparseResult';
import { PointCloudDepthMaterial } from '../materials/depthShaderMaterial';
import { PointCloudAdditiveColorMaterial } from '../materials/additiveColorShaderMaterial';

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
  particleSystems: Map<number, SolidParticleSystem | SimplePointsCloudSystem>;
  workerPool?: TileDBWorkerPool;
  colorScheme?: string;
  debug = false;
  pointBudget: number;
  useShader = false;
  useStreaming = false;
  useSPS = false;
  scene: Scene;
  poolSize: number;
  debugTexture?: AdvancedDynamicTexture;
  loaded: Map<number, boolean>;
  octreeTexture!: RawTexture;
  octreeTextureData: Uint8Array;
  pending: MoctreeBlock[];
  screenSizeLimit = 40;
  isInitialized = false;
  blockQueue!: PriorityQueue;
  static groundName = 'ground';
  renderTargets: RenderTargetTexture[];
  depthMaterial!: ShaderMaterial;
  additiveColorMaterial!: ShaderMaterial;
  basePointSize = 1;
  visible: Map<number, boolean>;

  constructor(
    scene: Scene,
    options: TileDBPointCloudOptions,
    renderTargets: RenderTargetTexture[]
  ) {
    this.scene = scene;

    this.groupName = options.groupName;
    this.namespace = options.namespace;
    this.token = options.token;
    this.tiledbEnv = options.tiledbEnv;
    this.bufferSize = options.bufferSize || 200000000;
    this.pointType = options.pointType || 'fixed_screen_size';
    this.pointSize = options.pointSize || 0.05;
    this.zScale = options.zScale || 1;
    this.edlStrength = options.edlStrength || 0.4;
    this.edlRadius = options.edlRadius || 1.4;
    this.edlNeighbours = options.edlNeighbours || 8;
    this.colorScheme = options.colorScheme || 'dark';
    this.pointBudget = options.pointBudget || 500_000;

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
      SolidParticleSystem | SimplePointsCloudSystem
    >();

    this.renderTargets = renderTargets;
    this.loaded = new Map<number, boolean>();
    this.visible = new Map<number, boolean>();
    this.pending = [];

    this.octreeTextureData = new Uint8Array(400);
    this.octreeTexture = new RawTexture(
      this.octreeTextureData,
      200,
      1,
      Constants.TEXTUREFORMAT_RG_INTEGER,
      this.scene,
      false,
      false,
      Constants.TEXTURE_NEAREST_SAMPLINGMODE
    );

    this.depthMaterial = PointCloudDepthMaterial(
      this.scene,
      options.cameraNearPlane || 1,
      options.cameraFarPlane || 10000,
      options.cameraFOV || 0.8,
      this.pointSize,
      this.pointType
    );

    this.additiveColorMaterial = PointCloudAdditiveColorMaterial(
      this.scene,
      options.cameraFOV || 0.8,
      this.pointSize,
      this.pointType
    );

    this.depthMaterial.setTexture('visibilityTexture', this.octreeTexture);
    this.additiveColorMaterial.setTexture(
      'visibilityTexture',
      this.octreeTexture
    );
  }

  private addDebugLabel(
    pcs: SolidParticleSystem | SimplePointsCloudSystem,
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
      !this.loaded.has(block.mortonNumber) ||
      !this.loaded.get(block.mortonNumber)
    ) {
      return;
    }

    if (this.scene.isDisposed) {
      return;
    }

    if (block.entries !== undefined && block.entries.Position.length !== 0) {
      const numPoints = block.pointCount;

      const pointBuilderTransformed = function (particle: Particle, i: number) {
        const entries = block.entries as TransformedResult;
        if (block.entries !== undefined) {
          particle.position.set(
            entries.Position[3 * i],
            entries.Position[3 * i + 1],
            entries.Position[3 * i + 2]
          );

          if (particle.color) {
            particle.color.set(
              entries.Color[4 * i],
              entries.Color[4 * i + 1],
              entries.Color[4 * i + 2],
              1
            );
          } else {
            particle.color = new Color4(
              entries.Color[4 * i],
              entries.Color[4 * i + 1],
              entries.Color[4 * i + 2]
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
        sps.computeBoundingBox = true;
        sps.addShape(box, numPoints, {
          positionFunction: pointBuilderTransformed
        });

        sps.buildMesh();
        box.dispose();

        if (this.debug && this.debugTexture && sps.mesh) {
          this.addDebugLabel(sps, block.mortonNumber.toString());
        }

        if (block.mortonNumber !== Moctree.startBlockIndex) {
          this.particleSystems.set(block.mortonNumber, sps);
        }
      } else {
        const pcs = new SimplePointsCloudSystem(
          block.mortonNumber.toString(),
          this.pointSize,
          this.scene
        );

        pcs.buildMeshFromBuffer(
          block.entries.Position,
          block.entries.Color,
          undefined,
          this.depthMaterial
        );

        this.particleSystems.set(block.mortonNumber, pcs);

        if (this.debug && this.debugTexture && pcs.mesh) {
          this.addDebugLabel(pcs, block.mortonNumber.toString());
        }

        if (!pcs.mesh) {
          throw new Error('Point cloud build failed');
        }

        pcs.mesh.layerMask = 2;
        this.assignRenderTargets(pcs.mesh);

        this.visible.set(block.mortonNumber, true);
      }
    }
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

  private assignRenderTargets(mesh: Mesh): void {
    if (
      !this.renderTargets[0].renderList ||
      !this.renderTargets[1].renderList
    ) {
      throw new Error('Render Targets uninitialized');
    }

    this.renderTargets[0].renderList.push(mesh);
    this.renderTargets[0].setMaterialForRendering(mesh, this.depthMaterial);

    this.renderTargets[1].renderList.push(mesh);
    this.renderTargets[1].setMaterialForRendering(
      mesh,
      this.additiveColorMaterial
    );
  }

  public async init(
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
    this.basePointSize = 50;
    this.rgbMax = rgbMax || 1.0;
    this.maxLevel = nLevels || 1;
    this.arraySchema = arraySchema;

    // centred on 0, 0, 0 with z being y
    const spanX = (xmax - xmin) / 2.0;
    const spanY = (ymax - ymin) / 2.0;
    this.translationVector = new Vector3(xmin + spanX, zmin, ymin + spanY);
    this.octree = new Moctree(
      new Vector3(-spanX, 0, -spanY),
      new Vector3(spanX, zmax - zmin, spanY),
      this.maxLevel
    );

    this.depthMaterial.setVector3('minPoint', this.octree.minPoint);
    this.depthMaterial.setVector3('maxPoint', this.octree.maxPoint);

    this.additiveColorMaterial.setVector3('minPoint', this.octree.minPoint);
    this.additiveColorMaterial.setVector3('maxPoint', this.octree.maxPoint);

    // maintain compatibility with directly loading data
    if (data) {
      // load into first PCS
      const block = new MoctreeBlock(
        0,
        Moctree.startBlockIndex,
        Vector3.Zero(),
        Vector3.Zero(),
        -1,
        buffersToTransformedResult(
          data,
          this.translationVector.x,
          this.translationVector.y,
          this.translationVector.z,
          this.zScale,
          this.rgbMax
        )
      );

      this.loaded.set(block.mortonNumber, true);
      this.loadSystem(block);
    } else {
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
          zScale: this.zScale,
          rgbMax: this.rgbMax,
          bufferSize: this.bufferSize
        } as InitialRequest,
        this.loadSystem.bind(this),
        this.poolSize
      );

      this.scene.onBeforeRenderObservable.add((scene: Scene) => {
        this.beforeRender(scene);
      });
    }
  }

  public async fetchPoints() {
    if (this.workerPool?.isReady()) {
      const activeCamera: Camera | undefined = this.scene.activeCameras?.find(
        (camera: Camera) => {
          return !camera.name.startsWith('GUI');
        }
      );

      if (!activeCamera) {
        // nothing else to do
        return;
      }

      this.dropBlocks();
      const block = this.pending.pop();

      if (block) {
        this.loaded.set(block.mortonNumber, true);
        this.fetchBlock(block);
      }
    }
  }

  public dropBlocks() {
    const keys: number[] = [];
    for (const [key, value] of this.loaded) {
      if (!value) {
        keys.push(key);
      }
    }

    for (const key of keys) {
      const p = this.particleSystems.get(key);
      this.loaded.delete(key);

      if (p) {
        p.dispose();
        this.particleSystems.delete(key);
        this.visible.delete(key);
      }
    }
  }

  set metadata(m: Map<string, number>) {
    const ranges = [
      this.octree.maxPoint.x - this.octree.minPoint.x,
      this.octree.maxPoint.y - this.octree.minPoint.y,
      this.octree.maxPoint.z - this.octree.minPoint.z
    ];
    // TODO change this format to send morton codes in the node metadata from the server

    m.forEach((v, k) => {
      if (!k.startsWith('_')) {
        const parts = k.split('-').map(Number);
        // swap z and y
        const morton = encodeMorton(
          new Vector3(parts[1], parts[3], parts[2]),
          parts[0]
        );

        const blocksPerDimension = Math.pow(2, parts[0]);
        const stepX = ranges[0] / blocksPerDimension;
        const stepY = ranges[1] / blocksPerDimension;
        const stepZ = ranges[2] / blocksPerDimension;

        const minPoint = new Vector3(
          this.octree.minPoint.x + parts[1] * stepX,
          this.octree.minPoint.y + parts[3] * stepY,
          this.octree.minPoint.z + parts[2] * stepZ
        );
        const maxPoint = new Vector3(
          this.octree.minPoint.x + (parts[1] + 1) * stepX,
          this.octree.minPoint.y + (parts[3] + 1) * stepY,
          this.octree.minPoint.z + (parts[2] + 1) * stepZ
        );
        this.octree.blocklist.set(
          morton,
          new MoctreeBlock(parts[0], morton, minPoint, maxPoint, v)
        );
      }
    });
  }

  public calculateBlocks() {
    // Find the active camera of the scene
    const activeCamera: Camera | undefined = this.scene.activeCameras?.find(
      (camera: Camera) => {
        return !camera.name.startsWith('GUI');
      }
    );

    if (!activeCamera) {
      // nothing else to do
      return;
    }

    //Get the frustrum of the active camera to perform the visibility test for each octree block
    const planes = Frustum.GetPlanes(activeCamera.getTransformationMatrix());

    const slope = Math.tan(activeCamera.fov / 2);
    const height = this.scene.getEngine().getRenderHeight() / 2;
    if (!this.blockQueue) {
      this.blockQueue = new PriorityQueue(this.octree.blocklist.size);
    } else {
      this.blockQueue.reset();
    }
    const root = this.octree.blocklist.get(
      encodeMorton(new Vector3(0, 0, 0), 0)
    );
    if (root) {
      const rootScore =
        (height * root.boundingInfo.boundingSphere.radiusWorld) /
        (slope *
          activeCamera.position
            .subtract(root.boundingInfo.boundingSphere.centerWorld)
            .length());
      this.blockQueue.insert(rootScore, root);
      this.pending = [];
      let points = 0;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [key, _] of this.loaded) {
        this.loaded.set(key, false);
      }

      while (
        !this.blockQueue.isEmpty() &&
        points < this.pointBudget &&
        this.pending.length + this.loaded.size < 200
      ) {
        const block = this.blockQueue.extractMax().octreeBlock;
        if (!block) {
          break;
        }

        if (!block.boundingInfo.isInFrustum(planes)) {
          continue;
        }

        if (!this.loaded.has(block.mortonNumber)) {
          this.pending.push(block);
        } else {
          this.loaded.set(block.mortonNumber, true);
        }

        points +=
          this.octree.blocklist.get(block.mortonNumber)?.pointCount || 0;

        // Calculate children
        for (let i = 0; i < 8; ++i) {
          const code = (block.mortonNumber << 3) + i;

          if (!this.octree.blocklist.has(code)) {
            continue;
          }

          const child = this.octree.blocklist.get(code);
          if (child) {
            const childScore =
              (height * child.boundingInfo.boundingSphere.radiusWorld) /
              (slope *
                activeCamera.position
                  .subtract(child.boundingInfo.boundingSphere.centerWorld)
                  .length());

            if (childScore < this.screenSizeLimit) {
              continue;
            }
            this.blockQueue.insert(childScore, child);
          }
        }
      }

      if (points > this.pointBudget) {
        console.log('Point budget reached');
      }

      this.pending.reverse();
    }
  }

  private calculateOctreeTexture(): void {
    const keys = Array.from(this.visible.keys()).sort((a, b) => a - b);

    this.octreeTextureData.fill(0);
    let counter = 0;

    for (const key of keys) {
      const block = this.octree.blocklist.get(key);

      if (!block) {
        continue;
      }

      for (let i = 0; i < 8; ++i) {
        const code = (block.mortonNumber << 3) + i;

        if (!this.visible.has(code) || !this.visible.get(code)) {
          continue;
        }

        if (this.octreeTextureData[2 * counter] === 0) {
          // This is the first child so we need to find its index
          // in the keys array relatice to the current index
          this.octreeTextureData[2 * counter + 1] =
            keys.indexOf(code, counter + 1) - counter;
        }

        this.octreeTextureData[2 * counter] =
          this.octreeTextureData[2 * counter] | (1 << i);
      }

      ++counter;
    }

    this.octreeTexture.update(this.octreeTextureData);
  }

  public onResize(renderTargets: RenderTargetTexture[]) {
    this.depthMaterial.setFloat(
      'half_height',
      this.scene.getEngine().getRenderHeight() / 2
    );
    this.additiveColorMaterial.setFloat(
      'half_height',
      this.scene.getEngine().getRenderHeight() / 2
    );

    this.renderTargets = renderTargets;

    for (const [, pcs] of this.particleSystems) {
      if (!pcs.mesh) {
        throw new Error('Point cloud build failed');
      }

      this.renderTargets[0].setMaterialForRendering(
        pcs.mesh,
        this.depthMaterial
      );

      this.renderTargets[1].setMaterialForRendering(
        pcs.mesh,
        this.additiveColorMaterial
      );
    }
  }

  public beforeRender(scene: Scene) {
    if (this.useStreaming) {
      this.scene = scene;
      // initialize blocks here
      if (!this.isInitialized) {
        this.isInitialized = true;
        this.calculateBlocks();
      }
      this.fetchPoints();
      this.calculateOctreeTexture();
    }
  }
}

export default ArrayModel;
