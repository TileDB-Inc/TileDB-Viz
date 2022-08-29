import React from 'react';
import {
  TileDBPointCloudOptions,
  TileDBPointCloudVisualization
} from '@tiledb-inc/viz-core';
import useMount from '../hooks/useMount';
import useDidUpdateEffect from '../hooks/useDidUpdateEffect';

export type PointCloudVisuzalizationProps = Omit<
  TileDBPointCloudOptions,
  'rootElement'
>;

export const PointCloudVisuzalization: React.FC<
  PointCloudVisuzalizationProps
> = props => {
  const rootDivElementRef = React.useRef<HTMLDivElement>(null);
  const visualizationtRef = React.useRef<TileDBPointCloudVisualization>();

  useMount(() => {
    /**
     * Create the instance
     */
    visualizationtRef.current = new TileDBPointCloudVisualization({
      ...props,
      rootElement: rootDivElementRef.current as HTMLElement
    });

    /**
     * Initial rendering
     */
    visualizationtRef.current.render();
  });

  useDidUpdateEffect(() => {
    if (!visualizationtRef?.current) {
      return;
    }

    /**
     * Update instance's props and rerender the canvas
     */
    visualizationtRef.current.colorScheme = props.colorScheme as string;
    visualizationtRef.current.rerender();
  }, [props]);

  return <div ref={rootDivElementRef} />;
};
