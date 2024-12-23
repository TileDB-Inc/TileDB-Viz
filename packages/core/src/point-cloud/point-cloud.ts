import {
  ArcRotateCamera,
  FreeCamera,
  Matrix,
  Plane,
  Scene,
  Vector3,
  Nullable,
  KeyboardEventTypes,
  PointerEventTypes,
  IWheelEvent,
  GizmoManager,
  Camera,
  FilesInput,
  SceneLoader,
  RenderTargetTexture,
  ISceneLoaderAsyncResult,
  Tags,
  ShaderMaterial
} from '@babylonjs/core';
import { TileDBVisualization } from '../base';
import ArrayModel from './model/array-model';
import {
  getArrayMetadata,
  getArraySchema,
  getPointCloud,
  ParticleShaderMaterial,
  PointCloudGUI,
  setCameraLight,
  setCameraPosition,
  setSceneColors,
  TileDBPointCloudOptions
} from './utils';
import { clearCache } from '../utils/cache';
import getTileDBClient from '../utils/getTileDBClient';
import { ArraySchema } from '@tiledb-inc/tiledb-cloud/lib/v1';
import { SPSHighQualitySplats } from './pipelines/high-quality-splats';
import { SparseResult } from './model/sparse-result';
import { MeshDepthMaterial } from './materials/depthShaderMaterial';
import { Events } from '@tiledb-inc/viz-components';
import { GUIEvent } from '@tiledb-inc/viz-common';

class TileDBPointCloudVisualization extends TileDBVisualization {
  private scene!: Scene;
  private cameras: Array<ArcRotateCamera | FreeCamera> = new Array<
    ArcRotateCamera | FreeCamera
  >();
  private options: TileDBPointCloudOptions;
  private model!: ArrayModel;
  private conformingBounds!: number[];
  private activeCamera!: number;
  private arraySchema!: ArraySchema;
  private gizmoManager!: GizmoManager;
  private renderTargets: RenderTargetTexture[] = [];
  private pipeline!: SPSHighQualitySplats;
  private depthMaterial!: ShaderMaterial;
  private arcCameraRadius = 25;

  constructor(options: TileDBPointCloudOptions) {
    super(options);
    this.options = options;
    this.activeCamera = 0;

    if (options.token || options.tiledbEnv) {
      getTileDBClient({
        ...(options.token ? { apiKey: options.token } : {}),
        ...(options.tiledbEnv ? { basePath: options.tiledbEnv } : {})
      });
    }
  }

  static async clearCache(storeName: string) {
    await clearCache(storeName);
  }

  attachKeys() {
    const clearIndexedDB = () => {
      if (this.options.namespace && this.options.groupName) {
        const storeName = `${this.options.namespace}:${this.options.groupName}`;

        clearCache(storeName);
      }
    };
    window.addEventListener(Events.CONFIRM_BOX_ACCEPT, clearIndexedDB, {
      capture: true
    });
    this.scene.onKeyboardObservable.add(kbInfo => {
      switch (kbInfo.type) {
        case KeyboardEventTypes.KEYDOWN:
          if (kbInfo.event.key === 'r') {
            this.model.debug = true;
          }
          if (
            kbInfo.event.code === 'Delete' ||
            kbInfo.event.code === 'Backspace'
          ) {
            window.dispatchEvent(
              new CustomEvent('confirmation-box::show', {
                bubbles: true
              })
            );
          }

          // toggle through arcRotate camera locations with 'v'
          if (kbInfo.event.key === 'v') {
            if (this.cameras[this.activeCamera].name === 'ArcRotate') {
              if (
                this.options.cameraLocation === 9 ||
                !this.options.cameraLocation
              ) {
                this.options.cameraLocation = 1;
              } else {
                this.options.cameraLocation = this.options.cameraLocation + 1;
              }
              const cameraPosition = setCameraPosition(
                this.conformingBounds,
                this.model.translationVector,
                this.options.cameraZoomOut || [1, 1, 1],
                this.options.cameraLocation
              );
              this.cameras[this.activeCamera].position = cameraPosition;
              this.model.calculateBlocks();
            }
          }

          // toggle between cameras with 'c'
          if (kbInfo.event.key === 'c') {
            if (this.activeCamera === 0) {
              this.activeCamera = 1;
            } else if (this.activeCamera === 1) {
              this.activeCamera = 0;
            }
            this.scene.activeCameras = [this.cameras[this.activeCamera]];
            this.scene.activeCameras[0].attachControl(false);
            if (this.model.particleMaterial) {
              this.model.particleMaterial.setShader(
                this.scene,
                this.model,
                this.options,
                this.engine
              );
            }
            this.model.calculateBlocks();
            this.pipeline.setActiveCamera();
            this.gizmoManager.utilityLayer.setRenderCamera(
              this.cameras[this.activeCamera]
            );
          }

          switch (kbInfo.event.key) {
            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
              this.model.calculateBlocks();
              break;
          }

          // toggle between background colors
          if (kbInfo.event.key === 'b') {
            if (this.model.colorScheme === 'dark') {
              this.model.colorScheme = 'light';
            } else if (this.model.colorScheme === 'light') {
              this.model.colorScheme = 'dark';
            }
            const sceneColors = setSceneColors(
              this.model.colorScheme as string
            );
            this.scene.clearColor = sceneColors.backgroundColor;
          }

          if (kbInfo.event.key === '1') {
            this.gizmoManager.rotationGizmoEnabled = false;
            this.gizmoManager.scaleGizmoEnabled = false;
            this.gizmoManager.positionGizmoEnabled =
              !this.gizmoManager.positionGizmoEnabled;
          }

          if (kbInfo.event.key === '2') {
            this.gizmoManager.rotationGizmoEnabled = false;
            this.gizmoManager.positionGizmoEnabled = false;
            this.gizmoManager.scaleGizmoEnabled =
              !this.gizmoManager.scaleGizmoEnabled;
          }

          if (kbInfo.event.key === '3') {
            this.gizmoManager.scaleGizmoEnabled = false;
            this.gizmoManager.positionGizmoEnabled = false;
            this.gizmoManager.rotationGizmoEnabled =
              !this.gizmoManager.rotationGizmoEnabled;
          }

          break;

        case KeyboardEventTypes.KEYUP:
          if (kbInfo.event.key === 'r') {
            this.model.debug = false;
          }
          break;
      }
    });
  }

