export function toWGSLArray(values: Array<number>): string {
  return `array(${values.join(', ')})`;
}
