import { BaseProjection } from './base';

export class LongLat extends BaseProjection {
  public getName(): string {
    return 'longlat';
  }

  public getDependencies(): string[] {
    return [];
  }

  public getForwardSource(suffix = ''): string {
    return `
      fn longlat_forward_${suffix}(p: vec3<f32>) -> vec3<f32> {
        return p;
      }
    `;
  }

  public getInverseSource(suffix = ''): string {
    return `
      fn longlat_inverse_${suffix}(p: vec3<f32>) -> vec3<f32> {
        return p;
      }
    `;
  }
}
