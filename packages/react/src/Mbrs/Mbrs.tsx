import React from 'react';
import {
  TileDBVisualizationBaseOptions,
  TileDBMBRSVisualization
} from '@tiledb-inc/viz-core';

export const MbrsVisualization = (
  props: Omit<TileDBVisualizationBaseOptions, 'rootElement'>
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
