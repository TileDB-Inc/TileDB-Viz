import React from 'react';

import { TileImageVisualization } from '../TileImage/TileImage';

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

const Template = () => (
  <TileImageVisualization
    token={token}
    namespace={namespace}
    arrayID={'<array ID>'}
    //groupID={'<group ID>'}
    width={'100vw'}
    height={'100vh'}
  />
);

export const TileImage = Template.bind({});
