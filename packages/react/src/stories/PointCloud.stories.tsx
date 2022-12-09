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
    data={data}
    particleSize={25}
    cameraRadius={250}
    width={'100vw'}
    height={'100vh'}
  />
);

export const PointCloud = Template.bind({});

export const Boulder = () => (
  <PointCloudVisualization
    data={boulderData}
    colorScheme="dark"
    particleSize={2.5}
    width={'100vw'}
    height={'100vh'}
  />
);

export const Autzen = () => (
  <PointCloudVisualization
    data={autzenData}
    particleSize={3}
    cameraRadius={600}
    colorScheme="light"
    rgbMax={65535}
    width={'100vw'}
    height={'100vh'}
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
    token={token}
    namespace={namespace}
    arrayName={arrayName}
    maxLevel={maxLevel}
    fanOut={50}
    particleBudget={8000000}
    particleSize={3}
    cameraRadius={2000}
    colorScheme="dark"
    rgbMax={255}
    width={'100vw'}
    height={'100vh'}
  />
);
