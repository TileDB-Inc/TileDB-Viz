import { Material, RawTexture, Vector3 } from '@babylonjs/core';
import { LinearDepthMaterialPlugin } from './plugins/linearDepthPlugin';
import { RoundPointMaterialPlugin } from './plugins/roundPointPlugin';

export class LinearDepthMaterial {
  public material: any;

  constructor(
    material: Material,
    pointSize: number,
    visibilityTexture: RawTexture,
    minPoint: Vector3,
    maxPoint: Vector3,
    pointType: string
  ) {
    this.material = material.clone('LinearDepthMaterial');
    this.material.linearDepthMaterialPlugin = new LinearDepthMaterialPlugin(
      this.material
    );
    this.material.linearDepthMaterialPlugin.isEnabled = true;

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
  }
}
