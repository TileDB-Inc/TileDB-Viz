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
const values: any = {
  image_type: 'sar',
  band: 1,
  xy_bbox: [11500, 14000, 11500, 14000],
  attribute: 'TDB_VALUES',
  sar_scale_factor: 0.0008292495109880846,
  width: 800,
  height: 600,
  data: uintArray.buffer
};
const Template = () => (
  <ImageVisualization
    width="800"
    height="600"
    values={values}
    zScale={5}
    moveSpeed={-1}
    wheelPrecision={-1}
    inspector={false}
  />
);

export const Image = Template.bind({});
