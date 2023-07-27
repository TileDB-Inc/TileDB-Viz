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

export default capitalize;
