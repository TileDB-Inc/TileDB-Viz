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

export const TimeMode = () => (
  <PointCloudVisualization data={timeData} mode="time" />
);

export const Boulder = () => <PointCloudVisualization data={boulderData} />;

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMDg5NjI3ZDYtZGQ4NC00ZmUyLTkzOWQtMjdkMWM2YmUyOTZiIiwiU2VlZCI6NDYwOTc5Mzc5MjA3NTYyOSwiZXhwIjoxNjYzMzkwNzk5LCJpYXQiOjE2NjI5MzExMzEsIm5iZiI6MTY2MjkzMTEzMSwic3ViIjoibm9ybWFuIn0.KIgoVfH1VC5sdG6prVOXk7x1N3c2abqupIuPxXDg5vQ';
export const Streamer = () => (
  <PointCloudVisualization
    streaming={true}
    arrayName={'allen'}
    namespace={'norman'}
    token={token}
    height={100}
    maxLevels={4}
  />
);
