import {
  ArcRotateCamera,
  Camera,
  Color3,
  DirectionalLight,
  Effect,
  HemisphericLight,
  KeyboardEventTypes,
  Matrix,
  Plane,
  PostProcess,
  Scene,
  Vector3
} from '@babylonjs/core';
import { TileDBVisualization } from '../base';
import { SparseResult } from './model';
import ArrayModel from './model/array-model';
import { getPointCloud, setSceneColors } from './utils';
import { TileDBPointCloudOptions } from './utils/tiledb-pc';
import { clearCache } from '../utils/cache';
import getTileDBClient from '../utils/getTileDBClient';
import PointCloudGUI from './gui/point-cloud-gui';

class TileDBPointCloudVisualization extends TileDBVisualization {
  private _scene!: Scene;
  private _cameras: Array<Camera> = new Array<Camera>();
  private _options: TileDBPointCloudOptions;
  private _model!: ArrayModel;
  private _gui!: PointCloudGUI;

  constructor(options: TileDBPointCloudOptions) {
    super(options);
    this._options = options;

    // initialize the TileDB client
    if (options.token) {
      getTileDBClient({
        apiKey: options.token
      });
    }
  }

  static async clearCache(storeName: string) {
    await clearCache(storeName);
  }

  attachKeys() {
    this._scene.onKeyboardObservable.add(kbInfo => {
      switch (kbInfo.type) {
        case KeyboardEventTypes.KEYDOWN:
          if (kbInfo.event.key === 'r') {
            this._model.debug = true;
          }
          if (
            kbInfo.event.code === 'Delete' ||
            kbInfo.event.code === 'Backspace'
          ) {
            this._gui?.createConfirmationDialog(
              this._scene,
              "Are you sure you want to delete the array's cache?",
              'Clear cache',
              () => {
                if (this._options.namespace && this._options.arrayName) {
                  const storeName = `${this._options.namespace}:${this._options.arrayName}`;

                  clearCache(storeName);
                }
              }
            );
          }
          break;
        case KeyboardEventTypes.KEYUP:
          if (kbInfo.event.key === 'r') {
            this._model.debug = false;
          }
          break;
      }
    });
  }

  protected async createScene(): Promise<Scene> {
    return super.createScene().then(async scene => {
      this._scene = scene;

      // load point cloud data extents and data if bounding box not provided
      const { data, xmin, xmax, ymin, ymax, zmin, zmax } = await getPointCloud(
        this._options
      );
      this.attachKeys();

      const sceneColors = setSceneColors(this._options.colorScheme as string);
      this._scene.clearColor = sceneColors.backgroundColor;

      // set up cameras
      const defaultRadius = 25;
      const camera = new ArcRotateCamera(
        'Camera',
        Math.PI / 3,
        Math.PI / 4.5,
        this._options.cameraRadius || defaultRadius,
        Vector3.Zero(),
        this._scene
      );

      camera.attachControl();
      this._cameras.push(camera);

      if (this.wheelPrecision > 0) {
        camera.wheelPrecision = this.wheelPrecision;
      }

      camera.setTarget(Vector3.Zero());

      const guiCamera = new ArcRotateCamera(
        'Camera',
        Math.PI / 3,
        Math.PI / 4.5,
        this._options.cameraRadius || defaultRadius,
        Vector3.Zero(),
        this._scene
      );
      guiCamera.layerMask = 0x10000000;

      guiCamera.setTarget(Vector3.Zero());

      this._cameras.push(guiCamera);
      this._scene.activeCameras = this._cameras;

      // add general light
      const light1: HemisphericLight = new HemisphericLight(
        'light1',
        camera.position,
        this._scene
      );
      light1.intensity = 0.9;
      light1.specular = Color3.Black();

      // add light for generating shadows
      const light2: DirectionalLight = new DirectionalLight(
        'Point',
        camera.cameraDirection,
        this._scene
      );
      light2.position = camera.position;
      light2.intensity = 0.7;
      light2.specular = Color3.Black();

      // initialize SolidParticleSystem
      this._model = new ArrayModel(this._options);
      await this._model.init(
        this._scene,
        xmin,
        xmax,
        ymin,
        ymax,
        zmin,
        zmax,
        this._options.rgbMax || 1.0,
        data as SparseResult
      );

      // add shader post-processing for EDL
      const edlStrength = this._options.edlStrength || 4.0;
      const edlRadius = this._options.edlRadius || 1.4;
      const neighbourCount = this._options.edlNeighbours || 8;
      const neighbours: number[] = [];
      for (let c = 0; c < neighbourCount; c++) {
        neighbours[2 * c + 0] = Math.cos((2 * c * Math.PI) / neighbourCount);
        neighbours[2 * c + 1] = Math.sin((2 * c * Math.PI) / neighbourCount);
      }

      const depthRenderer = this._scene.enableDepthRenderer(camera);
      const depthTex = depthRenderer.getDepthMap();

      const screenWidth = this.engine?.getRenderWidth();
      const screenHeight = this.engine?.getRenderHeight();

      const postProcess = new PostProcess(
        'My custom post process',
        'custom',
        ['screenWidth', 'screenHeight', 'neighbours', 'edlStrength', 'radius'],
        ['uEDLDepth'],
        1.0,
        camera
      );

      postProcess.onApply = function (effect: Effect) {
        effect.setFloat('screenWidth', screenWidth as number);
        effect.setFloat('screenHeight', screenHeight as number);
        effect.setArray2('neighbours', neighbours);
        effect.setFloat('edlStrength', edlStrength);
        effect.setFloat('radius', edlRadius);
        effect.setTexture('uEDLDepth', depthTex);
      };

      // add interactive GUI
      this._gui = new PointCloudGUI(this._scene);
      if (this._gui.advancedDynamicTexture.layer !== null) {
        this._gui.advancedDynamicTexture.layer.layerMask = 0x10000000;
      }
      await this._gui.init(
        this._scene,
        this._model,
        postProcess,
        screenWidth,
        screenHeight,
        neighbours,
        edlStrength,
        edlRadius,
        depthTex
      );

      // add panning control
      let plane: Plane;
      let pickOrigin: Vector3;
      let isPanning = false;
      scene.onPointerDown = evt => {
        if (evt.ctrlKey) {
          const pickResult = scene.pick(scene.pointerX, scene.pointerY);
          if (pickResult && pickResult.pickedPoint) {
            const normal = camera.position
              .subtract(pickResult.pickedPoint)
              .normalize();
            plane = Plane.FromPositionAndNormal(pickResult.pickedPoint, normal);
            pickOrigin = pickResult.pickedPoint;
            isPanning = true;
            camera.detachControl();
          }
        }
      };

      scene.onPointerUp = () => {
        isPanning = false;
        camera.attachControl(true, true);
      };

      const identity = Matrix.Identity();
      scene.onPointerMove = evt => {
        if (isPanning) {
          const ray = scene.createPickingRay(
            scene.pointerX,
            scene.pointerY,
            identity,
            camera,
            false
          );
          const distance = ray.intersectsPlane(plane);

          if (distance === null) {
            return;
          }
          const pickedPoint = ray.direction.scale(distance).add(ray.origin);
          const diff = pickedPoint.subtract(pickOrigin);
          camera.target.subtractInPlace(diff);
        }
      };
      return scene;
    });
  }
}

export default TileDBPointCloudVisualization;
