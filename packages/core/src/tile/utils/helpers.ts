export function range(start: number, end: number): Array<number> {
  return new Array(end - start).fill(0).map((_, k) => k + start);
}

export function hexToRgb(
  hex: string
): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

export function getViewArea(
  pointTR: { x: number; z: number },
  pointBR: { x: number; z: number },
  center: { x: number; z: number },
  pitch: number,
  rotation: number
): number[] {
  pointTR.z = pointTR.z / Math.abs(Math.cos(pitch));
  pointBR.z = pointBR.z / Math.abs(Math.cos(pitch));

  // Calculate new positions due to camera rotation (always offset by 3π/2)
  const s = Math.sin(rotation - Math.PI * 1.5);
  const c = Math.cos(rotation - Math.PI * 1.5);

  [pointTR.x, pointTR.z] = [
    pointTR.x * c - pointTR.z * s,
    pointTR.x * s + pointTR.z * c
  ];
  [pointBR.x, pointBR.z] = [
    pointBR.x * c - pointBR.z * s,
    pointBR.x * s + pointBR.z * c
  ];

  const offsetWidth = Math.max(Math.abs(pointTR.x), Math.abs(pointBR.x));
  const offsetHeight = Math.max(Math.abs(pointTR.z), Math.abs(pointBR.z));

  const [bottom, top] = [center.z + offsetHeight, center.z - offsetHeight].sort(
    (a, b) => a - b
  );
  const [left, right] = [center.x + offsetWidth, center.x - offsetWidth].sort(
    (a, b) => a - b
  );

  return [bottom, top, left, right];
}
