import {
  ArcRotateCamera,
  Color3,
  Scene,
  StandardMaterial,
  Color4,
  MeshBuilder,
  Vector3,
  Texture
} from '@babylonjs/core';
import { TileDBVisualization } from './TileDBVisualizationBase';

export class TileDBImageViewVisualization extends TileDBVisualization {
  protected async createScene(): Promise<Scene> {
    return super.createScene().then(scene => {
      const data = this._values.data;
      const bbox = this._values.xy_bbox;

      scene.createDefaultCameraOrLight(true, true, true);
      scene.clearColor = new Color4(0.95, 0.94, 0.92, 1);

      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);

      const groundMaterial = new StandardMaterial('ground', scene);
      groundMaterial.diffuseTexture = new Texture(url, scene);
      groundMaterial.ambientTexture = new Texture(url, scene);
      groundMaterial.ambientColor = new Color3(0.5, 0.5, 0.5);
      groundMaterial.diffuseColor = new Color3(0.8, 0.8, 0.8);
      groundMaterial.specularColor = new Color3(0.5, 0.5, 0.5);
      groundMaterial.specularPower = 32;

      const xmin = bbox[0];
      const xmax = bbox[1];
      const ymin = bbox[2];
      const ymax = bbox[3];

      const ground = MeshBuilder.CreateGround(
        'ground',
        {
          height: (xmax - xmin) * 0.005,
          width: (ymax - ymin) * 0.005,
          subdivisions: 36
        },
        scene
      );
      ground.material = groundMaterial;

      const camera = scene.activeCamera as ArcRotateCamera;
      camera.panningAxis = new Vector3(1, 1, 0);
      camera.upperBetaLimit = Math.PI / 2;
      camera.panningSensibility = 1;
      camera.panningInertia = 0.2;
      camera._panningMouseButton = 0;

      if (this.wheelPrecision > 0) {
        camera.wheelPrecision = this.wheelPrecision;
      }

      camera.alpha += Math.PI;
      camera.attachControl(this.canvas, false);

      return scene;
    });
  }
}
