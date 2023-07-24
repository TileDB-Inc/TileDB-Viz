import React, { useState, useMemo } from 'react';
import {
  TileDBTileImageOptions,
  TileDBTileImageVisualization
} from '@tiledb-inc/viz-core';
import './assets/scss/ImageViewer.scss';
import { Attribute, Dimension, LevelRecord, ImageMetadata } from '@tiledb-inc/viz-core';
import ToggleMenu from './components/ToggleMenu';
import Sidebar from './components/Sidebar';
import TileDBClient from '@tiledb-inc/tiledb-cloud';

export interface TileImageViewerProps extends TileDBTileImageOptions {
  metadata: ImageMetadata;
  attributes: Attribute[];
  dimensions: Dimension[];
  levels: LevelRecord[];
}

export const TileImageViewer: React.FC<TileImageViewerProps> = (
  props: TileImageViewerProps
) => {
  const [isSidebarVisible, toggleSidebarVisibility] = useState<boolean>(true);
  const rootDivElementRef = React.useRef<HTMLDivElement>(null);
  const instanceRef = React.useRef<TileDBTileImageVisualization>();

  const config = {
    apiKey: props.token,
    basePath: 'https://api.tiledb.com'
  };
  const client = useMemo(() => new TileDBClient(config), []);

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
      console.log(props);
      instanceRef.current = new TileDBTileImageVisualization({
        ...{...props, width: '100%', height: '100%'},
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

    props.attributes.at(0).visible = true;
  }, [props]);

  return (
    <div className="ImageViewer__container">
      <div className="ImageViewer__main">
        <div ref={rootDivElementRef} />
        <ToggleMenu
          toggleSidebarVisibility={() => {
            toggleSidebarVisibility((v: boolean) => !v);
          }}
          active={isSidebarVisible}
        />
      </div>
      <div
        className={`ImageViewer__sidebarContainer ${
          !isSidebarVisible ? 'ImageViewer__sidebarContainer--hidden' : ''
        }`}
      >
        <Sidebar
          client={client}
          namespace={props.namespace}
          baseGroup={null}
          levels={props.levels}
          channels={props.metadata.channels}
          attributes={props.attributes}
          dimensions={props.dimensions}
          // onGroupSelect={onGroupSelect}
          // onChannelUpdate={onChannelUpdate}
          // onDimensionUpdate={onDimensionUpdate}
          // onAttributeUpdate={onAttributeUpdate}
        />
      </div>
    </div>
  );
};
