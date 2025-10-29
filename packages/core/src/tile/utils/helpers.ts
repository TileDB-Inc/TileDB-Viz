export function range(start: number, end: number): Array<number> {
  return new Array(end - start).fill(0).map((_, k) => k + start);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
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

export function splitEventTarget(target: string): string[] {
  const tokens = target.split('_');

  if (tokens.length === 0) {
    throw new Error('[TileDB-Viz][splitEventTarget] Event target is empty');
  }

  // New ids have the format of ast_<hex string>, grp_<hex_string> or arr_<hex_string>
  // Target for asset managers always starts with the ID of the resource so the first token should be `ast`, `grp` or `arr`
  if (['ast', 'grp', 'arr'].includes(tokens[0])) {
    if (tokens.length <= 1) {
      throw new Error(
        `[TileDB-Viz][splitEventTarget] Event target '${target}' is too short`
      );
    }

    return [tokens.slice(0, 2).join('_'), ...tokens.slice(2)];
  }

  return tokens;
}
