import {
  ArcRotateCamera,
  Color3,
  Scene,
  StandardMaterial,
  SolidParticleSystem,
  Color4,
  MeshBuilder,
  Vector3
} from '@babylonjs/core';
import { TileDBVisualization, TileDBVisualizationBaseOptions } from '../base';

export interface TileDBMBRSVisualizationOptions
  extends TileDBVisualizationBaseOptions {
  /**
   * Data to render [all modes]
   */
  data: any;
  /**
   * Scale the z values of each point
   */
  zScale?: number;
  /**
   * The extends (min/max) of each mbrs
   */
  extents: number[];
}

export class TileDBMBRSVisualization extends TileDBVisualization {
  private _data: any;
  private _zScale: any;
  private _extents: number[];

  constructor(options: TileDBMBRSVisualizationOptions) {
    super(options);
    this._data = options.data;
    this._zScale = options.zScale;
    this._extents = options.extents;
  }

  protected async createScene(): Promise<Scene> {
    return super.createScene().then(scene => {
      const data = this._data;
      const extents = this._extents;
      const minx = extents[0];
      const maxx = extents[1];
      const miny = extents[2];
      const maxy = extents[3];
      const minz = extents[4];
      const xyLength = Math.min(
        Math.max(maxx) - Math.min(minx),
        Math.max(maxy) - Math.min(miny)
      );
      const scale = this._zScale;

      // set up camera
      scene.createDefaultCameraOrLight(true, true, true);
      const camera = scene.activeCamera as ArcRotateCamera;
      camera.alpha += Math.PI;
      camera.upperBetaLimit = Math.PI / 2;
      camera.panningAxis = new Vector3(1, 1, 0);
      camera.panningSensibility = 0.9;
      camera.panningInertia = 0.2;
      camera._panningMouseButton = 0;

      if (this.wheelPrecision > 0) {
        camera.wheelPrecision = this.wheelPrecision;
      }

      camera.setTarget(
        new Vector3(
          ((maxx + minx) / 2 - minx) / xyLength,
          0,
          ((maxy + miny) / 2 - miny) / xyLength
        )
      );
      camera.attachControl(this.canvas, false);

      const mat = new StandardMaterial('mt1', scene);
      mat.alpha = 0.85;
      mat.diffuseColor = new Color3(0, 0, 0);
      mat.emissiveColor = new Color3(0.5, 0.5, 0.5);

      // create initial particles
      const SPS = new SolidParticleSystem('SPS', scene, {
        enableDepthSort: true
      });
      const box = MeshBuilder.CreateBox('b', { height: 1, width: 1, depth: 1 });
      SPS.addShape(box, data.Xmin.length);
      const mesh = SPS.buildMesh();
      mesh.material = mat;
      box.dispose();

      // add dimensions and a random color to each of the particles
      SPS.initParticles = () => {
        for (let p = 0; p < SPS.nbParticles; p++) {
          const particle = SPS.particles[p];
          particle.position.x =
            ((data.Xmax[p] + data.Xmin[p]) / 2 - minx) / xyLength;
          particle.position.y =
            (((data.Zmax[p] + data.Zmin[p]) / 2 - minz) / xyLength) * scale;
          particle.position.z =
            ((data.Ymax[p] + data.Ymin[p]) / 2 - miny) / xyLength;
          particle.scaling.x = (data.Xmax[p] - data.Xmin[p]) / xyLength;
          particle.scaling.y =
            ((data.Zmax[p] - data.Zmin[p]) / xyLength) * scale;
          particle.scaling.z = (data.Ymax[p] - data.Ymin[p]) / xyLength;
          particle.color = new Color4(
            0.5 + Math.random() * 0.6,
            0.5 + Math.random() * 0.6,
            0.5 + Math.random() * 0.6,
            0.9
          );
        }
      };

      // update SPS mesh
      SPS.initParticles();
      SPS.setParticles();

      // animation
      scene.registerBeforeRender(() => {
        SPS.setParticles();
      });

      return scene;
    });
  }
}
