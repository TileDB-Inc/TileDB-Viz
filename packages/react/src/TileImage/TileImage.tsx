import React from 'react';
import {
  TileDBTileImageOptions,
  TileImageViewer
} from '@tiledb-inc/viz-core';
import { createViewer } from '@tiledb-inc/viz-ui';
import classnames from 'classnames';

export interface TileImageVisualization
  extends Omit<TileDBTileImageOptions, 'rootElement'> {
  className?: string;
}

export const TileImageVisualization: React.FC<TileImageViewer> = (props: TileImageViewer) => {
  const { className, ...rest } = props;
  const rootDivElementRef = React.useRef<HTMLDivElement>(null);
  const instanceRef = React.useRef<TileImageVisualization>();

  React.useEffect(() => {
    if (instanceRef.current) {
      /**
       * Destroy current canvas on prop change
       */
      instanceRef.current?.destroy();
    }
    if (rootDivElementRef.current) {
      /**
       * Create visualization instance
       */
      instanceRef.current = new createViewer({
        ...rest,
        rootElement: rootDivElementRef.current
      });
    }
  }, [props]);

  return (
    <div
      ref={rootDivElementRef}
      className={classnames('TDB-Viz TDB-Viz--point-tile', className)}
    />
  );
};
