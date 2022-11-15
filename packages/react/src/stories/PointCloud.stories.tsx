import React from 'react';

import { PointCloudVisualization } from '../PointCloud/PointCloud';
import data from '../../../../__mocks__/point-cloud-data.json';
import gltfData from '../../../../__mocks__/gltf-data.json';
import boulderData from '../../../../__mocks__/boulder.json';
import timeData from '../../../../__mocks__/point-cloud-time-data.json';
import autzenData from '../../../../__mocks__/autzen-sample.json';

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

export const Boulder = () => (
  <PointCloudVisualization data={boulderData} colorScheme="light" />
);

export const Autzen = () => (
  <PointCloudVisualization
    data={autzenData}
    particleSize={3}
    cameraRadius={2000}
    colorScheme="light"
    edlStrength={5}
    edlRadius={1.4}
    edlNeighbours={8}
    rgbMax={65535}
  />
);

const token = process.env.STORYBOOK_REST_TOKEN;
const namespace = process.env.STORYBOOK_NAMESPACE;
const arrayName = process.env.STORYBOOK_ARRAY_NAME || 'autzen';
const maxLevel = process.env.STORYBOOK_ARRAY_LEVELS || 6;

// maxLevel=4, height=100, arrayName='' for cube test

export const Streamer = () => (
  <PointCloudVisualization
    streaming={true}
    arrayName={arrayName}
    namespace={namespace}
    token={token}
    particleSize={3}
    cameraRadius={2000}
    maxLevels={maxLevel}
    rgbMax={255}
    useShader={false}
    fanOut={10}
  />
);
