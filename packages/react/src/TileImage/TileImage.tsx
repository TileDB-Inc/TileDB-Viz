import React from 'react';
import {
  TileDBTileImageOptions,
  TileDBTileImageVisualization
} from '@tiledb-inc/viz-core';
import classnames from 'classnames';

export interface TileImageVisualizationProps
  extends Omit<TileDBTileImageOptions, 'rootElement'> {
  className?: string;
}

export const TileImageVisualization: React.FC<
  TileImageVisualizationProps
> = props => {
  const { className, ...rest } = props;
  const rootDivElementRef = React.useRef<HTMLDivElement>(null);
  const instanceRef = React.useRef<TileDBTileImageVisualization | undefined>(undefined);

  React.useEffect(() => {
    if (!rootDivElementRef.current) {
      return;
    }

    instanceRef.current?.destroy();

    const instance = new TileDBTileImageVisualization({
      ...rest,
      rootElement: rootDivElementRef.current
    });
    instanceRef.current = instance;
    instance.render();

    return () => {
      instance.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(rest));

  return (
    <div
      ref={rootDivElementRef}
      className={classnames('TDB-Viz TDB-Viz--tile-image', className)}
    />
  );
};
