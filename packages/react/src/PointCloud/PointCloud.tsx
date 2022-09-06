import React from 'react';
import {
  TileDBPointCloudOptions,
  TileDBPointCloudVisualization
} from '@tiledb-inc/viz-core';
import classnames from 'classnames';

interface PointCloudVisuzalizationProps
  extends Omit<TileDBPointCloudOptions, 'rootElement'> {
  className?: string;
}

export const PointCloudVisuzalization: React.FC<
  PointCloudVisuzalizationProps
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
    }
  }, [rootDivElementRef]);
  return (
    <div
      ref={rootDivElementRef}
      className={classnames('TDB-Viz TDB-Viz--point-cloud', className)}
    />
  );
};
