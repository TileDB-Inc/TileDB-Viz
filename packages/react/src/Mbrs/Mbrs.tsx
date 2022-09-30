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
  const instanceRef = React.useRef<TileDBMBRSVisualization>();

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
      instanceRef.current = new TileDBMBRSVisualization({
        ...props,
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
      className={classNames('TDB-Viz TDB-Viz--mbrs', className)}
    />
  );
};
