function part1By1(x: number): number {
  x &= 0x0000ffff; // x = ---- ---- ---- ---- fedc ba98 7654 3210
  x = (x ^ (x << 8)) & 0x00ff00ff; // x = ---- ---- fedc ba98 ---- ---- 7654 3210
  x = (x ^ (x << 4)) & 0x0f0f0f0f; // x = ---- fedc ---- ba98 ---- 7654 ---- 3210
  x = (x ^ (x << 2)) & 0x33333333; // x = --fe --dc --ba --98 --76 --54 --32 --10
  x = (x ^ (x << 1)) & 0x55555555; // x = -f-e -d-c -b-a -9-8 -7-6 -5-4 -3-2 -1-0
  return x;
}

function part1By2(x: number): number {
  x &= 0x000003ff; // x = ---- ---- ---- ---- ---- --98 7654 3210
  x = (x ^ (x << 16)) & 0xff0000ff; // x = ---- --98 ---- ---- ---- ---- 7654 3210
  x = (x ^ (x << 8)) & 0x0300f00f; // x = ---- --98 ---- ---- 7654 ---- ---- 3210
  x = (x ^ (x << 4)) & 0x030c30c3; // x = ---- --98 ---- 76-- --54 ---- 32-- --10
  x = (x ^ (x << 2)) & 0x09249249; // x = ---- 9--8 --7- -6-- 5--4 --3- -2-- 1--0
  return x;
}

function compact1By1(x: number): number {
  x &= 0x55555555; // x = -f-e -d-c -b-a -9-8 -7-6 -5-4 -3-2 -1-0
  x = (x ^ (x >> 1)) & 0x33333333; // x = --fe --dc --ba --98 --76 --54 --32 --10
  x = (x ^ (x >> 2)) & 0x0f0f0f0f; // x = ---- fedc ---- ba98 ---- 7654 ---- 3210
  x = (x ^ (x >> 4)) & 0x00ff00ff; // x = ---- ---- fedc ba98 ---- ---- 7654 3210
  x = (x ^ (x >> 8)) & 0x0000ffff; // x = ---- ---- ---- ---- fedc ba98 7654 3210
  return x;
}

function compact1By2(x: number): number {
  x &= 0x09249249; // x = ---- 9--8 --7- -6-- 5--4 --3- -2-- 1--0
  x = (x ^ (x >> 2)) & 0x030c30c3; // x = ---- --98 ---- 76-- --54 ---- 32-- --10
  x = (x ^ (x >> 4)) & 0x0300f00f; // x = ---- --98 ---- ---- 7654 ---- ---- 3210
  x = (x ^ (x >> 8)) & 0xff0000ff; // x = ---- --98 ---- ---- ---- ---- 7654 3210
  x = (x ^ (x >> 16)) & 0x000003ff; // x = ---- ---- ---- ---- ---- --98 7654 3210
  return x;
}

export function encode2D(x: number, y: number, level: number): number {
  return (1 << (2 * level)) | ((part1By1(y) << 1) + part1By1(x));
}

export function decode2D(code: number): Array<number> {
  let mask = code;
  while (mask & (mask - 1)) {
    mask &= mask - 1;
  }
  code = code & ~mask;

  const x = compact1By1(code);
  const y = compact1By1(code >> 1);
  return [x, y];
}

export function encode3D(
  x: number,
  y: number,
  z: number,
  level: number
): number {
  return (
    (1 << (3 * level)) | ((part1By2(z) << 2) + (part1By2(y) << 1) + part1By2(x))
  );
}

export function decode3D(code: number): Array<number> {
  let mask = code;
  while (mask & (mask - 1)) {
    mask &= mask - 1;
  }
  code = code & ~mask;

  const x = compact1By2(code);
  const y = compact1By2(code >> 1);
  const z = compact1By2(code >> 2);
  return [x, y, z];
}
