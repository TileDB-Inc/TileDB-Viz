import { Material } from '@babylonjs/core';
import { LinearDepthMaterialPlugin } from './plugins/linearDepthPlugin';
import { RoundPointMaterialPlugin } from './plugins/roundPointPlugin';

export class LinearDepthMaterial {
  public material: Material;

  constructor(material: Material) {
    this.material = material.clone('LinearDepthMaterial');
    this.material.linearDepthMaterialPlugin = new LinearDepthMaterialPlugin(
      this.material
    );
    this.material.linearDepthMaterialPlugin.isEnabled = true;

    this.material.roundPointMaterialPlugin = new RoundPointMaterialPlugin(
      this.material
    );
    this.material.roundPointMaterialPlugin.isEnabled = true;
  }
}
