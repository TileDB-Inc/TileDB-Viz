import React from 'react';
import {
  TileDBPointCloudOptions,
  TileDBPointCloudVisualization
} from '@tiledb-inc/viz-core';

export const CloudPointVisuzalization = (
  props: Omit<TileDBPointCloudOptions, 'rootElement'>
) => {
  const rootDivElementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    console.log('Loading visualiztion...');
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
