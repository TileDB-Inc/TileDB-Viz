import type { Meta, StoryObj } from '@storybook/svelte';

import DoubleRangeSlider from '../DoubleRangeSlider.component.svelte';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta = {
  title: 'DoubleRangeSlider',
  component: DoubleRangeSlider
} satisfies Meta<DoubleRangeSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  args: {
    label: 'Double range label',
    min: 5,
    id: 'unique-id',
    max: 100
  }
};
