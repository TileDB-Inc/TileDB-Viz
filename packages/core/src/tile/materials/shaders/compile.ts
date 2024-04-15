import proj4 from 'proj4';
import { functions } from './projections/common/functions';

import { Gauss } from './projections/gauss';
import { Sterea } from './projections/sterea';
import { Etmerc } from './projections/etmerc';
import { BaseProjection } from './projections/base';
import {
  D2R,
  HALF_PI,
  PJD_3PARAM,
  PJD_7PARAM,
  PJD_GRIDSHIFT,
  PJD_NODATUM,
  R2D,
  SRS_WGS84_ESQUARED,
  SRS_WGS84_SEMIMAJOR,
  SRS_WGS84_SEMIMINOR
} from './projections/constants';
import { LongLat } from './projections/longlat';
import { toWGSLArray } from './projections/common/helpers';
import { Geocent } from './projections/geocent';

export function shaderBuilder(
  sourceProjection: proj4.InterfaceProjection,
  targetProjection: proj4.InterfaceProjection
): string {
  console.log(sourceProjection, targetProjection, proj4.WGS84);

  // Get source projection dependencies
  const sourceProjectionShader = getProjection(sourceProjection as any);
  const sourceProjectionDependencies = sourceProjectionShader
    .getDependencies()
    .map(x => getProjection(sourceProjection as any, [x]));

  const targetProjectionShader = getProjection(targetProjection as any);
  const targetProjectionDependencies = targetProjectionShader
    .getDependencies()
    .map(x => getProjection(targetProjection as any, [x]));
  return `
    ${functions}

    ${sourceProjectionDependencies
      .map(x => x.getInverseSource('source'))
      .join('\n\n')}
    ${sourceProjectionShader.getInverseSource('source')}

    ${targetProjectionDependencies
      .map(x => x.getForwardSource('target'))
      .join('\n\n')}
    ${targetProjectionShader.getForwardSource('target')}

    ${getDatumUtils()}

    ${
      sourceProjection.datum &&
      targetProjection.datum &&
      checkNotWGS(sourceProjection, targetProjection)
        ? `
      ${getDatumTransform('wgs84', sourceProjection.datum, proj4.WGS84.datum)}
      ${getDatumTransform('', proj4.WGS84.datum, targetProjection.datum)}
      ${getTransform('wgs84', sourceProjection, proj4.WGS84)}
      ${getTransform('', proj4.WGS84, targetProjection)}
      `
        : `
      ${getDatumTransform('', sourceProjection.datum, targetProjection.datum)}
      ${getTransform('', sourceProjection, targetProjection)}
      `
    }

    fn project(p: vec3<f32>) -> vec3<f32> {
      var point: vec3<f32> = p;

      ${
        sourceProjection.datum &&
        targetProjection.datum &&
        checkNotWGS(sourceProjection, targetProjection)
          ? 'point = transform_wgs84(point);'
          : ''
      }

      point = transform_(point);

      return point;
    }

  `;
}

function getProjection(
  projection: proj4.InterfaceProjection & { names: string[] },
  names?: string[]
): BaseProjection {
  names = names ?? projection.names;

  if (names.includes('gauss')) {
    return new Gauss(projection);
  } else if (names.includes('sterea')) {
    return new Sterea(projection);
  } else if (names.includes('etmerc')) {
    return new Etmerc(projection);
  } else if (names.includes('longlat')) {
    return new LongLat(projection);
  } else if (names.includes('geocent')) {
    return new Geocent(projection);
  } else {
    throw new Error(`Unsupported projection with names ${names.join(', ')}`);
  }
}

