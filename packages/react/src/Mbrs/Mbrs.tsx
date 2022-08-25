import React from 'react';
import {
  TileDBMBRSVisualizationOptions,
  TileDBMBRSVisualization
} from '@tiledb-inc/viz-core';

export const MbrsVisualization = (
  props: Omit<TileDBMBRSVisualizationOptions, 'rootElement'>
) => {
  const rootDivElementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (rootDivElementRef.current) {
      const visualization = new TileDBMBRSVisualization({
        ...props,
        rootElement: rootDivElementRef.current
      });

      visualization.render();
    }
  }, [rootDivElementRef]);
  return <div ref={rootDivElementRef} />;
};
