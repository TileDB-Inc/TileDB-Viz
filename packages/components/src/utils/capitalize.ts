function capitalize(str: string): string {
  const firstChar = str.charAt(0);

  return firstChar.toUpperCase() + str.slice(1);
}

export function rangeToPagination(
  currentPage: number,
  itemsPerPage: number,
  totalItems: number
): string {
  const startIndex = currentPage * itemsPerPage + 1;
  const endIndex = Math.min((currentPage + 1) * itemsPerPage, totalItems);

  return `${startIndex} - ${endIndex} of ${totalItems}`;
}

const componentToHex = (c: number): string => {
  const hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

export const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function hexToRgb(hex: string): {r: number, g: number, b: number} | null {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export default capitalize;
