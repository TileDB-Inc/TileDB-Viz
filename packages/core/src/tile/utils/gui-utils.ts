import { Scene } from '@babylonjs/core';
import '@tiledb-inc/viz-components';
import { Events } from '@tiledb-inc/viz-components';

// const styleElement = document.createElement('style');
// styleElement.textContent = stylesString;
// document.head.appendChild(styleElement);

class TileImageGUI {
  rootDiv?: HTMLDivElement;
  menuPanel?: HTMLElement;
  modelPanel?: HTMLElement;
  controlsPanel?: HTMLElement;
  rootElement?: HTMLElement;
  scene: Scene;
  height?: string;

  constructor(scene: Scene, rootElement: HTMLElement, height?: string) {
    this.scene = scene;
    this.rootElement = rootElement;
    this.height = height;

    for (const childElement of rootElement.children) {
      if (childElement.id === 'tdb-viz-wrapper') {
        this.rootDiv = childElement as HTMLDivElement;
      }
    }

    if (!this.rootDiv) {
      console.error('GUI can not be initiated rootElement was not found');
      return;
    }

    const uiWrapper = document.createElement('div');
    uiWrapper.className;
    uiWrapper.innerHTML = `
    <sidebar-menu>
      <zoom-control>
      </zoom-control>
      <cache-control>
      </cache-control>
      <channel-panel channels=${JSON.stringify([1, 2, 3])}>
      </channel-panel>
      <dimension-panel dimensions=${JSON.stringify(['X', 'Y', 'Z'])}>
      </dimension-panel>
      <group-panel>
      </group-panel>
    </sidebar-menu>
      `;

    this.rootElement.appendChild(uiWrapper);
  }
}

export default TileImageGUI;
