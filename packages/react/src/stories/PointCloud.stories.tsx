import React from 'react';

import { PointCloudVisuzalization } from '../PointCloud/PointCloud';
import data from './assets/data.json';
import gltf_data from './assets/gltf_data.json';

export default {
  title: 'Visualizations/PointCloudVisuzalization',
  component: PointCloudVisuzalization,
  argTypes: {
    color_scheme: {
      control: 'select',
      options: ['light', 'dark'],
      defaultValue: 'dark'
    }
  }
};

const Template = () => (
  <PointCloudVisuzalization
    width="800"
    height="600"
    gltfData={gltf_data}
    data={data.data}
  />
);

export const PointCloud = Template.bind({});
