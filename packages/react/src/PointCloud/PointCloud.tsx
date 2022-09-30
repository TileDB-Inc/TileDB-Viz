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
  const instanceRef = React.useRef<TileDBPointCloudVisualization>();

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
      instanceRef.current = new TileDBPointCloudVisualization({
        ...rest,
        rootElement: rootDivElementRef.current
      });

      /**
       * Render canvas
       */
      instanceRef.current?.render();

      /**
       * Destroy canvas on unmount
       */
      return () => {
        instanceRef.current?.destroy();
      };
    }
  }, [props]);

  return (
    <div
      ref={rootDivElementRef}
      className={classnames('TDB-Viz TDB-Viz--point-cloud', className)}
    />
  );
};
