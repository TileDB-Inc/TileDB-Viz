import { HALF_PI, SPI, TWO_PI } from '../constants';

export const functions = `
  fn adjust_lat(x: f32) -> f32 {
    return mix(x - sign(x) * ${Math.PI}, x, f32(abs(x) < ${HALF_PI}));
  }

  fn adjust_lon(x: f32) -> f32 {
    return mix(x - sign(x) * ${TWO_PI}, x, f32(abs(x) <= ${SPI}));
  }

  fn gatg6(pp: array<f32, 6>, B: f32) -> f32 {
    var cos_2B: f32 = 2 * cos(2 * B);
    var h1: f32 = pp[5];
    var h2: f32 = 0;
    var h: f32;

    for (var i: i32 = 4; i >= 0; i--) {
      h = -h2 + cos_2B * h1 + pp[i];
      h2 = h1;
      h1 = h;
    }
  
    return B + h * sin(2 * B);
  }

  fn hypot(x: f32, y: f32) -> f32 {
    var x0: f32 = abs(x);
    var y0: f32 = abs(y);
    var a: f32 = max(x0, y0);
    var b: f32 = min(x0, y0) / mix(1.0, a, f32(a != 0));
  
    return a * sqrt(1 + pow(b, 2));
  }

  fn log1py(x: f32) -> f32 {
    var y: f32 = 1 + x;
    var z: f32 = y - 1;
  
    return mix(x * log(y) / z, x, f32(z == 0));
  }

  fn asinhy(x: f32) -> f32 {
    var y: f32 = abs(x);
    y = log1py(y * (1 + y / (hypot(1, y) + 1)));
  
    return mix(y, -y, f32(x < 0));
  }

  fn clens_cmplx6(pp: array<f32, 6>, arg_r: f32, arg_i: f32) -> vec2<f32> {
    var sin_arg_r: f32 = sin(arg_r);
    var cos_arg_r: f32 = cos(arg_r);
    var sinh_arg_i: f32 = sinh(arg_i);
    var cosh_arg_i: f32 = cosh(arg_i);
    var r: f32 = 2 * cos_arg_r * cosh_arg_i;
    var i: f32 = -2 * sin_arg_r * sinh_arg_i;
    var hr = pp[5];
    var hi1: f32 = 0;
    var hr1: f32 = 0;
    var hi: f32 = 0;
    var hr2: f32;
    var hi2: f32;

    for (var j: i32 = 4; j >= 0; j--) {
      hr2 = hr1;
      hi2 = hi1;
      hr1 = hr;
      hi1 = hi;
      hr = -hr2 + r * hr1 - i * hi1 + pp[j];
      hi = -hi2 + i * hr1 + r * hi1;
    }

    r = sin_arg_r * cosh_arg_i;
    i = cos_arg_r * sinh_arg_i;

    return vec2<f32>(r * hr - i * hi, r * hi + i * hr);
  }

  fn srat(esinp: f32, exp: f32) -> f32 {
    return pow((1 - esinp) / (1 + esinp), exp);
  }
`;
