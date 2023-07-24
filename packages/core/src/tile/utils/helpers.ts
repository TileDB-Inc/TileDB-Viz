export function range(start: number, end: number): Array<number> {
  return new Array(end - start).fill(0).map((_, k) => k + start);
}
