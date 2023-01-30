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

const Template = () => (
  <PointCloudVisualization
    data={data}
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
    data={data}
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
    data={boulderData}
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
    data={boulderData}
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
    data={autzenData}
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
    data={autzenData}
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
    namespace="TileDB-Inc"
    arrayName="autzen_classified_tiledb"
    bbox={bbox}
    pointSize={8}
    colorScheme="light"
    cameraUp={25}
    rgbMax={65535}
    width={'100vw'}
    height={'100vh'}
  />
);

export const StreamerAutzen = () => (
  <PointCloudVisualization
    streaming={true}
    token={token}
    namespace={'norman'}
    groupName={'autzen'}
    fanOut={100}
    pointBudget={80000000}
    maxNumCacheBlocks={500}
    pointSize={3}
    wheelPrecision={0.5}
    cameraUp={25}
    moveSpeed={4}
    colorScheme="dark"
    rgbMax={255}
    width={'100vw'}
    height={'100vh'}
    useShader={true}
  />
);

export const StreamerBristol = () => (
  <PointCloudVisualization
    streaming={true}
    token={token}
    namespace={'margriet-tiledb'}
    groupName={'bristol'}
    fanOut={100}
    pointBudget={800000000}
    maxNumCacheBlocks={10000}
    pointSize={3}
    colorScheme="dark"
    cameraLocation={5}
    cameraZoomOut={[2, 2, 2]}
    cameraUp={50}
    wheelPrecision={0.5}
    moveSpeed={8}
    rgbMax={255}
    width={'100vw'}
    height={'100vh'}
    useShader={true}
  />
);

export const StreamerSantorini = () => (
  <PointCloudVisualization
    streaming={true}
    token={token}
    namespace={'margriet-tiledb'}
    groupName={'santorini'}
    fanOut={1000}
    pointBudget={80000000}
    maxNumCacheBlocks={10000}
    pointSize={4}
    colorScheme="dark"
    cameraLocation={5}
    //cameraZoomOut={[2, 2, 2]}
    cameraUp={200}
    wheelPrecision={0.5}
    moveSpeed={4}
    rgbMax={255}
    width={'100vw'}
    height={'100vh'}
    useShader={true}
  />
);

export const StreamerShaderSantorini = () => (
  <PointCloudVisualization
    streaming={true}
    token={token}
    namespace={'margriet-tiledb'}
    groupName={'santorini'}
    fanOut={100}
    pointBudget={80000000}
    maxNumCacheBlocks={1000}
    pointSize={4}
    colorScheme="dark"
    cameraLocation={2}
    cameraUp={200}
    wheelPrecision={0.5}
    moveSpeed={4}
    rgbMax={255}
    width={'100vw'}
    height={'100vh'}
    useShader={true}
  />
);

export const StreamerSPSAutzen = () => (
  <PointCloudVisualization
    streaming={true}
    useSPS={true}
    token={token}
    namespace={'norman'}
    groupName={'autzen'}
    fanOut={100}
    pointBudget={80000000}
    pointSize={3}
    wheelPrecision={0.5}
    cameraUp={25}
    moveSpeed={3}
    colorScheme="dark"
    rgbMax={255}
    width={'100vw'}
    height={'100vh'}
  />
);

export const StreamerShaderSPSAutzen = () => (
  <PointCloudVisualization
    streaming={true}
    useSPS={true}
    useShader={true}
    token={token}
    namespace={'norman'}
    groupName={'autzen'}
    fanOut={100}
    pointBudget={800000000}
    pointSize={3}
    wheelPrecision={0.5}
    cameraUp={25}
    moveSpeed={3}
    colorScheme="light"
    rgbMax={255}
    edlStrength={2}
    width={'100vw'}
    height={'100vh'}
  />
);

export const StreamerShaderSPSSantorini = () => (
  <PointCloudVisualization
    streaming={true}
    token={token}
    namespace={'margriet-tiledb'}
    groupName={'santorini'}
    fanOut={100}
    pointBudget={80000000}
    maxNumCacheBlocks={1000}
    pointSize={4}
    colorScheme="dark"
    cameraLocation={2}
    cameraUp={200}
    wheelPrecision={0.5}
    moveSpeed={4}
    rgbMax={255}
    width={'100vw'}
    height={'100vh'}
    useShader={true}
    useSPS={true}
  />
);
