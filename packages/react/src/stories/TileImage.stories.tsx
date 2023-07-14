import React from 'react';

import { TileImageVisualization } from '../TileImage/TileImage';

export default {
  title: 'Visualizations/PointCloudVisualization',
  component: TileImageVisualization,
  argTypes: {
    color_scheme: {
      control: 'select',
      options: ['light', 'dark'],
      defaultValue: 'dark'
    }
  }
};

const token = process.env.STORYBOOK_REST_TOKEN;
const namespace = process.env.STORYBOOK_NAMESPACE;

const Template = () => (
  <TileImageVisualization
    token={token}
    namespace={'xanthos-xanthopoulos'}
    assetID={'arrayID'}
    width={'100vw'}
    height={'100vh'}
  />
);

export const TileImage = Template.bind({});