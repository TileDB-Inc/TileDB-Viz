const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
  core: {
    builder: 'webpack5',
  },
  "stories": [
    "../src/**/*.stories.mdx",
    "../src/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions"
  ],
  "framework": "@storybook/react",
  webpackFinal: (config) => {
    const sassLoaderRule = {
      test: /\.s[ac]ss$/i,
      use: [
        "style-loader",
        "css-loader",
        "sass-loader",
      ],
    };
    config.plugins.push(new NodePolyfillPlugin());
    config.module.rules.push(sassLoaderRule);

    return config
  }
}