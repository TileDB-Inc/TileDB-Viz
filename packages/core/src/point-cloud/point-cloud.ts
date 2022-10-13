import {
  ArcRotateCamera,
  Color3,
  Scene,
  Vector3,
  Camera,
  DirectionalLight,
  HemisphericLight,
  PostProcess
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

  protected async createScene(): Promise<Scene> {
    return super.createScene().then(async scene => {
      this._scene = scene;

      /**
       * Load point cloud data extents and data if bounding box not provided
       */
      const { data, xmin, xmax, ymin, ymax, zmin, zmax, rgbMax } =
        await getPointCloud(this._options);

      const sceneColors = setSceneColors(this._options.colorScheme as string);
      this._scene.clearColor = sceneColors.backgroundColor;

      /**
       * Set up camera
       */

      const defaultRadius = 25;
      const camera = new ArcRotateCamera(
        'Camera',
        Math.PI / 3,
        Math.PI / 4.5,
        this._options.cameraRadius || defaultRadius,
        Vector3.Zero(),
        this._scene
      );
      //scene.activeCamera = camera;
      // Then attach the activeCamera to the canvas.
      //Parameters: canvas, noPreventDefault
      //scene.activeCamera.attachControl(this.canvas, true);
      camera.attachControl();
      this._cameras.push(camera);
      //if (this._scene.activeCameras.length === 0) {
      //  this._scene.activeCameras.push(this._scene.activeCamera);
      //}

      //camera.attachControl(this.canvas, true);
      //camera.layerMask = 1;

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

      this._cameras.push(guiCamera);
      this._scene.activeCameras = this._cameras;

      /**
       * Set up lights
       */

      // general light
      const light1: HemisphericLight = new HemisphericLight(
        'light1',
        camera.position,
        this._scene
      );
      light1.intensity = 0.9;
      light1.specular = Color3.Black();

      // light for generating shadows
      const light2: DirectionalLight = new DirectionalLight(
        'Point',
        camera.cameraDirection,
        this._scene
      );
      light2.position = camera.position;
      light2.intensity = 0.7;
      light2.specular = Color3.Black();

      /**
       * Initialize SolidParticleSystem
       */

      this._model = new ArrayModel(this._options);
      await this._model.init(
        this._scene,
        xmin,
        xmax,
        ymin,
        ymax,
        zmin,
        zmax,
        rgbMax,
        data as SparseResult
      );

      /**
       * Shader post processing
       */
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

      postProcess.onApply = function (effect: any) {
        effect.setFloat('screenWidth', screenWidth);
        effect.setFloat('screenHeight', screenHeight);
        effect.setArray2('neighbours', neighbours);
        effect.setFloat('edlStrength', edlStrength);
        effect.setFloat('radius', edlRadius);
        effect.setTexture('uEDLDepth', depthTex);
      };

      /**
       * Interactive GUI
       */

      this._gui = new PointCloudGUI(this._scene);
      if (this._gui.advancedDynamicTexture.layer !== null) {
        this._gui.advancedDynamicTexture.layer.layerMask = 0x10000000;
        console.log('setting layerMask');
        console.log(this._gui.advancedDynamicTexture.layer.layerMask);
      }
      await this._gui.init(this._scene, this._model, this._options);

      return scene;
    });
  }
}

export default TileDBPointCloudVisualization;
