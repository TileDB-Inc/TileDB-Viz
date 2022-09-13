import {
  ArcRotateCamera,
  Scene,
  Vector3,
  Camera,
  HemisphericLight
} from '@babylonjs/core';
import { TileDBVisualization } from '../base';
import { SparseResult } from './model';
import ArrayModel from './model/array-model';
import { getPointCloud } from './utils';
import { TileDBPointCloudOptions } from './utils/tiledb-pc';
import { clearCache } from '../utils/cache';

class TileDBPointCloudVisualization extends TileDBVisualization {
  private _scene!: Scene;
  private _cameras: Array<Camera> = new Array<Camera>();
  private _options: TileDBPointCloudOptions;
  private _model!: ArrayModel;

  constructor(options: TileDBPointCloudOptions) {
    super(options);
    this._options = options;
  }

  static async clearCache() {
    await clearCache();
  }

  protected async createScene(): Promise<Scene> {
    return super.createScene().then(async scene => {
      this._scene = scene;

      /**
       * Load point cloud data extents and data if bound
       */
      const { data, xmin, xmax, ymin, ymax, zmin, zmax, rgbMax } =
        await getPointCloud(this._options);

      const defaultRadius = 25;
      const camera = new ArcRotateCamera(
        'Camera',
        Math.PI / 3,
        Math.PI / 4.5,
        this._options.cameraRadius || defaultRadius,
        Vector3.Zero(),
        scene
      );

      camera.attachControl();
      const light1: HemisphericLight = new HemisphericLight(
        'light1',
        new Vector3(-1, 1, 0),
        scene
      );
      light1.intensity = 0.8;

      if (this.wheelPrecision > 0) {
        camera.wheelPrecision = this.wheelPrecision;
      }

      camera.setTarget(Vector3.Zero());
      this._cameras.push(camera);

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

      return scene;
    });
  }
}

export default TileDBPointCloudVisualization;
