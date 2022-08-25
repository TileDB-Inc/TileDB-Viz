import React from 'react';

import { CloudPointVisuzalization } from '../CloudPoint/CloudPoint';
import data from './assets/data.json';
import gltf_data from './assets/gltf_data.json';

export default {
  title: 'Visualizations/CloudPointVisuzalization',
  component: CloudPointVisuzalization,
  argTypes: {
    color_scheme: {
      control: 'select',
      options: ['light', 'dark'],
      defaultValue: 'dark'
    }
  }
};

const Template = () => (
  <CloudPointVisuzalization
    mode="gltf"
    colorScheme="dark"
    width="800"
    height="600"
    wheelPrecision={-1}
    moveSpeed={-1}
    inspector={false}
    zScale={1}
    gltfData={gltf_data}
    data={data.data}
  />
);

export const CloudPoint = Template.bind({});
