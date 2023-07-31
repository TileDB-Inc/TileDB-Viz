import { Scene } from '@babylonjs/core';
import '@tiledb-inc/viz-components';
import { Events } from '@tiledb-inc/viz-components';
import { Channel } from '../types';
import { Dimension } from '../../types';
import { Tileset } from '../model/tileset';

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
  tileset: Tileset;
  height?: string;

  constructor(
    scene: Scene,
    tileset: Tileset,
    rootElement: HTMLElement,
    height: string,
    channels: Channel[],
    dimensions: Dimension[],
    zoomCallback: (step: number) => void
  ) {
    this.scene = scene;
    this.rootElement = rootElement;
    this.height = height;
    this.tileset = tileset;

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
      <zoom-control zoom='-2'>
      </zoom-control>
      <channel-panel channels='${JSON.stringify(channels)}'>
      </channel-panel>
      ${
        dimensions.length > 0
          ? `<dimension-panel dimensions='${JSON.stringify(
              dimensions
            )}'></dimension-panel>`
          : ''
      }
      <group-panel>
      </group-panel>
      <cache-control>
      </cache-control>
    </sidebar-menu>
      `;

    window.addEventListener(
      Events.SLIDER_CHANGE,
      (e: Event) => {
        const customEvent = e as CustomEvent<{ id: string; value: number }>;

        switch (customEvent.detail.id[0]) {
          case 'c':
            {
              const channelIndex = Number(customEvent.detail.id.substring(2));
              tileset.updateChannelIntensity(
                channelIndex,
                Number(customEvent.detail.value)
              );
            }
            break;
          case 'd':
            {
              const dimensionIndex = Number(customEvent.detail.id.substring(2));
              tileset.updateExtraDimensions(
                dimensionIndex,
                Number(customEvent.detail.value)
              );
            }
            break;
          default:
            console.warn(
              `Unrecognized event. Event ID: ${customEvent.detail.id}`
            );
            break;
        }
      },
      {
        capture: true
      }
    );

    window.addEventListener(
      Events.COLOR_CHANGE,
      (e: Event) => {
        const customEvent = e as CustomEvent<{
          id: string;
          value: { r: number; g: number; b: number };
        }>;

        const channelIndex = Number(customEvent.detail.id.substring(2));
        tileset.updateChannelColor(channelIndex, customEvent.detail.value);
      },
      {
        capture: true
      }
    );

    window.addEventListener(
      Events.TOGGLE_INPUT_CHANGE,
      (e: Event) => {
        const customEvent = e as CustomEvent<{ id: string; value: boolean }>;

        const channelIndex = Number(customEvent.detail.id.substring(2));
        tileset.updateChannelVisibility(channelIndex, customEvent.detail.value);
      },
      {
        capture: true
      }
    );

    window.addEventListener(
      Events.BUTTON_CLICK,
      (e: Event) => {
        const customEvent = e as CustomEvent<{ id: string }>;

        switch (customEvent.detail.id) {
          case 'zoom_plus':
            zoomCallback(0.25);
            break;
          case 'zoom_minus':
            zoomCallback(-0.25);
            break;
          case 'zoom_reset':
            zoomCallback(-1000);
            break;
          default:
            console.warn(
              `Unrecognized event. Event ID: ${customEvent.detail.id}`
            );
            break;
        }
      },
      {
        capture: true
      }
    );

    this.rootElement.appendChild(uiWrapper);
  }
}

export default TileImageGUI;
