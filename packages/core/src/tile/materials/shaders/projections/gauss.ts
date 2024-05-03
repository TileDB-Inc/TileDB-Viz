// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { FORTPI, HALF_PI } from './constants';
import { BaseProjection } from './base';

export class Gauss extends BaseProjection {
  public getName(): string {
    return 'gauss';
  }

  public getDependencies(): string[] {
    return [];
  }

  public getForwardSource(suffix = ''): string {
    return `
      fn gauss_forward_${suffix}(p: vec3<f32>) -> vec3<f32> {
        var lon: f32 = p.x;
        var lat: f32 = p.y;
      
        var y: f32 = 2 * atan(${this.projection.K} * pow(tan(0.5 * lat + ${FORTPI}), ${this.projection.C}) * srat(${this.projection.e} * sin(lat), ${this.projection.ratexp})) - ${HALF_PI};
        var x: f32 = ${this.projection.C} * lon;

        return vec3<f32>(x, y, p.z);
      }
    `;
  }

  public getInverseSource(suffix = ''): string {
    return `
      fn gauss_inverse_${suffix}(p: vec3<f32>) -> vec3<f32> {
        var point: vec3<f32> = p;
        const DEL_TOL: f32 = 1e-14;

        var lon: f32 = p.x / ${this.projection.C};
        var lat: f32 = p.y;
        var num = pow(tan(0.5 * lat + ${FORTPI}) / ${this.projection.K}, 1 / ${this.projection.C});
        for (var i: u32 = 20u; i > 0; i--) {
          lat = 2 * atan(num * srat(${this.projection.e} * sin(point.y), - 0.5 * ${this.projection.e})) - ${HALF_PI};
          if (abs(lat - point.y) < DEL_TOL) {
            break;
          }
          point.y = lat;
        }

        point.x = lon;
        point.y = lat;

        return point;
      }
    `;
  }
}
