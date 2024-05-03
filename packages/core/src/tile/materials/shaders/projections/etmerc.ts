// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { toWGSLArray } from './common/helpers';
import { BaseProjection } from './base';

export class Etmerc extends BaseProjection {
  public getName(): string {
    return 'etmerc';
  }

  public getDependencies(): string[] {
    return [];
  }

  public getForwardSource(suffix = ''): string {
    return `
      fn etmerc_forward_${suffix}(p: vec3<f32>) -> vec3<f32> {
        var Ce: f32 = adjust_lon(p.x - ${this.projection.long0});
        var Cn: f32 = p.y;

        Cn = gatg6(${toWGSLArray(this.projection.cbg)}, Cn);
        var sin_Cn: f32 = sin(Cn);
        var cos_Cn: f32 = cos(Cn);
        var sin_Ce: f32 = sin(Ce);
        var cos_Ce: f32 = cos(Ce);

        Cn = atan2(sin_Cn, cos_Ce * cos_Cn);
        Ce = atan2(sin_Ce * cos_Cn, hypot(sin_Cn, cos_Cn * cos_Ce));
        Ce = asinhy(tan(Ce));

        var tmp: vec2<f32> = clens_cmplx6(${toWGSLArray(
          this.projection.gtu
        )}, 2 * Cn, 2 * Ce);

        Cn = Cn + tmp[0];
        Ce = Ce + tmp[1];

        var x: f32;
        var y: f32;

        
        x = ${this.projection.a} * (${this.projection.Qn} * Ce) + ${
      this.projection.x0
    };
        y = ${this.projection.a} * (${this.projection.Qn} * Cn + ${
      this.projection.Zb
    }) + ${this.projection.y0};
        

        return vec3<f32>(x, y, p.z);
      }
    `;
  }

  public getInverseSource(suffix = ''): string {
    return `
      fn etmerc_inverse_${suffix}(p: vec3<f32>) -> vec3<f32> {
        var Ce: f32 = (p.x - ${this.projection.x0}) * (1 / ${
      this.projection.a
    });
        var Cn: f32 = (p.y - ${this.projection.y0}) * (1 / ${
      this.projection.a
    });

        Cn = (Cn - ${this.projection.Zb}) / ${this.projection.Qn};
        Ce = Ce / ${this.projection.Qn};

        var lon: f32;
        var lat: f32;

        var tmp = clens_cmplx6(${toWGSLArray(
          this.projection.utg
        )}, 2 * Cn, 2 * Ce);

        Cn = Cn + tmp[0];
        Ce = Ce + tmp[1];
        Ce = atan(sinh(Ce));

        var sin_Cn: f32 = sin(Cn);
        var cos_Cn: f32 = cos(Cn);
        var sin_Ce: f32 = sin(Ce);
        var cos_Ce: f32 = cos(Ce);

        Cn = atan2(sin_Cn * cos_Ce, hypot(sin_Ce, cos_Ce * cos_Cn));
        Ce = atan2(sin_Ce, cos_Ce * cos_Cn);

        lon = adjust_lon(Ce + ${this.projection.long0});
        lat = gatg6(${toWGSLArray(this.projection.cgb)}, Cn);

        return vec3<f32>(lon, lat, p.z);
      }
    `;
  }
}
