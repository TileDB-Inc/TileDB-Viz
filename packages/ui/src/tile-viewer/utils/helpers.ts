export function range(start: number, end: number): Array<number> {
    return new Array(end - start).fill(0).map((_, k) => k + start);
  }
  
export function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
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