function getTransform(
  suffix: string,
  sourceProjection: proj4.InterfaceProjection,
  targetProjection: proj4.InterfaceProjection
): string {
  const sourceProjectionShader = getProjection(sourceProjection as any);
  const targetProjectionShader = getProjection(targetProjection as any);

  return `
    fn transform_${suffix}(p: vec3<f32>) -> vec3<f32> {
      var point: vec3<f32> = p;
      // Workaround for datum shifts towgs84, if either source or destination projection is not wgs84

      // Transform source points to long/lat, if they aren't already.
      ${
        sourceProjection.projName === 'longlat'
          ? `point *= vec3<f32>(${D2R}, ${D2R}, 1.0);`
          : `
      ${
        sourceProjection.to_meter
          ? `point *= vec3<f32>(${sourceProjection.to_meter}, ${sourceProjection.to_meter}, 1.0);`
          : ''
      }
      point = ${sourceProjectionShader.getName()}_inverse_source(point); // Convert Cartesian to longlat
      `
      }

      // Adjust for the prime meridian if necessary
      ${
        sourceProjection.from_greenwich
          ? `point.x += ${sourceProjection.from_greenwich};`
          : ''
      }
    
      // Convert datums if needed, and if possible.
      point = datum_transform_${suffix}(point);
    
      // Adjust for the prime meridian if necessary
      ${
        targetProjection.from_greenwich
          ? `point.x -=  ${targetProjection.from_greenwich};`
          : ''
      }

      ${
        targetProjection.projName === 'longlat'
          ? `point *= vec3<f32>(${R2D}, ${R2D}, 1.0);`
          : `
      point = ${targetProjectionShader.getName()}_forward_target(point);
      ${
        targetProjection.to_meter
          ? `point /= vec3<f32>(${targetProjection.to_meter}, ${targetProjection.to_meter}, 1.0);`
          : ''
      }
      `
      }
    
      return point;
    }
  `;
}

function checkNotWGS(
  source: proj4.InterfaceProjection,
  dest: proj4.InterfaceProjection
) {
  return (
    ((source.datum.datum_type === PJD_3PARAM ||
      source.datum.datum_type === PJD_7PARAM ||
      source.datum.datum_type === PJD_GRIDSHIFT) &&
      dest.datumCode !== 'WGS84') ||
    ((dest.datum.datum_type === PJD_3PARAM ||
      dest.datum.datum_type === PJD_7PARAM ||
      dest.datum.datum_type === PJD_GRIDSHIFT) &&
      source.datumCode !== 'WGS84')
  );
}

function checkParams(type: number) {
  return type === PJD_3PARAM || type === PJD_7PARAM;
}

function compareDatums(
  source: proj4.InterfaceDatum,
  dest: proj4.InterfaceDatum
): boolean {
  if (source.datum_type !== dest.datum_type) {
    return false; // false, datums are not equal
  } else if (
    source.a !== dest.a ||
    Math.abs(source.es - dest.es) > 0.00000000005
  ) {
    // the tolerance for es is to ensure that GRS80 and WGS84
    // are considered identical
    return false;
  } else if (source.datum_type === PJD_3PARAM) {
    return (
      source.datum_params[0] === dest.datum_params[0] &&
      source.datum_params[1] === dest.datum_params[1] &&
      source.datum_params[2] === dest.datum_params[2]
    );
  } else if (source.datum_type === PJD_7PARAM) {
    return (
      source.datum_params[0] === dest.datum_params[0] &&
      source.datum_params[1] === dest.datum_params[1] &&
      source.datum_params[2] === dest.datum_params[2] &&
      source.datum_params[3] === dest.datum_params[3] &&
      source.datum_params[4] === dest.datum_params[4] &&
      source.datum_params[5] === dest.datum_params[5] &&
      source.datum_params[6] === dest.datum_params[6]
    );
  } else {
    return true; // datums are equal
  }
}

