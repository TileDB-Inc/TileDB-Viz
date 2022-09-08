import React from 'react';

import { PointCloudVisuzalization } from '../PointCloud/PointCloud';
import data from '../../../../__mocks__/point-cloud-data.json';
import gltfData from '../../../../__mocks__/gltf-data.json';
import boulderData from '../../../../__mocks__/boulder.json';
import timeData from '../../../../__mocks__/point-cloud-time-data.json';

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
    data={data}
    mode="gltf"
    pointSize={5}
  />
);

export const PointCloud = Template.bind({});

export const TimeMode = () => (
  <PointCloudVisuzalization data={timeData} mode="time" />
);

export const Boulder = () => <PointCloudVisuzalization data={boulderData} />;
