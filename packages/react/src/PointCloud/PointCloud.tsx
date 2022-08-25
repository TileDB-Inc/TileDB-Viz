import React from 'react';
import {
  TileDBPointCloudOptions,
  TileDBPointCloudVisualization
} from '@tiledb-inc/viz-core';

export const PointCloudVisuzalization = (
  props: Omit<TileDBPointCloudOptions, 'rootElement'>
) => {
  const rootDivElementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (rootDivElementRef.current) {
      const visualization = new TileDBPointCloudVisualization({
        ...props,
        rootElement: rootDivElementRef.current
      });

      visualization.render();
    }
  }, [rootDivElementRef]);
  return <div ref={rootDivElementRef} />;
};