function getDatumTransform(
  suffix: string,
  sourceDatum: proj4.InterfaceDatum,
  targetDatum: proj4.InterfaceDatum
): string {
  return `
  fn datum_transform_${suffix}(p: vec3<f32>) -> vec3<f32> {
    // Short cut if the datums are identical.

    var point: vec3<f32> = p;

    ${compareDatums(sourceDatum, targetDatum) ? 'return point;' : ''}

    ${
      sourceDatum.datum_type === PJD_NODATUM ||
      targetDatum.datum_type === PJD_NODATUM
        ? 'return point;'
        : ''
    }
  
    // If this datum requires grid shifts, then apply it to geodetic coordinates.
    var source_a: f32 = ${sourceDatum.a};
    var source_es: f32 = ${sourceDatum.es};

    ${
      sourceDatum.datum_type === PJD_GRIDSHIFT
        ? ` // TODO Need a better way to implement that
      var gridShiftCode = applyGridShift(source, false, point);
      if (gridShiftCode !== 0) {
        return undefined;
      }
      source_a = ${SRS_WGS84_SEMIMAJOR};
      source_es = ${SRS_WGS84_ESQUARED};
    `
        : ''
    }
  
    var dest_a: f32 = ${targetDatum.a};
    var dest_b: f32 = ${targetDatum.b};
    var dest_es: f32 = ${targetDatum.es};

    ${
      targetDatum.datum_type === PJD_GRIDSHIFT
        ? `
    dest_a = ${SRS_WGS84_SEMIMAJOR};
    dest_b = ${SRS_WGS84_SEMIMINOR};
    dest_es = ${SRS_WGS84_ESQUARED};
    `
        : ''
    }

    ${
      !checkParams(sourceDatum.datum_type) &&
      !checkParams(targetDatum.datum_type)
        ? `
    if (source_es == dest_es && source_a == dest_a) {
      return point;
    }
    `
        : ''
    }
  
    // Convert to geocentric coordinates.
    point = geodeticToGeocentric(point, source_es, source_a);

    // Convert between datums
    ${
      checkParams(sourceDatum.datum_type)
        ? `
    point = geocentricToWgs84_P${
      sourceDatum.datum_type === PJD_3PARAM ? 3 : 7
    }(point, ${toWGSLArray(sourceDatum.datum_params)});
    `
        : ''
    }

    ${
      checkParams(targetDatum.datum_type)
        ? `
    point = geocentricFromWgs84_P${
      targetDatum.datum_type === PJD_3PARAM ? 3 : 7
    }(point, ${toWGSLArray(targetDatum.datum_params)});
    `
        : ''
    }

    point = geocentricToGeodetic(point, dest_es, dest_a, dest_b);

    ${
      targetDatum.datum_type === PJD_GRIDSHIFT
        ? `
    var destGridShiftResult = applyGridShift(dest, true, point);
    if (destGridShiftResult !== 0) {
      return undefined;
    }
    `
        : ''
    }
  
    return point;
  }
  `;
}

