import '@tiledb-inc/viz-components';
import { Events } from '@tiledb-inc/viz-components';
import { Channel } from '../types';
import { Dimension, AssetEntry } from '../../types';
import { Tileset } from '../model/tileset';

// const styleElement = document.createElement('style');
// styleElement.textContent = stylesString;
// document.head.appendChild(styleElement);

class TileImageGUI {
  private rootDiv?: HTMLDivElement;
  private rootElement?: HTMLElement;
  private tileset: Tileset;
  private uiWrapper!: HTMLDivElement;
  private zoomCallback: (step: number) => void;
  private clearCache: () => void;
  private assetSelectionCallback: (namespace: string, assetID: string) => void;

  private sliderEventHandler;
  private colorEventHandler;
  private toggleEventHandler;
  private buttonEventHandler;

  constructor(
    tileset: Tileset,
    rootElement: HTMLElement,
    channels: Channel[],
    dimensions: Dimension[],
    assets: AssetEntry[],
    zoomCallback: (step: number) => void,
    clearCache: () => void,
    assetSelectionCallback: (namespace: string, assetID: string) => void
  ) {
    this.rootElement = rootElement;
    this.tileset = tileset;
    this.zoomCallback = zoomCallback;
    this.clearCache = clearCache;
    this.assetSelectionCallback = assetSelectionCallback;

    for (const childElement of rootElement.children) {
      if (childElement.id === 'tdb-viz-wrapper') {
        this.rootDiv = childElement as HTMLDivElement;
      }
    }

    if (!this.rootDiv) {
      console.error('GUI can not be initiated rootElement was not found');
      return;
    }

    this.uiWrapper = document.createElement('div');

    this.uiWrapper.innerHTML = `
    <status-overlay>
    </status-overlay>
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
      ${
        assets.length > 0
          ? `<group-panel groups='${JSON.stringify(assets)}'></group-panel>`
          : ''
      }
      <cache-control>
      </cache-control>
    </sidebar-menu>
      `;

    this.sliderEventHandler = (e: Event) => this.sliderHandler(e);
    this.colorEventHandler = (e: Event) => this.colorHandler(e);
    this.toggleEventHandler = (e: Event) => this.toggleHandler(e);
    this.buttonEventHandler = (e: Event) => this.buttonHandler(e);

    window.addEventListener(Events.SLIDER_CHANGE, this.sliderEventHandler, {
      capture: true
    });
    window.addEventListener(Events.COLOR_CHANGE, this.colorEventHandler, {
      capture: true
    });
    window.addEventListener(
      Events.TOGGLE_INPUT_CHANGE,
      this.toggleEventHandler,
      { capture: true }
    );
    window.addEventListener(Events.BUTTON_CLICK, this.buttonEventHandler, {
      capture: true
    });

    this.rootElement.appendChild(this.uiWrapper);
  }

  public dispose() {
    window.removeEventListener(
      Events.SLIDER_CHANGE,
      this.sliderEventHandler as any,
      { capture: true }
    );
    window.removeEventListener(
      Events.COLOR_CHANGE,
      this.colorEventHandler as any,
      {
        capture: true
      }
    );
    window.removeEventListener(
      Events.TOGGLE_INPUT_CHANGE,
      this.toggleEventHandler as any,
      { capture: true }
    );
    window.removeEventListener(
      Events.BUTTON_CLICK,
      this.buttonEventHandler as any,
      { capture: true }
    );

    this.rootElement?.removeChild(this.uiWrapper);
  }

  private sliderHandler(event: Event) {
    const customEvent = event as CustomEvent<{ id: string; value: number }>;

    switch (customEvent.detail.id[0]) {
      case 'c':
        {
          const channelIndex = Number(customEvent.detail.id.substring(2));
          this.tileset.updateChannelIntensity(
            channelIndex,
            Number(customEvent.detail.value)
          );
        }
        break;
      case 'd':
        {
          const dimensionIndex = Number(customEvent.detail.id.substring(2));
          this.tileset.updateExtraDimensions(
            dimensionIndex,
            Number(customEvent.detail.value)
          );
        }
        break;
      default:
        console.warn(`Unrecognized event. Event ID: ${customEvent.detail.id}`);
        break;
    }
  }

  private colorHandler(event: Event) {
    const customEvent = event as CustomEvent<{
      id: string;
      value: { r: number; g: number; b: number };
    }>;

    const channelIndex = Number(customEvent.detail.id.substring(2));
    this.tileset.updateChannelColor(channelIndex, customEvent.detail.value);
  }

  private toggleHandler(event: Event) {
    const customEvent = event as CustomEvent<{ id: string; value: any }>;
    const id_parts = customEvent.detail.id.split('_');

    switch (id_parts[0]) {
      case 'c':
        {
          const channelIndex = Number(id_parts[1]);
          this.tileset.updateChannelVisibility(
            channelIndex,
            customEvent.detail.value
          );
        }
        break;
      case 'minimap':
        this.tileset.toggleMinimap(customEvent.detail.value);
        break;
      default:
        console.warn(`Unrecognized event. Event ID: ${customEvent.detail.id}`);
        break;
    }
  }

  private buttonHandler(event: Event) {
    const customEvent = event as CustomEvent<{ id: string; props?: any }>;

    switch (customEvent.detail.id) {
      case 'zoom_plus':
        this.zoomCallback(0.25);
        break;
      case 'zoom_minus':
        this.zoomCallback(-0.25);
        break;
      case 'zoom_reset':
        this.zoomCallback(-1000);
        break;
      case 'cache_clear':
        this.clearCache();
        break;
      case 'asset_selection':
        this.assetSelectionCallback(
          customEvent.detail.props.namespace,
          customEvent.detail.props.assetID
        );
        break;
      default:
        console.warn(`Unrecognized event. Event ID: ${customEvent.detail.id}`);
        break;
    }
  }
}

export default TileImageGUI;
