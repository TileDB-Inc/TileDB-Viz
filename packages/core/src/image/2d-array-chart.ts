fetchTile = function (coord) {
  return new Promise(resolve => {
    fetch(
      `https://cyberjapandata.gsi.go.jp/xyz/dem/${coord.z}/${coord.x}/${coord.y}.txt`
    )
      .then(response => response.text())
      .then(text => text.split('\n'))
      .then(rows => rows.slice(0, rows.length - 1)) // Last row: empty
      .then(rows =>
        rows.map(r => r.split(',').map(d => (d === 'e' ? 0 : parseFloat(d))))
      ) // e: sea
      .then(data => resolve(data))
      .catch(error => {
        throw error;
      });
  });
};

function imshow(data, pixelSize, color) {
  // Flatten 2D input array
  const flat = [].concat.apply([], data);
  // Color Scale & Min-Max normalization
  const [min, max] = d3.extent(flat);
  const normalize = d => (d - min) / (max - min);
  const colorScale = d => color(normalize(d));
  // Shape of input array
  const shape = { x: data[0].length, y: data.length };

  // Set up canvas element
  const canvas = DOM.canvas(shape.x, shape.y);
  const context = canvas.getContext('2d');
  canvas.style.width = `${shape.x * pixelSize}px`;
  canvas.style.height = `${shape.y * pixelSize}px`;
  canvas.style.imageRendering = 'pixelated';

  // Draw pixels to the canvas
  const imageData = context.createImageData(shape.x, shape.y);
  flat.forEach((d, i) => {
    const color = isNaN(d) ? { r: 0, g: 0, b: 0 } : d3.color(colorScale(d));
    imageData.data[i * 4] = color.r;
    imageData.data[i * 4 + 1] = color.g;
    imageData.data[i * 4 + 2] = color.b;
    imageData.data[i * 4 + 3] = 255;
  });
  context.putImageData(imageData, 0, 0);

  return canvas;
}
