import React from 'react';
import {
  TileDBVisualizationBaseOptions,
  TileDBImageVisualization
} from '@tiledb-inc/viz-core';

export const ImageVisualization = (
  props: Omit<TileDBVisualizationBaseOptions, 'rootElement'>
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
