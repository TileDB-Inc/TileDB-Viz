import { BaseProjection } from './base';

export class Sterea extends BaseProjection {
  public getName(): string {
    return 'sterea';
  }

  public getDependencies(): string[] {
    return ['gauss'];
  }
  public getForwardSource(suffix = ''): string {
    return `
      fn sterea_forward_${suffix}(p: vec3<f32>) -> vec3<f32> {
        var sinc: f32;
        var cosc: f32;
        var cosl: f32; 
        var k: f32;

        var point: vec3<f32> = p;

        point.x = adjust_lon(point.x - ${this.projection.long0});
        point = gauss_forward_${suffix}(point);
        sinc = sin(point.y);
        cosc = cos(point.y);
        cosl = cos(point.x);
        k = ${this.projection.k0} * ${this.projection.R2} / (1 + ${this.projection.sinc0} * sinc + ${this.projection.cosc0} * cosc * cosl);
        point.x = k * cosc * sin(point.x);
        point.y = k * (${this.projection.cosc0} * sinc - ${this.projection.sinc0} * cosc * cosl);
        point.x = ${this.projection.a} * point.x + ${this.projection.x0};
        point.y = ${this.projection.a} * point.y + ${this.projection.y0};

        return point;
      }
    `;
  }
  public getInverseSource(suffix = ''): string {
    return `
      fn sterea_inverse_${suffix}(p: vec3<f32>) -> vec3<f32> {
        var sinc: f32;
        var cosc: f32;
        var lon: f32;
        var lat: f32; 
        var rho: f32;
        var point: vec3<f32> = p;

        point.x = (point.x - ${this.projection.x0}) / ${this.projection.a};
        point.y = (point.y - ${this.projection.y0}) / ${this.projection.a};

        point.x /= ${this.projection.k0};
        point.y /= ${this.projection.k0};

        rho = hypot(point.x, point.y);
        
        if (rho != 0.0) {
          var c: f32 = 2 * atan2(rho, ${this.projection.R2});
          sinc = sin(c);
          cosc = cos(c);
          lat = asin(cosc * ${this.projection.sinc0} + point.y * sinc * ${this.projection.cosc0} / rho);
          lon = atan2(point.x * sinc, rho * ${this.projection.cosc0} * cosc - point.y * ${this.projection.sinc0} * sinc);
        }
        else 
        {
          lat = ${this.projection.phic0};
          lon = 0;
        }

        point.x = lon;
        point.y = lat;
        point = gauss_inverse_${suffix}(point);
        point.x = adjust_lon(point.x + ${this.projection.long0});

        return point;
      }
    `;
  }
}
