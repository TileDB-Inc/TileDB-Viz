import {
  ArcRotateCamera,
  Color3,
  Scene,
  Vector3,
  Camera,
  DirectionalLight,
  HemisphericLight,
  PostProcess,
  KeyboardEventTypes,
  Plane,
  Matrix
  KeyboardEventTypes
} from '@babylonjs/core';
import { TileDBVisualization } from '../base';
import { SparseResult } from './model';
import ArrayModel from './model/array-model';
import { getPointCloud, setSceneColors } from './utils';
import { TileDBPointCloudOptions } from './utils/tiledb-pc';
import { clearCache } from '../utils/cache';
import getTileDBClient from '../utils/getTileDBClient';
import PointCloudGUI from './gui/point-cloud-gui';
import {
  AdvancedDynamicTexture,
  Button,
  Control,
  Grid,
  TextBlock,
  TextWrapping
} from '@babylonjs/gui';

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
      if (
        kbInfo.type === KeyboardEventTypes.KEYUP &&
        kbInfo.event.code === 'Delete'
      ) {
        console.log('User pressed Delete');
        this.createConfirmationDialog(
          "Are you sure you want to delete the array's cache?",
          'Clear cache'
        );
      }
    });
  }

  createConfirmationDialog(msg: string, titleText: string) {
    const advancedDynamicTexture = AdvancedDynamicTexture.CreateFullscreenUI(
      'CONFIRMATION_DIALOG',
      true,
      this._scene
    );

    const panel = new Grid();
    panel.background = '#f5f5f5';
    panel.width = 0.3;
    panel.height = 0.35;
    panel.setPadding('16px', '16px', '16px', '16px');
    advancedDynamicTexture.addControl(panel);

    const button = Button.CreateSimpleButton('acceptButton', 'Clear cache');
    button.width = 0.45;
    button.height = '36px';
    button.color = 'white';
    button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    button.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    button.left = 10;
    button.top = -8;
    button.background = '#0070f0';
    button.cornerRadius = 4;
    button.zIndex = 2;
    button.onPointerUpObservable.add(() => {
      if (this._options.namespace && this._options.arrayName) {
        const storeName = `${this._options.namespace}:${this._options.arrayName}`;

        clearCache(storeName);
      }
      panel.dispose();
    });
    panel.addControl(button);

    const button2 = Button.CreateSimpleButton('cancelButton', 'Cancel');
    button2.width = 0.45;
    button2.height = '36px';
    button2.color = '#333';
    button2.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    button2.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    button2.left = -10;
    button2.top = -8;
    button2.cornerRadius = 4;
    button2.zIndex = 2;
    button2.onPointerUpObservable.add(() => {
      panel.dispose();
    });
    panel.addControl(button2);

    const text = new TextBlock('dialogText');
    text.height = 1;
    text.color = 'black';
    text.textWrapping = TextWrapping.WordWrap;
    text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    text.text = msg;
    text.top = -10;
    panel.addControl(text);

    const title = new TextBlock('dialogTitle');
    title.height = 1;
    title.color = 'black';
    title.fontWeight = 'bold';
    title.fontSize = 18;
    title.textWrapping = TextWrapping.WordWrap;
    title.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    title.top = -50;
    title.text = titleText;
    panel.addControl(title);
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

      postProcess.onApply = function (effect: any) {
        effect.setFloat('screenWidth', screenWidth);
        effect.setFloat('screenHeight', screenHeight);
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

      // add debug for key press
      this._scene.onKeyboardObservable.add(kbInfo => {
        switch (kbInfo.type) {
          case KeyboardEventTypes.KEYDOWN:
            if (kbInfo.event.key === 'r') {
              this._model.debug = true;
            }
            break;
          case KeyboardEventTypes.KEYUP:
            if (kbInfo.event.key === 'r') {
              this._model.debug = false;
            }
            break;
        }
      });

      // add panning control
      let plane: Plane;
      let pickOrigin: Vector3;

      let isPanning = false;
      scene.onPointerDown = evt => {
        if (evt.ctrlKey) {
          const pickResult = scene.pick(scene.pointerX, scene.pointerY);
          if (pickResult?.pickedPoint) {
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
