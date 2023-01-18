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
    pointSize={25}
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
    pointSize={2.5}
    width={'100vw'}
    height={'100vh'}
  />
);

export const Autzen = () => (
  <PointCloudVisualization
    data={autzenData}
    pointSize={3}
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
const maxLevel = process.env.STORYBOOK_ARRAY_LEVELS || 4;
const tiledbEnv = process.env.TILEDB_ENV;

// maxLevel=4, height=100, arrayName='' for cube test

export const Streamer = () => (
  <PointCloudVisualization
    streaming={true}
    token={token}
    tiledbEnv={tiledbEnv}
    namespace={namespace}
    arrayName={arrayName}
    maxLevel={maxLevel}
    fanOut={256}
    pointBudget={8000000}
    pointSize={0.05}
    cameraRadius={2000}
    colorScheme="dark"
    rgbMax={255}
    width={'100vw'}
    height={'100vh'}
  />
);

const bbox = {
  X: [636800, 637200],
  Y: [852800, 853100],
  Z: [406.14, 615.26]
};

export const AutzenBbox = () => (
  <PointCloudVisualization
    streaming={false}
    source="cloud"
    token={token}
    namespace="TileDB-Inc"
    arrayName="autzen_classified_tiledb"
    bbox={bbox}
    pointSize={6}
    cameraRadius={1000}
    colorScheme="light"
    rgbMax={65535}
    width={'100vw'}
    height={'100vh'}
  />
);
