import { Material, RenderTargetTexture, Constants } from '@babylonjs/core';
import { AdditiveProximityMaterialPlugin } from './plugins/additiveProximityPlugin';
import { RoundPointMaterialPlugin } from './plugins/roundPointPlugin';

export class AdditiveProximityMaterial {
  public material: Material;

  constructor(
    baseMaterial: Material,
    blendLimit: number,
    linearDepthTexture: RenderTargetTexture
  ) {
    this.material = baseMaterial.clone('AdditiveProximityMaterial');

    this.material.roundPointMaterialPlugin = new RoundPointMaterialPlugin(
      this.material
    );
    this.material.roundPointMaterialPlugin.isEnabled = true;

    this.material.additiveProximityMaterialPlugin =
      new AdditiveProximityMaterialPlugin(this.material);
    this.material.additiveProximityMaterialPlugin.isEnabled = true;
    this.material.additiveProximityMaterialPlugin.blendLimit = blendLimit;
    this.material.additiveProximityMaterialPlugin.linearDepthTexture =
      linearDepthTexture;
    this.material.alpha = 0.9999;
    this.material.alphaMode = Constants.ALPHA_ONEONE_ONEONE;
  }
}
