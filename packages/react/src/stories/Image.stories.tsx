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
    data={uintArray.buffer}
    zScale={5}
    moveSpeed={-1}
    wheelPrecision={-1}
    inspector={false}
    chartType="bar"
    //bbox={{
    //  X: [9500, 14000],
    //  Y: [9500, 14000]
    //}}
  />
);

export const Image = Template.bind({});

const token = process.env.STORYBOOK_REST_TOKEN;
const namespace = '***';
const arrayName = '***';

// maxLevel=4, height=100, arrayName='' for cube test

export const ImageInteractive = () => (
  <ImageVisualization
    data={uintArray.buffer}
    arrayName={arrayName}
    namespace={namespace}
    token={token}
    //band={1}
    //bbox={{
    //  X: [9500, 14000],
    //  Y: [9500, 14000]
    //}}
    zScale={5}
    moveSpeed={-1}
    wheelPrecision={-1}
    inspector={false}
    chartType="interactive"
  />
);

export const ImageMapbox = () => (
  <ImageVisualization
    data={uintArray.buffer}
    arrayName={arrayName}
    namespace={namespace}
    token={token}
    zScale={5}
    moveSpeed={-1}
    wheelPrecision={-1}
    inspector={false}
    chartType="mapbox"
  />
);
