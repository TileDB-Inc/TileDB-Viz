import React from 'react';
import {
  TileDBTileImageOptions,
  TileDBTileImageVisualization
} from '@tiledb-inc/viz-core';
import classnames from 'classnames';
import ToggleMenu from './components/ToggleMenu';

export interface TileImageVisualization
  extends Omit<TileDBTileImageOptions, 'rootElement'> {
  className?: string;
}

export const TileImageVisualization: React.FC<TileDBTileImageVisualization> = props => {
  const { className, ...rest } = props;
  const rootDivElementRef = React.useRef<HTMLDivElement>(null);
  const instanceRef = React.useRef<TileDBTileImageVisualization>();

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
      instanceRef.current = new TileDBTileImageVisualization({
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
    <div className="BioImageViewer__container">
      <div className="BioImageViewer__main">
        <div ref={rootDivElementRef}
          className={classnames('TDB-Viz TDB-Viz--tiles', className)}
        />y
        <ToggleMenu
          toggleSidebarVisibility={() => {
            toggleSidebarVisibility(v => !v);
          }}
          active={isSidebarVisible}
        />
      </div>
    </div>
  );
};
