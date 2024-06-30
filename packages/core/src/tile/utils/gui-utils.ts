import '@tiledb-inc/viz-components';
import {
  ButtonProps,
  Commands,
  Events,
  GUIEvent
} from '@tiledb-inc/viz-components';
import { AssetEntry } from '../../types';

// const styleElement = document.createElement('style');
// styleElement.textContent = stylesString;
// document.head.appendChild(styleElement);

class TileImageGUI {
  private rootDiv?: HTMLDivElement;
  private rootElement?: HTMLElement;
  private uiWrapper!: HTMLDivElement;
  private clearCache: () => void;
  private assetSelectionCallback: (
    namespace: string,
    groupID?: string,
    arrayID?: string
  ) => void;

  private buttonEventHandler;

  constructor(
    rootElement: HTMLElement,
    assets: AssetEntry[],
    clearCache: () => void,
    assetSelectionCallback: (
      namespace: string,
      groupID?: string,
      arrayID?: string
    ) => void
  ) {
    this.rootElement = rootElement;
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
    <selection-panel>
    </selection-panel>
    <asset-panel>
    </asset-panel>
      `;

    this.buttonEventHandler = (e: CustomEvent<GUIEvent<ButtonProps>>) =>
      this.buttonHandler(e);

    window.addEventListener(
      Events.BUTTON_CLICK,
      this.buttonEventHandler as any,
      {
        capture: true
      }
    );

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

  private buttonHandler(event: CustomEvent<GUIEvent<ButtonProps>>) {
    if (event.detail.target === 'cache') {
      switch (event.detail.props.command) {
        case Commands.CLEAR:
          this.clearCache();
          break;
        default:
          return;
      }
    } else if (event.detail.target === 'asset') {
      switch (event.detail.props.command) {
        case Commands.SELECT:
          this.assetSelectionCallback(
            event.detail.props.data.namespace,
            event.detail.props.data.groupID,
            event.detail.props.data.arrayID
          );
          break;
        default:
          return;
      }
    }
  }
}

export default TileImageGUI;
