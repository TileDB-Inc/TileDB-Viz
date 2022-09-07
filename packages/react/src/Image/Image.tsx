import React from 'react';
import {
  TileImageVisualizationOptions,
  TileDBImageVisualization
} from '@tiledb-inc/viz-core';
import classnames from 'classnames';

interface ImageVisualizationProps
  extends Omit<TileImageVisualizationOptions, 'rootElement'> {
  className?: string;
}

export const ImageVisualization: React.FC<ImageVisualizationProps> = props => {
  const { className } = props;
  const rootDivElementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (rootDivElementRef.current) {
      const visualization = new TileDBImageVisualization({
        ...props,
        rootElement: rootDivElementRef.current
      });

      visualization.render();

      return () => {
        visualization.destroy();
      };
    }
  }, [rootDivElementRef]);
  return (
    <div
      className={classnames('TDB-Viz TDB-Viz--image', className)}
      ref={rootDivElementRef}
    />
  );
};
