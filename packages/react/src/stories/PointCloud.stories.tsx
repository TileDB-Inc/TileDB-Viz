import type { Meta, StoryObj } from '@storybook/react-webpack5';

import { PointCloudVisualization } from '../PointCloud';

import data from '../../../../__mocks__/point-cloud-data.json';
import boulderData from '../../../../__mocks__/boulder.json';
import autzenData from '../../../../__mocks__/autzen-sample.json';

const meta = {
  title: 'Point Cloud Renderer',
  component: PointCloudVisualization,
  argTypes: {
    colorScheme: { control: 'select', options: ['light', 'dark', 'blue'] },
  },
  args: { 
    colorScheme: 'dark'
  },
} satisfies Meta<typeof PointCloudVisualization>;

export default meta;

type Story = StoryObj<typeof meta>;

export const BasicOffline = {
  args: {
    data: data as any,
    pointSize: 25,
    cameraZoomOut: [2, 2, 16],
    cameraLocation: 8,
    width: '100vw',
    height: '100vh',
    pointType: 'fixed_world_size'
  },
} satisfies Story;

export const SolidPointsOffline = {
  args: {
    data: data as any,
    pointSize: 6,
    cameraZoomOut: [2, 2, 16],
    cameraLocation: 1,
    useShader: true,
    useSPS: true,
    colorScheme: "light",
    width: '100vw',
    height: '100vh'
  }
} satisfies Story;

export const BoulderOffline = {
  args: {
    data: boulderData as any,
    pointSize: 2.5,
    cameraZoomOut: [6, 6, 2],
    cameraLocation: 6,
    pointType: 'fixed_screen_size',
    width: '100vw',
    height: '100vh'
  }
} satisfies Story;

export const BoulderSolidOffline = {
  args: {
    data: boulderData as any,
    colorScheme: 'light',
    pointSize: 0.05,
    cameraZoomOut: [6, 6, 2],
    cameraLocation: 6,
    useShader: true,
    useSPS: true,
    pointType: 'fixed_screen_size',
    width: '100vw',
    height: '100vh'
  }
} satisfies Story;

export const AutzenOffline = {
  args: {
    data: autzenData as any,
    pointSize: 3,
    cameraZoomOut: [2, 2, 2],
    cameraLocation: 2,
    colorScheme: 'blue',
    pointType: 'fixed_world_size',
    moveSpeed: 2,
    rgbMax: 65535,
    width: '100vw',
    height: '100vh'
  }
} satisfies Story;

export const AutzenSolidOffline = {
  args: {
    data: autzenData as any,
    colorScheme: 'light',
    pointSize: 3,
    cameraZoomOut: [2, 2, 4],
    cameraLocation: 2,
    useShader: true,
    useSPS: true,
    rgbMax: 65535,
    width: '100vw',
    height: '100vh'
  }
} satisfies Story;

// const bbox = {
//   X: [636800, 637200],
//   Y: [852800, 853100],
//   Z: [406.14, 615.26]
// };

// export const AutzenBbox = () => (
//   <PointCloudVisualization
//     streaming={false}
//     source="cloud"
//     token={token}
//     namespace={namespace}
//     arrayName="autzen_classified_tiledb"
//     bbox={bbox}
//     pointSize={9}
//     colorScheme="light"
//     cameraUp={25}
//     cameraZoomOut={[2, 2, 2]}
//     cameraLocation={2}
//     rgbMax={65535}
//     width={'100vw'}
//     height={'100vh'}
//   />
// );

// export const StreamerAutzen = () => (
//   <PointCloudVisualization
//     streaming={true}
//     token={token}
//     namespace={namespace}
//     groupName={'autzen-classified'}
//     workerPoolSize={numWorkers}
//     rgbMax={65535}
//     pointBudget={3_500_000}
//     wheelPrecision={0.1}
//     pointSize={3}
//     cameraLocation={8}
//     cameraZoomOut={[1, 1, 4]}
//     cameraUp={25}
//     moveSpeed={4}
//     colorScheme="dark"
//     width={'100vw'}
//     height={'100vh'}
//     useShader={false}
//     edlStrength={0.4}
//     pointType={'fixed_screen_size'}
//   />
// );

// export const StreamerBristol = () => (
//   <PointCloudVisualization
//     streaming={true}
//     token={token}
//     namespace={namespace}
//     groupName={'bristol'}
//     workerPoolSize={numWorkers}
//     pointBudget={3_500_000}
//     colorScheme="dark"
//     pointSize={3}
//     cameraLocation={8}
//     cameraZoomOut={[1, 1, 2]}
//     cameraUp={50}
//     wheelPrecision={0.2}
//     moveSpeed={8}
//     rgbMax={255}
//     width={'100vw'}
//     height={'100vh'}
//     useShader={false}
//     edlStrength={0.4}
//     pointType={'fixed_screen_size'}
//   />
// );

// export const StreamerSantorini = () => (
//   <PointCloudVisualization
//     streaming={true}
//     token={token}
//     namespace={namespace}
//     groupName={'santorini'}
//     workerPoolSize={numWorkers}
//     pointBudget={3_000_000}
//     colorScheme="dark"
//     pointSize={3}
//     cameraLocation={5}
//     cameraZoomOut={[1, 1, 4]}
//     cameraUp={200}
//     wheelPrecision={0.2}
//     moveSpeed={6}
//     rgbMax={255}
//     width={'100vw'}
//     height={'100vh'}
//     useShader={false}
//     edlStrength={0.4}
//     pointType={'fixed_screen_size'}
//   />
// );
