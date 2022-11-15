import {
  ArcRotateCamera,
  Color3,
  Scene,
  Vector3,
  Camera,
  DirectionalLight,
  HemisphericLight,
  PostProcess,
  Plane,
  Matrix,
  Nullable
} from '@babylonjs/core';
import { TileDBVisualization } from '../base';
import { SparseResult } from './model';
import ArrayModel from './model/array-model';
import { getArrayMetadata, getPointCloud, setSceneColors } from './utils';
import { TileDBPointCloudOptions } from './utils/tiledb-pc';
import { clearCache } from '../utils/cache';
import getTileDBClient from '../utils/getTileDBClient';
import PointCloudGUI from './gui/point-cloud-gui';

class TileDBPointCloudVisualization extends TileDBVisualization {
  private scene!: Scene;
  private cameras: Array<Camera> = new Array<Camera>();
  private options: TileDBPointCloudOptions;
  private model!: ArrayModel;
  private gui!: PointCloudGUI;

  constructor(options: TileDBPointCloudOptions) {
    super(options);
    this.options = options;

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
          if (kbInfo.event.code === 'Delete') {
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
      this.scene = scene;

      // load point cloud data extents and data if bounding box not provided
      const { data, xmin, xmax, ymin, ymax, zmin, zmax } = await getPointCloud(
        this.options
      );
      this.attachKeys();

      const sceneColors = setSceneColors(this.options.colorScheme as string);
      this.scene.clearColor = sceneColors.backgroundColor;

      // set up cameras
      const defaultRadius = 25;
      const camera = new ArcRotateCamera(
        'Camera',
        Math.PI / 3,
        Math.PI / 4.5,
        this.options.cameraRadius || defaultRadius,
        Vector3.Zero(),
        this.scene
      );

      camera.attachControl();
      this.cameras.push(camera);

      if (this.wheelPrecision > 0) {
        camera.wheelPrecision = this.wheelPrecision;
      }

      camera.setTarget(Vector3.Zero());

      const guiCamera = new ArcRotateCamera(
        'Camera',
        Math.PI / 3,
        Math.PI / 4.5,
        this.options.cameraRadius || defaultRadius,
        Vector3.Zero(),
        this.scene
      );
      guiCamera.layerMask = 0x10000000;

      this.cameras.push(guiCamera);
      this.scene.activeCameras = this.cameras;

      // add general light
      const light1: HemisphericLight = new HemisphericLight(
        'light1',
        camera.position,
        this.scene
      );
      light1.intensity = 0.9;
      light1.specular = Color3.Black();

      // add light for generating shadows
      const light2: DirectionalLight = new DirectionalLight(
        'Point',
        camera.cameraDirection,
        this.scene
      );
      light2.position = camera.position;
      light2.intensity = 0.7;
      light2.specular = Color3.Black();

      // initialize SolidParticleSystem
      this.model = new ArrayModel(this.options);
      await this.model.init(
        this.scene,
        xmin,
        xmax,
        ymin,
        ymax,
        zmin,
        zmax,
        this.options.rgbMax || 1.0,
        data as SparseResult
      );

      if (this.options.streaming) {
        const metadata = await getArrayMetadata(this.options);
        this.model.metadata = metadata;
      }

      // add shader post-processing for EDL
      const edlStrength = this.options.edlStrength || 4.0;
      const edlRadius = this.options.edlRadius || 1.4;
      const neighbourCount = this.options.edlNeighbours || 8;
      const neighbours: number[] = [];
      for (let c = 0; c < neighbourCount; c++) {
        neighbours[2 * c + 0] = Math.cos((2 * c * Math.PI) / neighbourCount);
        neighbours[2 * c + 1] = Math.sin((2 * c * Math.PI) / neighbourCount);
      }

      const depthRenderer = this.scene.enableDepthRenderer(camera);
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

      postProcess.onApply = function (effect: any) {
        effect.setFloat('screenWidth', screenWidth);
        effect.setFloat('screenHeight', screenHeight);
        effect.setArray2('neighbours', neighbours);
        effect.setFloat('edlStrength', edlStrength);
        effect.setFloat('radius', edlRadius);
        effect.setTexture('uEDLDepth', depthTex);
      };

      // add interactive GUI
      this.gui = new PointCloudGUI(this.scene);
      if (this.gui.advancedDynamicTexture.layer !== null) {
        this.gui.advancedDynamicTexture.layer.layerMask = 0x10000000;
      }
      await this.gui.init(
        this.scene,
        this.model,
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
      let pickOrigin: Nullable<Vector3>;
      let isPanning = false;
      scene.onPointerDown = evt => {
        if (evt.ctrlKey) {
          const pickResult = scene.pick(scene.pointerX, scene.pointerY);
          if (pickResult) {
            pickOrigin = pickResult.pickedPoint;
          } else {
            const ray = camera.getForwardRay();
            const block = this.model.octree.getContainingBlocksByRay(
              ray,
              this.model.maxLevel
            )[0];
            pickOrigin = block.minPoint.add(
              block.maxPoint.subtract(block.minPoint).scale(0.5)
            );
          }

          if (pickOrigin) {
            const normal = camera.position.subtract(pickOrigin).normalize();
            plane = Plane.FromPositionAndNormal(pickOrigin, normal);
            isPanning = true;
          }
          camera.detachControl();
        }
      };

      scene.onPointerUp = () => {
        isPanning = false;
        camera.attachControl(true, true);
      };

      const identity = Matrix.Identity();
      scene.onPointerMove = evt => {
        if (isPanning && pickOrigin) {
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
