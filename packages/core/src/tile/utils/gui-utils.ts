import '@tiledb-inc/viz-components';
import {
  ButtonProps,
  Commands,
  Events,
  GUIEvent
} from '@tiledb-inc/viz-components';
import { Channel, ImageMetadata } from '../types';
import {
  Dimension,
  AssetEntry,
  GeometryMetadata,
  PointCloudMetadata
} from '../../types';

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
    channels: Channel[],
    dimensions: Dimension[],
    assets: AssetEntry[],
    imageMetadata: ImageMetadata,
    geometryMetadata: Map<string, GeometryMetadata>,
    pointMetadata: Map<string, PointCloudMetadata>,
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
    ${
      geometryMetadata.size
        ? `
        <sidebar-menu anchorLeft=true expandedMaxWidth=600>
          <info-panel 
            attributes='${JSON.stringify(
              Object.fromEntries(
                Array.from(geometryMetadata.values()).map(x => [
                  x.name,
                  x.attributes
                ])
              )
            )}'
            idAttribute='${JSON.stringify(
              Object.fromEntries(
                Array.from(geometryMetadata.entries()).map(([id, value]) => [
                  id,
                  value.idAttribute.name
                ])
              )
            )}'
          >
          </info-panel>
        </sidebar-menu>`
        : ''
    }
    <sidebar-menu>
      <zoom-control zoom='0.25'>
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
      ${
        geometryMetadata.size
          ? `<geometry-panel 
          attributes='${JSON.stringify(
            Array.from(geometryMetadata.entries()).map(x => x[1].attributes)
          )}' 
          categories='${JSON.stringify(
            Array.from(geometryMetadata.entries()).map(x =>
              Object.fromEntries(x[1].categories)
            )
          )}' 
          features='${JSON.stringify(
            Array.from(geometryMetadata.entries()).map(x => x[1].features)
          )}'
          targets='${JSON.stringify(
            Array.from(geometryMetadata.entries()).map(x => [x[0], x[1].name])
          )}'
        >
        </geometry-panel>`
          : ''
      }
      ${
        pointMetadata.size
          ? `<point-panel
          attributes='${JSON.stringify(
            Array.from(pointMetadata.entries()).map(x => x[1].attributes)
          )}' 
          categories='${JSON.stringify(
            Array.from(pointMetadata.entries()).map(x =>
              Object.fromEntries(x[1].categories)
            )
          )}' 
          features='${JSON.stringify(
            Array.from(pointMetadata.entries()).map(x => x[1].features)
          )}'
          targets='${JSON.stringify(
            Array.from(pointMetadata.entries()).map(x => [x[0], x[1].name])
          )}'
        >
        </point-panel>
        `
          : ''
      }
      <options-panel>
      </options-panel>
    </sidebar-menu>
    <scale-bar basePhysicalSize='${
      imageMetadata.physicalSizeX
    }' basePhysicalSizeUnit='${imageMetadata.physicalSizeXUnit}' levels='${
      imageMetadata.axes.length - 1
    }' zoom='-2'>
    </scale-bar>
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
