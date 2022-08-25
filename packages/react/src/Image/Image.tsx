import React from 'react';
import {
  TileImageVisualizationOptions,
  TileDBImageVisualization
} from '@tiledb-inc/viz-core';

export const ImageVisualization = (
  props: Omit<TileImageVisualizationOptions, 'rootElement'>
) => {
  const rootDivElementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (rootDivElementRef.current) {
      const visualization = new TileDBImageVisualization({
        ...props,
        rootElement: rootDivElementRef.current
      });

      visualization.render();
    }
  }, [rootDivElementRef]);
  return <div ref={rootDivElementRef} />;
};
