import '@tiledb-inc/viz-components';
import { Events } from '@tiledb-inc/viz-components';
import { Channel } from '../types';
import { Dimension, AssetEntry } from '../../types';
import { ImageManager } from '../model/image/imageManager';
import { MinimapManager } from '../model/image/minimap';

// const styleElement = document.createElement('style');
// styleElement.textContent = stylesString;
// document.head.appendChild(styleElement);

class TileImageGUI {
  private rootDiv?: HTMLDivElement;
  private rootElement?: HTMLElement;
  private tileset: ImageManager;
  private minimap: MinimapManager;
  private uiWrapper!: HTMLDivElement;
  private zoomCallback: (step: number) => void;
  private clearCache: () => void;
  private assetSelectionCallback: (
    namespace: string,
    groupID?: string,
    arrayID?: string
  ) => void;

  private buttonEventHandler;

  constructor(
    tileset: ImageManager,
    minimap: MinimapManager,
    rootElement: HTMLElement,
    channels: Channel[],
    dimensions: Dimension[],
    assets: AssetEntry[],
    zoomCallback: (step: number) => void,
    clearCache: () => void,
    assetSelectionCallback: (
      namespace: string,
      groupID?: string,
      arrayID?: string
    ) => void
  ) {
    this.rootElement = rootElement;
    this.tileset = tileset;
    this.minimap = minimap;
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

    this.buttonEventHandler = (e: Event) => this.buttonHandler(e);

    window.addEventListener(Events.BUTTON_CLICK, this.buttonEventHandler, {
      capture: true
    });

    this.rootElement.appendChild(this.uiWrapper);
  }

  public dispose() {
    window.removeEventListener(
      Events.BUTTON_CLICK,
      this.buttonEventHandler as any,
      { capture: true }
    );

    this.rootElement?.removeChild(this.uiWrapper);
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
          customEvent.detail.props.groupID,
          customEvent.detail.props.arrayID
        );
        break;
      default:
        console.warn(`Unrecognized event. Event ID: ${customEvent.detail.id}`);
        break;
    }
  }
}

export default TileImageGUI;
