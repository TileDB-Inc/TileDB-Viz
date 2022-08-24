import React from 'react';

import { MbrsVisualization } from '../Mbrs/Mbrs';
import data from './assets/mbrs_data.json';

export default {
  title: 'Visualizations/MbrsVisualization',
  component: MbrsVisualization,
  argTypes: {
  }
};

const Template = () => (
  <MbrsVisualization
    values={data.values as any}
    width="1200"
    height="800"
    zScale={5}
    moveSpeed={-1}
    wheelPrecision={-1}
    inspector={false}
  />
);

export const WithData = Template.bind({});
