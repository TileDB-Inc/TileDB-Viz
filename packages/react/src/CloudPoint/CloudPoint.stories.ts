import React from 'react';

import { ComponentMeta } from '@storybook/react';

import { CloudPointTest } from './CloudPoint';

export default {
  /* 👇 The title prop is optional.
   * See https://storybook.js.org/docs/react/configure/overview#configure-story-loading
   * to learn how to generate automatic titles
   */
  title: 'CloudPointTest',
  component: CloudPointTest
} as ComponentMeta<typeof CloudPointTest>;