  protected async createScene(): Promise<Scene> {
    return super.createScene().then(async scene => {
      this.scene = scene;

      window.dispatchEvent(
        new CustomEvent<GUIEvent<{ message: string; show: boolean }>>(
          Events.ENGINE_INFO_UPDATE,
          {
            bubbles: true,
            detail: {
              target: 'LOADING_SCREEN',
              props: {
                message: '',
                show: false
              }
            }
          }
        )
      );

      this.attachKeys();

      this.pipeline = new SPSHighQualitySplats(this.scene);
      if (!this.options.useSPS) {
        this.renderTargets = this.pipeline.initializeRTTs();
      }

      // initialize ParticleSystem
      this.model = new ArrayModel(this.scene, this.options, this.renderTargets);

      if (this.options.streaming) {
        const [octantMetadata, octreeBounds, conformingBounds, levels] =
          await getArrayMetadata(this.options);

        this.arraySchema = await getArraySchema(this.options);

        this.conformingBounds = [
          conformingBounds[0],
          conformingBounds[3],
          conformingBounds[1],
          conformingBounds[4],
          conformingBounds[2],
          conformingBounds[5]
        ];

        await this.model.init(
          octreeBounds[0],
          octreeBounds[3],
          octreeBounds[1],
          octreeBounds[4],
          octreeBounds[2],
          octreeBounds[5],
          this.conformingBounds,
          this.arraySchema,
          levels,
          this.options.rgbMax || 1.0
        );

        this.model.metadata = octantMetadata;
      } else {
        const pcData = await getPointCloud(this.options);
        if (pcData) {
          this.conformingBounds = [
            pcData.xmin,
            pcData.xmax,
            pcData.ymin,
            pcData.ymax,
            pcData.zmin,
            pcData.zmax
          ];
          await this.model.init(
            pcData.xmin,
            pcData.xmax,
            pcData.ymin,
            pcData.ymax,
            pcData.zmin,
            pcData.zmax,
            this.conformingBounds,
            this.arraySchema,
            1,
            this.options.rgbMax || 1.0,
            pcData.data as SparseResult
          );
        }
      }

      // set background color
      const sceneColors = setSceneColors(this.model.colorScheme as string);
      this.scene.clearColor = sceneColors.backgroundColor;

      // set up cameras and light
      this.cameras = setCameraLight(
        this.scene,
        this.options,
        this.conformingBounds,
        this.model.translationVector,
        this.moveSpeed,
        this.wheelPrecision
      );

      const activeCamera: Camera = this.scene?.activeCameras?.find(
        (camera: Camera) => {
          return !camera.name.startsWith('GUI');
        }
      ) as Camera;

      this.depthMaterial = MeshDepthMaterial(
        this.scene,
        activeCamera.minZ,
        activeCamera.maxZ
      );

      if (!this.options.useSPS) {
        this.pipeline.initializePostProcess(this.options);
      } else {
        // add shader
        this.model.particleMaterial = new ParticleShaderMaterial(
          scene,
          this.model.edlNeighbours,
          this.model.pointSize
        );

        this.model.particleMaterial.setShader(
          this.scene,
          this.model,
          this.options,
          this.engine
        );
      }

      // add interactive GUI
      new PointCloudGUI(
        this.scene,
        this.model,
        this.depthMaterial,
        this.rootElement,
        this.height
      );

      // add panning control
      let plane: Plane;
      let pickOrigin: Nullable<Vector3>;
      let isPanning = false;
      let zoomChanged = true;

      // register for onPointerDown as we need the keyboard state as well
      scene.onPointerDown = evt => {
        if (evt.ctrlKey || evt.shiftKey) {
          const pickResult = scene.pick(scene.pointerX, scene.pointerY);
          if (pickResult) {
            pickOrigin = pickResult.pickedPoint;
          }
          if (pickOrigin) {
            const normal = this.cameras[0].position
              .subtract(pickOrigin)
              .normalize();
            plane = Plane.FromPositionAndNormal(pickOrigin, normal);
            this.cameras[0].detachControl();
            isPanning = true;
          }
        }
      };

      scene.onPointerObservable.add(eventData => {
        switch (eventData.type) {
          case PointerEventTypes.POINTERWHEEL: {
            const event = eventData.event as IWheelEvent;
            const delta = event.deltaY;
            if (delta) {
              this.model.calculateBlocks();
            }
            zoomChanged = true;
            break;
          }
          case PointerEventTypes.POINTERUP: {
            isPanning = false;
            this.cameras[0].attachControl(true, true);
            this.model.calculateBlocks();
            break;
          }
          case PointerEventTypes.POINTERMOVE: {
            if (isPanning && pickOrigin) {
              const identity = Matrix.Identity();
              const ray = scene.createPickingRay(
                scene.pointerX,
                scene.pointerY,
                identity,
                this.cameras[0],
                false
              );
              const distance = ray.intersectsPlane(plane);
              if (distance === null) {
                return;
              }
              const pickedPoint = ray.direction.scale(distance).add(ray.origin);
              const diff = pickedPoint.subtract(pickOrigin);
              this.cameras[0].target.subtractInPlace(diff);
              break;
            }
          }
        }
      });

      if (!this.engine) {
        throw new Error('Engine is unitialized');
      }

      const filesInput = new FilesInput(
        this.engine,
        this.scene,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      );

      filesInput.onProcessFileCallback = ((
        file: File,
        name: string,
        extension: string
      ) => {
        SceneLoader.ImportMeshAsync('', '', file, scene).then(
          (result: ISceneLoaderAsyncResult) => {
            for (const mesh of result.meshes[0].getChildMeshes()) {
              if (mesh.material) {
                mesh.setParent(null);
                mesh.enableDistantPicking = true;
                mesh.renderingGroupId = 1;

                if (!this.renderTargets[0].renderList) {
                  throw new Error('Render target 0 is uninitialized');
                }

                this.renderTargets[0].renderList.push(mesh);
                this.renderTargets[0].setMaterialForRendering(
                  mesh,
                  this.depthMaterial
                );

                if (!this.renderTargets[1].renderList) {
                  throw new Error('Render target 1 is uninitialized');
                }

                this.renderTargets[1].renderList.push(mesh);

                Tags.AddTagsTo(mesh, 'Imported');
              }
            }

            result.meshes[0].dispose();
          }
        );
        return true;
      }).bind(this);

      filesInput.reload = function () {
        // do nothing.
      };
      filesInput.monitorElementForDragNDrop(this.canvas as HTMLElement);

      this.gizmoManager = new GizmoManager(scene);
      this.gizmoManager.usePointerToAttachGizmos = true;
      this.gizmoManager.utilityLayer.setRenderCamera(activeCamera);

      const pipeline = this.pipeline;
      const model = this.model;
      this.engine.onResizeObservable.add(() => {
        pipeline.resize();
        model.onResize(pipeline.renderTargets);

        for (const mesh of scene.getMeshesByTags('Imported')) {
          if (!this.renderTargets[0].renderList) {
            throw new Error('Render target 0 is uninitialized');
          }

          this.renderTargets[0].setMaterialForRendering(
            mesh,
            this.depthMaterial
          );
        }
      });

      this.scene.onBeforeRenderObservable.add(() => {
        if (zoomChanged && scene.activeCamera instanceof ArcRotateCamera) {
          zoomChanged = false;
          const ratio = this.arcCameraRadius / scene.activeCamera.radius;

          scene.activeCamera.panningSensibility = ratio * 100;
        }
      });

      return scene;
    });
  }
}

export default TileDBPointCloudVisualization;
