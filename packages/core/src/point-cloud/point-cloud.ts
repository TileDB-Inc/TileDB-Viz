import {
  ArcRotateCamera,
  FreeCamera,
  Matrix,
  Plane,
  Scene,
  Vector3,
  Nullable,
  KeyboardEventTypes
} from '@babylonjs/core';
import { TileDBVisualization } from '../base';
import { SparseResult } from './model';
import ArrayModel from './model/array-model';
import { getArrayMetadata, getPointCloud, setSceneColors } from './utils';
import { TileDBPointCloudOptions } from './utils/tiledb-pc';
import { clearCache } from '../utils/cache';
import getTileDBClient from '../utils/getTileDBClient';
import PointCloudGUI from './gui/point-cloud-gui';
import ParticleShaderMaterial from './model/particle-shader';
import { setCameraLight, setCameraPosition } from './utils/cameras_lights';

class TileDBPointCloudVisualization extends TileDBVisualization {
  private scene!: Scene;
  private cameras: Array<ArcRotateCamera | FreeCamera> = new Array<
    ArcRotateCamera | FreeCamera
  >();
  private options: TileDBPointCloudOptions;
  private model!: ArrayModel;
  private gui!: PointCloudGUI;
  private dataBounds!: number[];
  private activeCamera!: number;

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
            this.gui?.createConfirmationDialog(
              this.scene,
              "Are you sure you want to delete the array's cache?",
              'Clear cache',
              () => {
                if (this.options.namespace && this.options.arrayName) {
                  const storeName = `${this.options.namespace}:${this.options.arrayName}`;

                  clearCache(storeName);
                }
              }
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
                this.dataBounds,
                this.model.translationVector,
                this.options.cameraZoomOut || [1, 1, 1],
                this.options.cameraLocation
              );
              this.cameras[this.activeCamera].position = cameraPosition;
            }
          }

          // toggle between cameras with 'c'
          if (kbInfo.event.key === 'c') {
            if (this.activeCamera === 0) {
              this.activeCamera = 1;
            } else if (this.activeCamera === 1) {
              this.activeCamera = 0;
            }
            this.scene.activeCameras = [
              this.cameras[this.activeCamera],
              this.cameras[this.activeCamera + 2]
            ];
            this.scene.activeCameras[0].attachControl(true);
            this.scene.activeCameras[1].attachControl(true);
            if (this.model.particleMaterial) {
              this.model.particleMaterial.setShader(
                this.scene,
                this.model,
                this.options,
                this.engine
              );
            }
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

      this.gui = new PointCloudGUI(this.scene);
      if (this.gui.advancedDynamicTexture.layer !== null) {
        this.gui.advancedDynamicTexture.layer.layerMask = 0x10000000;
      }

      this.attachKeys();

      const sceneColors = setSceneColors(this.options.colorScheme as string);
      this.scene.clearColor = sceneColors.backgroundColor;

      // initialize ParticleSystem
      this.model = new ArrayModel(this.options);

      if (this.options.streaming) {
        const [octantMetadata, octreeBounds, dataBounds, levels] =
          await getArrayMetadata(this.options);

        this.dataBounds = [
          dataBounds[0],
          dataBounds[3],
          dataBounds[1],
          dataBounds[4],
          dataBounds[2],
          dataBounds[5]
        ];

        await this.model.init(
          this.scene,
          octreeBounds[0],
          octreeBounds[3],
          octreeBounds[1],
          octreeBounds[4],
          octreeBounds[2],
          octreeBounds[5],
          levels,
          this.options.rgbMax || 1.0
        );

        this.model.metadata = octantMetadata;
      } else {
        const pcData = await getPointCloud(this.options);
        if (pcData) {
          await this.model.init(
            this.scene,
            pcData.xmin,
            pcData.xmax,
            pcData.ymin,
            pcData.ymax,
            pcData.zmin,
            pcData.zmax,
            1,
            this.options.rgbMax || 1.0,
            pcData.data as SparseResult
          );
          this.dataBounds = [
            pcData.xmin,
            pcData.xmax,
            pcData.ymin,
            pcData.ymax,
            pcData.zmin,
            pcData.zmax
          ];
        }
      }

      // set up cameras and light
      this.cameras = setCameraLight(
        this.scene,
        this.options,
        this.dataBounds,
        this.model.translationVector,
        this.moveSpeed,
        this.wheelPrecision
      );

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

      // add panning control
      let plane: Plane;
      let pickOrigin: Nullable<Vector3>;
      let isPanning = false;
      let panCamera: ArcRotateCamera | FreeCamera = this.cameras[0];
      if (this.scene.activeCameras) {
        panCamera = this.cameras[0];
      }
      scene.onPointerDown = evt => {
        if (evt.ctrlKey || evt.shiftKey) {
          const pickResult = scene.pick(scene.pointerX, scene.pointerY);
          if (pickResult) {
            pickOrigin = pickResult.pickedPoint;
          } else {
            const ray = panCamera.getForwardRay();
            const block = this.model.octree.getContainingBlocksByRay(
              ray,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              this.model.maxLevel!
            )[0];
            pickOrigin = block.minPoint.add(
              block.maxPoint.subtract(block.minPoint).scale(0.5)
            );
          }

          if (pickOrigin) {
            const normal = panCamera.position.subtract(pickOrigin).normalize();
            plane = Plane.FromPositionAndNormal(pickOrigin, normal);
            isPanning = true;
          }
          panCamera.detachControl();
        }
      };

      scene.onPointerUp = () => {
        isPanning = false;
        panCamera.attachControl(true, true);
      };

      const identity = Matrix.Identity();
      scene.onPointerMove = evt => {
        if (isPanning && pickOrigin) {
          const ray = scene.createPickingRay(
            scene.pointerX,
            scene.pointerY,
            identity,
            panCamera,
            false
          );
          const distance = ray.intersectsPlane(plane);

          if (distance === null) {
            return;
          }
          const pickedPoint = ray.direction.scale(distance).add(ray.origin);
          const diff = pickedPoint.subtract(pickOrigin);
          panCamera.target.subtractInPlace(diff);
        }
      };

      return scene;
    });
  }
}

export default TileDBPointCloudVisualization;
