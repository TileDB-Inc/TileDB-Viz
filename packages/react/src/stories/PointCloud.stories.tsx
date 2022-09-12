import React from 'react';

import { PointCloudVisualization } from '../PointCloud/PointCloud';
import data from '../../../../__mocks__/point-cloud-data.json';
import gltfData from '../../../../__mocks__/gltf-data.json';
import boulderData from '../../../../__mocks__/boulder.json';
import timeData from '../../../../__mocks__/point-cloud-time-data.json';

export default {
  title: 'Visualizations/PointCloudVisualization',
  component: PointCloudVisualization,
  argTypes: {
    color_scheme: {
      control: 'select',
      options: ['light', 'dark'],
      defaultValue: 'dark'
    }
  }
};

const Template = () => (
  <PointCloudVisualization
    gltfData={gltfData}
    data={data}
    mode="gltf"
    pointSize={5}
  />
);

export const PointCloud = Template.bind({});

export const Boulder = () => <PointCloudVisualization data={boulderData} />;

const token = '';
export const Streamer = () => (
  <PointCloudVisualization
    streaming={true}
    arrayName={'arrayName'}
    namespace={'namespace'}
    token={token}
    height={100}
    maxLevels={4}
  />
);
