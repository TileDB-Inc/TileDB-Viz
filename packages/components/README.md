# @tiledb-inc/viz-components

Set of re-usable [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) written in Svelte, for the @tiledb-inc/viz-core library.


## Installation

### Npm

```npm install --save @tiledb-inc/viz-components```

### Yarn

```yarn add @tiledb-inc/viz-components```

## Commands

### build
Builds the component library and its associated types

### check
Checks for any linting errors


## Usage

```typescript
import '@tiledb-inc/viz-components';

const wrapper = document.createElement('div');
    wrapper.innerHTML = `
    <menu-panel id="menu">
        <h3>Panel title</h3>
    </menu-panel>
`

document.body.appendChild(wrapper);
```