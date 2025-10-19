import type { Meta, StoryObj } from '@storybook/react-webpack5';

import { TileImageVisualization } from '../TileImage';
import { TOKEN, TILEDB_ENDPOINT } from '../.env';
import { FeatureType } from '@tiledb-inc/viz-common';

const meta = {
  title: 'Tile Renderer',
  component: TileImageVisualization,
  argTypes: {
    engineAPI: { control: 'inline-radio', options: ['WEBGL', 'WEBGPU'] },
    token: { description: 'An API key to use for accessing data stored on TileDB', control: 'text' },
    tiledbEnv: { description: 'The TileDB API endpoint to use', control: 'text' }
  },
  args: { 
    engineAPI: 'WEBGPU',
    token: TOKEN,
    tiledbEnv: TILEDB_ENDPOINT
  }
} satisfies Meta<typeof TileImageVisualization>;

export default meta;

type Story = StoryObj<typeof meta>;
 
export const BiomedicalImage = {
  args: {
    workspace: 'ws_d0uoi9d0ucni1u8h7o7g',
    teamspace: 'ts_d1f5rqeuc9m8hld9hae0',
    groupID: 'ast_d1sbir8jg42iapho7g5g',
    width: '100vw',
    height: '100vh'
  },
} satisfies Story;

// export const ReasterWithPointAndTileOverlays = {
//   args: {
//     workspace: 'ws_d0uoi9d0ucni1u8h7o7g',
//     teamspace: 'ts_d1f5rqeuc9m8hld9hae0',
//     arrayID: 'TBD',
//     pointGroupID: ['TBD'],
//     tileUris: ['https://api.pdok.nl/kadaster/3d-basisvoorziening/ogc/v1_0/collections/terreinen/3dtiles'],
//     defaultChannels: [
//       { index: 1, intensity: 2000 },
//       { index: 2, intensity: 2000 },
//       { index: 3, intensity: 2000 }
//     ],
//     sceneConfig: {
//       pointConfigs: [
//         {
//           pickable: false,
//           features: [
//             {
//               name: 'Height',
//               type: FeatureType.RGB,
//               interleaved: true,
//               attributes: [
//                 {
//                   name: 'Red',
//                   normalize: true,
//                   normalizationWindow: { min: 0, max: 255 }
//                 },
//                 {
//                   name: 'Green',
//                   normalize: true,
//                   normalizationWindow: { min: 0, max: 255 }
//                 },
//                 {
//                   name: 'Blue',
//                   normalize: true,
//                   normalizationWindow: { min: 0, max: 255 }
//                 }
//               ]
//             }
//           ]
//         }
//       ]
//     },
//     width: '100vw',
//     height: '100vh'
//   },
// } satisfies Story;