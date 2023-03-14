import React from 'react';

import { PointCloudVisualization } from '../PointCloud/PointCloud';
import data from '../../../../__mocks__/point-cloud-data.json';
import boulderData from '../../../../__mocks__/boulder.json';
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

const token = process.env.STORYBOOK_REST_TOKEN;
const namespace = process.env.STORYBOOK_NAMESPACE;

let numWorkers: number = navigator.hardwareConcurrency;
if (process.env.STORYBOOK_NUM_WORKERS) {
  numWorkers = parseInt(process.env.STORYBOOK_NUM_WORKERS);
}

const Template = () => (
  <PointCloudVisualization
    data={data as any}
    pointSize={25}
    cameraZoomOut={[2, 2, 16]}
    cameraLocation={8}
    width={'100vw'}
    height={'100vh'}
  />
);

export const PointCloud = Template.bind({});

export const PointCloudSPS = () => (
  <PointCloudVisualization
    data={data as any}
    pointSize={6}
    cameraZoomOut={[2, 2, 16]}
    cameraLocation={1}
    useShader={true}
    useSPS={true}
    colorScheme="light"
    width={'100vw'}
    height={'100vh'}
  />
);

export const Boulder = () => (
  <PointCloudVisualization
    data={boulderData as any}
    colorScheme="dark"
    cameraZoomOut={[6, 6, 2]}
    cameraLocation={6}
    pointSize={2.5}
    width={'100vw'}
    height={'100vh'}
  />
);

export const BoulderSPS = () => (
  <PointCloudVisualization
    data={boulderData as any}
    colorScheme="light"
    cameraZoomOut={[6, 6, 2]}
    cameraLocation={6}
    pointSize={0.05}
    useShader={true}
    useSPS={true}
    width={'100vw'}
    height={'100vh'}
  />
);

export const Autzen = () => (
  <PointCloudVisualization
    data={autzenData as any}
    pointSize={5}
    cameraZoomOut={[2, 2, 2]}
    cameraLocation={2}
    colorScheme="blue"
    moveSpeed={2}
    rgbMax={65535}
    width={'100vw'}
    height={'100vh'}
  />
);

export const AutzenSPS = () => (
  <PointCloudVisualization
    data={autzenData as any}
    pointSize={3}
    cameraZoomOut={[2, 2, 4]}
    cameraLocation={2}
    colorScheme="light"
    rgbMax={65535}
    useShader={true}
    useSPS={true}
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
    namespace={namespace}
    arrayName="autzen_classified_tiledb"
    bbox={bbox}
    pointSize={10}
    colorScheme="light"
    cameraUp={25}
    cameraZoomOut={[2, 2, 2]}
    cameraLocation={2}
    rgbMax={65535}
    width={'100vw'}
    height={'100vh'}
  />
);

export const StreamerAutzen = () => (
  <PointCloudVisualization
    streaming={true}
    token={token}
    namespace={namespace}
    groupName={'autzen-classified'}
    workerPoolSize={numWorkers}
    rgbMax={65535}
    fanOut={60} // fanOut can be fixed or specified by level (TODO)
    pointBudget={3_500_000}
    maxNumCacheBlocks={250}
    wheelPrecision={0.5}
    pointSize={5}
    cameraLocation={8}
    cameraZoomOut={[1, 1, 4]}
    cameraUp={25}
    moveSpeed={4}
    colorScheme="dark"
    width={'100vw'}
    height={'100vh'}
    useShader={false}
    edlStrength={1.0}
  />
);

export const StreamerBristol = () => (
  <PointCloudVisualization
    streaming={true}
    token={token}
    namespace={namespace}
    groupName={'bristol'}
    workerPoolSize={numWorkers}
    fanOut={200}
    pointBudget={4_500_000}
    maxNumCacheBlocks={250}
    colorScheme="dark"
    pointSize={8}
    cameraLocation={8}
    cameraZoomOut={[1, 1, 2]}
    cameraUp={50}
    wheelPrecision={0.5}
    moveSpeed={8}
    rgbMax={255}
    width={'100vw'}
    height={'100vh'}
    useShader={false}
    edlStrength={2.0}
  />
);

export const StreamerSantorini = () => (
  <PointCloudVisualization
    streaming={true}
    token={token}
    namespace={namespace}
    groupName={'santorini'}
    workerPoolSize={numWorkers}
    fanOut={200}
    pointBudget={3_500_000}
    maxNumCacheBlocks={250}
    colorScheme="dark"
    pointSize={8}
    cameraLocation={5}
    cameraZoomOut={[1, 1, 4]}
    cameraUp={200}
    wheelPrecision={0.5}
    moveSpeed={4}
    rgbMax={255}
    width={'100vw'}
    height={'100vh'}
    useShader={false}
    edlStrength={2.0}
  />
);
