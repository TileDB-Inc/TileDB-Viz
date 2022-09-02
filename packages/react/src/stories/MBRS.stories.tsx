import React from 'react';

import { MbrsVisualization } from '../Mbrs/Mbrs';
import data from '../../../../__mocks__/mbrs-data.json';

export default {
  title: 'Visualizations/MbrsVisualization',
  component: MbrsVisualization,
  argTypes: {}
};

const Template = () => (
  <MbrsVisualization
    data={data.values.data}
    extents={data.values.extents}
    zScale={5}
    moveSpeed={-1}
    wheelPrecision={-1}
    inspector={false}
  />
);

export const Mbrs = Template.bind({});
