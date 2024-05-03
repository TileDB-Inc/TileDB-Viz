export const PJD_3PARAM = 1;
export const PJD_7PARAM = 2;
export const PJD_GRIDSHIFT = 3;
export const PJD_WGS84 = 4; // WGS84 or equivalent
export const PJD_NODATUM = 5; // WGS84 or equivalent
export const SRS_WGS84_SEMIMAJOR = 6378137.0; // only used in grid shift transforms
export const SRS_WGS84_SEMIMINOR = 6356752.314; // only used in grid shift transforms
export const SRS_WGS84_ESQUARED = 0.0066943799901413165; // only used in grid shift transforms
// eslint-disable-next-line
export const SEC_TO_RAD = 4.84813681109535993589914102357e-6;
export const HALF_PI: number = Math.PI / 2;
// ellipoid pj_set_ell.c
// eslint-disable-next-line
export const SIXTH = 0.1666666666666666667;
/* 1/6 */
// eslint-disable-next-line
export const RA4 = 0.04722222222222222222;
/* 17/360 */
// eslint-disable-next-line
export const RA6 = 0.02215608465608465608;
export const EPSLN = 1.0e-10;
// you'd think you could use Number.EPSILON above but that makes
// Mollweide get into an infinate loop.

// eslint-disable-next-line
export const D2R = 0.01745329251994329577;
// eslint-disable-next-line
export const R2D = 57.29577951308232088;
export const FORTPI: number = Math.PI / 4;
export const TWO_PI: number = Math.PI * 2;
// SPI is slightly greater than Math.PI, so values that exceed the -180..180
// degree range by a tiny amount don't get wrapped. This prevents points that
// have drifted from their original location along the 180th meridian (due to
// floating point error) from changing their sign.
export const SPI = 3.14159265359;
