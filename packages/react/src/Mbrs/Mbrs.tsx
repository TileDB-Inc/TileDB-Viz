import React from 'react';
import {
  TileDBMBRSVisualizationOptions,
  TileDBMBRSVisualization
} from '@tiledb-inc/viz-core';
import classNames from 'classnames';

interface TileDBMBRSVisualizationProps
  extends Omit<TileDBMBRSVisualizationOptions, 'rootElement'> {
  className?: string;
}

export const MbrsVisualization: React.FC<
  TileDBMBRSVisualizationProps
> = props => {
  const { className } = props;
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
  return (
    <div
      ref={rootDivElementRef}
      className={classNames('TDB-Viz TDB-Viz--mbrs', className)}
    />
  );
};
