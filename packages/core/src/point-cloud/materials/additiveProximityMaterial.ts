import {
  Material,
  RenderTargetTexture,
  Constants,
  RawTexture,
  Vector3
} from '@babylonjs/core';
import { AdditiveProximityMaterialPlugin } from './plugins/additiveProximityPlugin';
import { RoundPointMaterialPlugin } from './plugins/roundPointPlugin';

export class AdditiveProximityMaterial {
  public material: any;

  constructor(
    baseMaterial: Material,
    blendLimit: number,
    pointSize: number,
    linearDepthTexture: RenderTargetTexture,
    visibilityTexture: RawTexture,
    minPoint: Vector3,
    maxPoint: Vector3,
    pointType: string
  ) {
    this.material = baseMaterial.clone('AdditiveProximityMaterial');

    this.material.roundPointMaterialPlugin = new RoundPointMaterialPlugin(
      this.material
    );
    this.material.roundPointMaterialPlugin.isEnabled = true;
    this.material.roundPointMaterialPlugin.radius = pointSize;

    this.material.roundPointMaterialPlugin.visibilityTexture =
      visibilityTexture;
    this.material.roundPointMaterialPlugin.minPoint = minPoint;
    this.material.roundPointMaterialPlugin.maxPoint = maxPoint;
    this.material.roundPointMaterialPlugin.pointType = pointType;

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
