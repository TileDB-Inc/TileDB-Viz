import React from 'react';

import { ImageVisualization } from '../Image/Image';
import imageBuffer from './assets/image_data.json';
interface JSONInterface {
  data: number[];
  type: 'Buffer';
}
const uintArray = Uint8Array.from((imageBuffer as JSONInterface).data);
export default {
  title: 'Visualizations/ImageVisuazalization',
  component: ImageVisualization,
  argTypes: {}
};

const Template = () => (
  <ImageVisualization
    width="800"
    height="600"
    xyBbox={[11500, 14000, 11500, 14000]}
    data={uintArray.buffer}
    zScale={5}
    moveSpeed={-1}
    wheelPrecision={-1}
    inspector={false}
  />
);

export const Image = Template.bind({});
