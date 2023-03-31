import React from 'react';
import {
  TileDBImageVisualizationOptions,
  TileDBImageVisualization
} from '@tiledb-inc/viz-core';
import classNames from 'classnames';

export interface TileDBImageVisualizationProps
  extends Omit<TileDBImageVisualizationOptions, 'rootElement'> {
  className?: string;
}

export const ImageVisualization: React.FC<
  TileDBImageVisualizationProps
> = props => {
  const { className } = props;
  const rootDivElementRef = React.useRef<HTMLDivElement>(null);
  const instanceRef = React.useRef<TileDBImageVisualization>();

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
      instanceRef.current = new TileDBImageVisualization({
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
      className={classNames('TDB-Viz TDB-Viz--image', className)}
    />
  );
};
