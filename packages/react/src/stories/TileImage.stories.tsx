import React from 'react';

import { TileImageVisualization } from '../TileImage/TileImage';
import { FeatureType } from '@tiledb-inc/viz-common';

export default {
  title: 'Visualizations/TileImageVisualization',
  component: TileImageVisualization,
  argTypes: {
    color_scheme: {
      control: 'select',
      options: ['light', 'dark'],
      defaultValue: 'dark'
    }
  }
};

const token = process.env.STORYBOOK_REST_TOKEN ?? '';
const namespace = process.env.STORYBOOK_NAMESPACE ?? '';

let numWorkers: number = navigator.hardwareConcurrency;
if (process.env.STORYBOOK_NUM_WORKERS) {
  numWorkers = parseInt(process.env.STORYBOOK_NUM_WORKERS);
}

export const RasterPointCloud = () => (
  <TileImageVisualization
    engineAPI={'WEBGPU'}
    token={token}
    namespace={'TileDB-Inc'}
    arrayID={'tiledb://TileDB-Inc/ee5eae5f-9f68-4471-a762-99e966cada1c'}
    pointGroupID={['tiledb://TileDB-Inc/a89e17ae-4fc7-433f-a2ee-856ee0ecf216']}
    tileUris={[
      'https://api.pdok.nl/kadaster/3d-basisvoorziening/ogc/v1_0/collections/terreinen/3dtiles'
    ]}
    width={'100vw'}
    height={'100vh'}
    defaultChannels={[
      { index: 1, intensity: 2000 },
      { index: 2, intensity: 2000 },
      { index: 3, intensity: 2000 }
    ]}
    sceneConfig={{
      pointConfigs: [
        {
          pickable: false,
          features: [
            {
              name: 'Height',
              type: FeatureType.RGB,
              interleaved: true,
              attributes: [
                {
                  name: 'Red',
                  normalize: true,
                  normalizationWindow: { min: 0, max: 255 }
                },
                {
                  name: 'Green',
                  normalize: true,
                  normalizationWindow: { min: 0, max: 255 }
                },
                {
                  name: 'Blue',
                  normalize: true,
                  normalizationWindow: { min: 0, max: 255 }
                }
              ]
            }
          ]
        }
      ]
    }}
  />
);
