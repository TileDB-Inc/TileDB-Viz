import React from 'react';

import { ImageVisualization } from '../Image/Image';
import imageBuffer from '../../../../__mocks__/image-data.json';
interface JSONInterface {
  data: number[];
  type: 'Buffer';
}
const uintArray = Uint8Array.from((imageBuffer as JSONInterface).data);
export default {
  title: 'Visualizations/ImageVisualization',
  component: ImageVisualization,
  argTypes: {}
};

const Template = () => (
  <ImageVisualization
    xyBbox={[11500, 14000, 11500, 14000]}
    data={uintArray.buffer as any}
    moveSpeed={-1}
    wheelPrecision={-1}
    inspector={false}
  />
);

export const Image = Template.bind({});