function getDatumUtils(): string {
  return `
  fn geodeticToGeocentric(p: vec3<f32>, es: f32, a: f32) -> vec3<f32> {
    var Longitude: f32 = p.x;
    var Latitude: f32 = p.y;
    var Height: f32 = p.z;
  
    var Rn: f32; 
    var Sin_Lat: f32; 
    var Sin2_Lat: f32; 
    var Cos_Lat: f32; 
  
    if (Latitude < -${HALF_PI} && Latitude > -1.001 * ${HALF_PI}) {
      Latitude = -${HALF_PI};
    } else if (Latitude > ${HALF_PI} && Latitude < 1.001 * ${HALF_PI}) {
      Latitude = ${HALF_PI};
    }
  
    if (Longitude > ${Math.PI}) {
      Longitude -= (2 * ${Math.PI});
    }

    Sin_Lat = sin(Latitude);
    Cos_Lat = cos(Latitude);
    Sin2_Lat = Sin_Lat * Sin_Lat;
    Rn = a / (sqrt(1.0e0 - es * Sin2_Lat));
    return vec3<f32>((Rn + Height) * Cos_Lat * cos(Longitude), (Rn + Height) * Cos_Lat * sin(Longitude), ((Rn * (1 - es)) + Height) * Sin_Lat);
  }

  fn geocentricToGeodetic(p: vec3<f32>, es: f32, a: f32, b: f32) -> vec3<f32> {
    const genau: f32 = 1e-12;
    const genau2: f32 = (genau * genau);
    const maxiter: u32 = 30u;
  
    var P: f32; 
    var RR: f32;
    var CT: f32; 
    var ST: f32; 
    var RX: f32;
    var RK: f32;
    var RN: f32; 
    var CPHI0: f32; 
    var SPHI0: f32; 
    var CPHI: f32; 
    var SPHI: f32; 
    var SDPHI: f32; 
  
    var X: f32 = p.x;
    var Y: f32 = p.y;
    var Z: f32 = p.z;
    var Longitude: f32;
    var Latitude: f32;
    var Height: f32;
  
    P = sqrt(X * X + Y * Y);
    RR = sqrt(X * X + Y * Y + Z * Z);
  
    if (P / a < genau) {
      Longitude = 0.0;
  
      if (RR / a < genau) {
        Latitude = ${HALF_PI};
        Height = -b;
        return p;
      }
    } else {
      Longitude = atan2(Y, X);
    }

    CT = Z / RR;
    ST = P / RR;
    RX = 1.0 / sqrt(1.0 - es * (2.0 - es) * ST * ST);
    CPHI0 = ST * (1.0 - es) * RX;
    SPHI0 = CT * RX;
  
    for (var iter: u32 = 0; iter < 30u; iter++) {
      RN = a / sqrt(1.0 - es * SPHI0 * SPHI0);
  
      Height = P * CPHI0 + Z * SPHI0 - RN * (1.0 - es * SPHI0 * SPHI0);
  
      RK = es * RN / (RN + Height);
      RX = 1.0 / sqrt(1.0 - RK * (2.0 - RK) * ST * ST);
      CPHI = ST * (1.0 - RK) * RX;
      SPHI = CT * RX;
      SDPHI = SPHI * CPHI0 - CPHI * SPHI0;
      CPHI0 = CPHI;
      SPHI0 = SPHI;

      if (SDPHI * SDPHI <= genau2) {
        break;
      }
    }
  
    Latitude = atan(SPHI / abs(CPHI));
    return vec3<f32>(Longitude, Latitude, Height);
  }

  fn geocentricToWgs84_P3(p: vec3<f32>, datum_params: array<f32, 3>) -> vec3<f32> {
    return vec3<f32>(p.x + datum_params[0], p.y + datum_params[1], p.z + datum_params[2]);
  }

  fn geocentricToWgs84_P7(p: vec3<f32>, datum_params: array<f32, 7>) -> vec3<f32> {
    let Dx_BF = datum_params[0];
    let Dy_BF = datum_params[1];
    let Dz_BF = datum_params[2];
    let Rx_BF = datum_params[3];
    let Ry_BF = datum_params[4];
    let Rz_BF = datum_params[5];
    let M_BF = datum_params[6];

    return vec3<f32>(M_BF * (p.x - Rz_BF * p.y + Ry_BF * p.z) + Dx_BF, M_BF * (Rz_BF * p.x + p.y - Rx_BF * p.z) + Dy_BF, M_BF * (-Ry_BF * p.x + Rx_BF * p.y + p.z) + Dz_BF);
  }

  fn geocentricFromWgs84_P3(p: vec3<f32>, datum_params: array<f32, 3>) -> vec3<f32> {
    return vec3<f32>(p.x - datum_params[0], p.y - datum_params[1], p.z - datum_params[2]);
  }

  fn geocentricFromWgs84_P7(p: vec3<f32>, datum_type: i32, datum_params: array<f32, 7>) -> vec3<f32> {
    let Dx_BF: f32 = datum_params[0];
    let Dy_BF: f32 = datum_params[1];
    let Dz_BF: f32 = datum_params[2];
    let Rx_BF: f32 = datum_params[3];
    let Ry_BF: f32 = datum_params[4];
    let Rz_BF: f32 = datum_params[5];
    let M_BF: f32 = datum_params[6];
    let x_tmp: f32 = (p.x - Dx_BF) / M_BF;
    let y_tmp: f32 = (p.y - Dy_BF) / M_BF;
    let z_tmp: f32 = (p.z - Dz_BF) / M_BF;

    return vec3<f32>(x_tmp + Rz_BF * y_tmp - Ry_BF * z_tmp, -Rz_BF * x_tmp + y_tmp + Rx_BF * z_tmp, Ry_BF * x_tmp - Rx_BF * y_tmp + z_tmp);
  }
  `;
}
