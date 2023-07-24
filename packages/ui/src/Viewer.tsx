import React, { useEffect, useState } from 'react';
import { getAssetMetadata } from '@tiledb-inc/viz-core';
import { AssetMetadata, LevelRecord, Attribute, Dimension } from '@tiledb-inc/viz-core';
import { TileImageViewer } from './tile-viewer';

interface ViewerProps {
  token: string;
  basePath?: string;
  baseGroup?: string;
  namespace: string;
  assetID: string;
  width?: string;
  height?: string;
  onError?: (err: Error) => void;
  onLoad?: () => void;
}

interface ViewerState {
  metadata: AssetMetadata;
  attributes: Attribute[];
  dimensions: Dimension[];
  levels: LevelRecord[];
}

const Viewer: React.FC<ViewerProps> = (props: ViewerProps) => {
  const [state, setState] = useState<ViewerState>(null);


  useEffect(() => {
    getAssetMetadata({
      namespace: props.namespace,
      assetID: props.assetID,
      tiledbEnv: props.basePath,
      token: props.token
    }).then((value: [AssetMetadata, Attribute[], Dimension[], LevelRecord[]]) => {
      const [metadata, attributes, dimensions, levels] = value;
      setState((st: ViewerState) => ({...st, metadata, attributes, dimensions, levels}));
    });
  }, []);

  return (
    <>
      {(() => {
        switch (state?.metadata?.dataset_type) {
          case 'BIOIMG':
            return <TileImageViewer {...{...state, ...props}} />;
          case 'RASTER':
            break;
          case 'POINTCLOUD':
            // return <PointCloudViewer />
            break;
          default:
            return <p>PPPPPP</p>
            break;
        }
      })()}
    </>
  );
};

export default Viewer;
