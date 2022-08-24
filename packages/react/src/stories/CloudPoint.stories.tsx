import React from 'react';

import { CloudPointVisuzalization } from '../CloudPoint/CloudPoint';
import data from './assets/data.json';
import gltf_data from './assets/gltf_data.json';

export default {
  title: 'Visualizations/CloudPointVisuzalization',
  component: CloudPointVisuzalization,
  argTypes: {
    color_scheme: {
      control: 'select',
      options: ['light', 'dark'],
      defaultValue: 'dark'
    }
  }
};

const Template = () => (
  <CloudPointVisuzalization
    mode="gltf"
    color_scheme="dark"
    width="800"
    height="600"
    wheelPrecision={-1}
    moveSpeed={-1}
    inspector={false}
    zScale={1}
    values={
      {
        gltf_data,
        data: data.data,
        point_shift: [],
        mesh_shift: [0, 0, 0],
        mesh_rotation: [0, 0, 0],
        mesh_scale: [1, 1, 1],
        distance_colors: false,
        mbstyle: 'streets-v11',
        crs: 'EPSG:2994',
        topo_offset: 0,
        gltf_multi: false,
        inspector: false,
        width: 800,
        height: 600,
        z_scale: 1,
        wheel_precision: -1,
        move_speed: -1,
        point_size: 5
      } as any
    }
  />
);

export const CloudPointViz = Template.bind({});
