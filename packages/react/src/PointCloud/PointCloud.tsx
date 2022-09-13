import React from 'react';
import {
  TileDBPointCloudOptions,
  TileDBPointCloudVisualization
} from '@tiledb-inc/viz-core';
import classnames from 'classnames';

interface PointCloudVisualizationProps
  extends Omit<TileDBPointCloudOptions, 'rootElement'> {
  className?: string;
}

export const PointCloudVisualization: React.FC<
  PointCloudVisualizationProps
> = props => {
  const { className, ...rest } = props;
  const rootDivElementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (rootDivElementRef.current) {
      const visualization = new TileDBPointCloudVisualization({
        ...rest,
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
      ref={rootDivElementRef}
      className={classnames('TDB-Viz TDB-Viz--point-cloud', className)}
    />
  );
};
