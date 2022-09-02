import React from 'react';

import { PointCloudVisuzalization } from '../PointCloud/PointCloud';
import data from './assets/data.json';
import gltfData from './assets/gltf_data.json';
import boulderData from './assets/boulder.json';

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
    gltfData={gltfData}
    data={data.data}
    mode="gltf"
    pointSize={5}
  />
);

export const PointCloud = Template.bind({});

export const Boulder = () => <PointCloudVisuzalization data={boulderData} />;
