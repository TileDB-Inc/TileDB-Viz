# @tiledb-inc/viz-core

A collection of visualizations for TileDB arrays.


## PointCloud visualization

```javascript
import { TileDBPointCloudVisualization } from '@tiledb-inc/viz-core';

const visualization = new TileDBPointCloudVisualization({
  gltfData: gltfData,
  data: data,
  mode: 'gltf',
  width: '800',
  height: '600',
  rootElement: htlmElement
});

visualization.render();
```

## MBRS visualization

```javascript
import { TileDBMBRSVisualization } from '@tiledb-inc/viz-core';

const visualization = new TileDBMBRSVisualization({
  data: data,
  width: '800',
  height: '600',
  extents: [ 635577.79, 639003.73, 848882.15, 853537.66 ],
  rootElement: htlmElement
});

visualization.render();
```

## Image visualization

```javascript
import { TileDBImageVisualization } from '@tiledb-inc/viz-core';

const visualization = new TileDBImageVisualization({
  data: data,
  width: '800',
  height: '600',
  xyBbox: [11500, 14000, 11500, 14000],
  rootElement: htlmElement
});

visualization.render();
```