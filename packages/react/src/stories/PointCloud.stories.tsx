import React from 'react';

import {
  PointCloudVisuzalization,
  PointCloudVisuzalizationProps
} from '../PointCloud/PointCloud';
import data from './assets/data.json';
import gltf_data from './assets/gltf_data.json';

export default {
  title: 'Visualizations/PointCloudVisuzalization',
  component: PointCloudVisuzalization,
  argTypes: {
    colorScheme: {
      control: 'select',
      options: ['light', 'dark'],
      defaultValue: 'dark'
    }
  }
};

const Template = (props: PointCloudVisuzalizationProps) => (
  <PointCloudVisuzalization
    width="800"
    height="600"
    gltfData={gltf_data}
    data={data.data}
    colorScheme={props.colorScheme}
  />
);

export const PointCloud = Template.bind({});
