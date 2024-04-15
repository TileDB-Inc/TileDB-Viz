import { BaseProjection } from './base';

export class Geocent extends BaseProjection {
  public getName(): string {
    return 'geocent';
  }

  public getDependencies(): string[] {
    return [];
  }

  public getForwardSource(suffix = ''): string {
    return `
      fn geocent_forward_${suffix}(p: vec3<f32>) -> vec3<f32> {
        return geodeticToGeocentric(p, ${this.projection.es}, ${this.projection.a});
      }
    `;
  }

  public getInverseSource(suffix = ''): string {
    return `
      fn geocent_inverse_${suffix}(p: vec3<f32>) -> vec3<f32> {
        return geocentricToGeodetic(p, ${this.projection.es}, ${this.projection.a}, ${this.projection.b});
      }
    `;
  }
}
