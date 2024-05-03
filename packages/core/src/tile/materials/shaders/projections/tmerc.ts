// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import proj4 from 'proj4';
import { EPSLN } from './constants';

export class Tmerc {
  private projection: proj4.InterfaceProjection;

  constructor(projection: proj4.InterfaceProjection) {
    this.projection = projection;
  }

  get forwardSource(): string {
    return `
    fn tmerc_forward(p: vec3<f32>) -> vec3<f32> {
      var point: vec3<f32> = p;

      var lon: f32 = p.x;
      var lat: f32 = p.y;

      var delta_lon = adjust_lon(lon - ${this.projection.long0});
      var con: f32;
      var x: f32; 
      var y: f32;
      var sin_phi: f32 = sin(lat);
      var cos_phi: f32 = cos(lat);

      ${
        !this.projection.es
          ? `
        var b: f32 = cos_phi * sin(delta_lon);

        if ((abs(abs(b) - 1)) < ${EPSLN}) {
          return (93); // TODO: FIND CORRECT VALUE FOR WEBGPU
        }
        
        x = 0.5 * ${this.projection.a} * ${this.projection.k0} * log((1 + b) / (1 - b)) + ${this.projection.x0};
        y = cos_phi * cos(delta_lon) / sqrt(1 - Math.pow(b, 2));
        b = abs(y);
  
        if (b >= 1) {
          if ((b - 1) > ${EPSLN}) {
            return (93); // TODO: FIND CORRECT VALUE FOR WEBGPU
          }
          else {
            y = 0;
          }
        }
        else {
          y = acos(y);
        }
  
        if (lat < 0) {
          y = -y;
        }
  
        y = ${this.projection.a} * ${this.projection.k0} * (y - ${this.projection.lat0}) + ${this.projection.y0};
        
      `
          : `
        var al: f32 = cos_phi * delta_lon;
        var als: f32 = pow(al, 2);
        var c: f32 = ${this.projection.ep2} * pow(cos_phi, 2);
        var cs: f32 = pow(c, 2);
        var tq: f32 = abs(cos_phi) > ${EPSLN} ? tan(lat) : 0;
        var t: f32 = pow(tq, 2);
        var ts: f32 = pow(t, 2);
        con = 1 - ${this.projection.es} * pow(sin_phi, 2);
        al = al / sqrt(con);
        var ml: f32 = pj_mlfn(lat, sin_phi, cos_phi, array(${this.projection.en[0]}, ${this.projection.en[1]}, ${this.projection.en[2]}, ${this.projection.en[3]}, ${this.projection.en[4]}));

        x = ${this.projection.a} * (${this.projection.k0} * al * (1 + als / 6 * (1 - t + c + als / 20 * (5 - 18 * t + ts + 14 * c - 58 * t * c + als / 42 * (61 + 179 * ts - ts * t - 479 * t))))) + ${this.projection.x0};
        y = ${this.projection.a} * (${this.projection.k0} * (ml - ${this.projection.ml0} + sin_phi * delta_lon * al / 2 * (1 + als / 12 * (5 - t + 9 * c + 4 * cs + als / 30 * (61 + ts - 58 * t + 270 * c - 330 * t * c + als / 56 * (1385 + 543 * ts - ts * t - 3111 * t)))))) + ${this.projection.y0};
      `
      }

      return vec3<f32>(x, y, p.z);
    }
    `;
  }

  get inverseSource(): string {
    return `
    fn tmerc_inverse(p: vec3<f32>) -> vec3<f32> {
      
    }
    `;
  }
}
