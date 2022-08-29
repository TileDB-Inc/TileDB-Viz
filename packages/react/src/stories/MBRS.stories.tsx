import React from 'react';

import { MbrsVisualization } from '../Mbrs/Mbrs';
import data from './assets/mbrs_data.json';

export default {
  title: 'Visualizations/MbrsVisualization',
  component: MbrsVisualization,
  argTypes: {}
};

const Template = () => (
  <MbrsVisualization
    data={data.values.data}
    extents={data.values.extents}
    width="1200"
    height="800"
    zScale={5}
    moveSpeed={-1}
    wheelPrecision={-1}
    inspector={false}
  />
);

export const Mbrs = Template.bind({});
