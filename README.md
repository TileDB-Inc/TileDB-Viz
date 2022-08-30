# TileDB-Visualizations
A collection of packages to help user create beautiful visualizations from TileDB arrays

## Install package
Node v16 is recommended. Please note packages use yarn 3.x. [Yarn v3 installation](https://yarnpkg.com/getting-started/install) </br>
In order to install the dependencies run:
`yarn install`

## Build packages

`yarn build`

## Render storybook

`yarn storybook`

## Known issues
### Vscode integration fix

Run `yarn dlx @yarnpkg/sdks vscode` to fix any module resolution issues (prettier one of them), with Vscode extensions and yarn 3.x.

[Caveats](https://yarnpkg.com/getting-started/editor-sdks#caveat)

> Since the Yarn packages are kept within their archives, editors need to understand how to work with such paths should you want to open the files (for example when command-clicking on an import path originating from an external package). This can only be implemented by those editors, and we can't do much more than opening issues to ask for this feature to be implemented (for example, here's the VSCode issue: #75559).

As a workaround, you can run yarn unplug pkg-name to instruct yarn to unzip the package, which will re-enable Go to definition functionality for the specific package. (e.g. `yarn unplug @babylonjs/core -A` should fix issues while trying to "go to definition" for babylon core library).