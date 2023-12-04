const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = {
  stories: [
    '../src/**/*.stories.mdx',
    '../src/**/*.stories.@(js|jsx|ts|tsx)',
    '../src/**/*.stories.tsx'
  ],
  addons: [],
  framework: {
    name: '@storybook/react-webpack5',
    options: {}
  },
  webpackFinal: config => {
    config.plugins.push(new NodePolyfillPlugin());

    return config;
  }
};
