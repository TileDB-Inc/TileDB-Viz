const pprintZoom = (zoom?: number): string => {
    if (typeof zoom === 'undefined') {
      return '-';
    }
  
    const percentage = 100 * Math.pow(2, zoom);
  
    return `${Math.floor(percentage)}%`;
  };
  
  export default pprintZoom;