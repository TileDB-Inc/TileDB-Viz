import {
  GeometryMessage,
  DataRequest,
  GeometryResponse,
  RequestType,
  GeometryInfoMessage,
  BaseResponse,
  GeometryStyle,
  colorScheme,
  InfoResponse
} from '../../types';
import { GeometryTile, GeometryUpdateOptions } from './geometry';
import {
  Scene,
  RenderTargetTexture,
  ArcRotateCamera,
  Color3
} from '@babylonjs/core';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { Manager, TileStatus, TileState } from '../manager';
import { Feature } from '../../../types';
import {
  ButtonProps,
  Events,
  GUIEvent,
  Commands,
  SliderProps,
  SelectProps
} from '@tiledb-inc/viz-components';
import { PickingTool, screenToWorldSpaceBbox } from '../../utils/picking-tool';
import { hexToRgb } from '../../utils/helpers';
import { GeometryMetadata } from '@tiledb-inc/viz-common';

interface GeometryOptions {
  arrayID: string;
  namespace: string;
  nativeZoom: number;
  baseWidth: number;
  baseHeight: number;
  baseCRS: string;
  transformationCoefficients: number[];
  metadata: GeometryMetadata;
  renderTarget: RenderTargetTexture;
  metersPerUnit: number;
}

export class GeometryManager extends Manager<GeometryTile> {
  private metadata: GeometryMetadata;
  private baseCRS: string;
  private transformationCoefficients: number[];
  private arrayID: string;
  private namespace: string;
  private nativeZoom: number;
  private renderTarget: RenderTargetTexture;
  private metersPerUnit: number;
  private pickingTool: PickingTool;
  private styleOptions = {
    style: GeometryStyle.FILLED,
    fillOpacity: 1,
    fillColor: new Color3(0, 0, 1),
    outlineThickness: 1,
    outlineColor: new Color3(1, 0, 0),
    renderingGroup: 1,

    // This array is shared by reference so changing a value
    // should automatically update the uniform value
    colorScheme: Float32Array.from(
      colorScheme
        .map(x => [...Object.values(hexToRgb(x)!), 255])
        .flatMap(x => x)
        .map(x => x / 255)
    ),

    // This map is shared by reference and will be updated
    // automatically for all geometry tiles.
    // It is only used when the active attribute is changed
    groupState: new Map<string, Map<number, number>>()
  };
  private activeFeature: Feature;

  constructor(
    scene: Scene,
    workerPool: WorkerPool,
    pickingTool: PickingTool,
    tileSize: number,
    geometryOptions: GeometryOptions
  ) {
    super(
      scene,
      workerPool,
      tileSize,
      geometryOptions.baseWidth,
      geometryOptions.baseHeight
    );

    this.metadata = geometryOptions.metadata;
    this.baseCRS = geometryOptions.baseCRS;
    this.transformationCoefficients =
      geometryOptions.transformationCoefficients;
    this.arrayID = geometryOptions.arrayID;
    this.namespace = geometryOptions.namespace;
    this.nativeZoom = geometryOptions.nativeZoom;
    this.renderTarget = geometryOptions.renderTarget;
    this.pickingTool = pickingTool;
    this.metersPerUnit = geometryOptions.metersPerUnit;
    this.activeFeature = this.metadata.features[0];

    this.workerPool.callbacks.geometry.push(
      this.onGeometryTileDataLoad.bind(this)
    );
    this.workerPool.callbacks.cancel.push(this.onCancel.bind(this));

    if (this.metadata.idAttribute) {
      this.workerPool.callbacks.info.push(
        this.onGeometryInfoDataLoad.bind(this)
      );
      this.pickingTool.pickCallbacks.push(this.pickGeometry.bind(this));
    }

    this.setupEventListeners();
  }

  public loadTiles(camera: ArcRotateCamera, zoom: number): void {
    for (const [, value] of this.tileStatus) {
      value.evict = true;
    }

    if (zoom >= this.nativeZoom) {
      const [minXIndex, maxXIndex, minYIndex, maxYIndex] =
        this.getTileIndexRange(camera, this.nativeZoom);

      for (let x = minXIndex; x <= maxXIndex; ++x) {
        for (let y = minYIndex; y <= maxYIndex; ++y) {
          const tileIndex = `${this.arrayID}_${x}_${y}`;
          const status =
            this.tileStatus.get(tileIndex) ??
            ({ evict: false } as TileStatus<GeometryTile>);

          status.evict = false;

          if (status.state === undefined) {
            this.workerPool.postMessage({
              type: RequestType.GEOMETRY,
              id: tileIndex,
              request: {
                index: [x, y],
                tileSize: this.tileSize / 2 ** this.nativeZoom,
                arrayID: this.arrayID,
                namespace: this.namespace,
                idAttribute: this.metadata.idAttribute,
                geometryAttribute: this.metadata.geometryAttribute,
                pad: this.metadata.pad,
                type: this.metadata.type,
                imageCRS: this.baseCRS,
                geometryCRS: this.metadata.crs,
                geotransformCoefficients: this.transformationCoefficients,
                metersPerUnit: this.metersPerUnit,
                nonce: ++this.nonce,
                features: this.metadata.features,
                additionalAttributes: this.metadata.attributes
              } as GeometryMessage
            } as DataRequest);

            this.updateLoadingStatus(false);

            status.nonce = this.nonce;
            status.state = TileState.LOADING;
            this.tileStatus.set(tileIndex, status);
          }
        }
      }
    }

    for (const key of this.tileStatus.keys()) {
      const status = this.tileStatus.get(key);
      if (!status?.evict) {
        continue;
      }

      if (status.state !== TileState.VISIBLE) {
        this.workerPool.cancelRequest({
          type: RequestType.CANCEL,
          id: key
        } as DataRequest);

        this.updateLoadingStatus(true);
      } else if (status.state === TileState.VISIBLE) {
        status.tile?.dispose();
      }

      this.tileStatus.delete(key);
    }
  }

  public pickGeometry(
    bbox: number[],
    constraints?: { path?: number[]; tiles?: number[][] }
  ) {
    // calculate width and height of bbox
    const height = Math.max(bbox[3] - bbox[1], 1);
    const width = Math.max(bbox[2] - bbox[0], 1);

    // read screen texture buffer using the calculated bbox to read visible geometry id
    const buffer = new Uint32Array(width * height * 4);
    const gl = this.scene.getEngine()._gl;

    this.renderTarget._bindFrameBuffer();
    gl.readPixels(
      bbox[0],
      bbox[1],
      width,
      height,
      gl.RGBA_INTEGER,
      gl.UNSIGNED_INT,
      buffer
    );

    this.workerPool.postMessage(
      {
        type: RequestType.GEOMETRY_INFO,
        id: this.arrayID,
        request: {
          tileSize: this.tileSize,
          worldBbox: screenToWorldSpaceBbox(this.scene, bbox),
          screenBbox: bbox,
          idAttribute: this.metadata.idAttribute,
          texture: buffer,
          arrayID: this.arrayID,
          namespace: this.namespace,
          imageCRS: this.baseCRS,
          pad: this.metadata.pad,
          tiles: constraints?.tiles,
          selectionPath: constraints?.path,
          geometryCRS: this.metadata.crs,
          geotransformCoefficients: this.transformationCoefficients,
          nonce: ++this.nonce
        } as GeometryInfoMessage
      } as DataRequest,
      [buffer.buffer]
    );
  }

  private onGeometryTileDataLoad(id: string, response: GeometryResponse) {
    if (response.canceled) {
      return;
    }

    const status =
      this.tileStatus.get(id) ??
      ({
        evict: false,
        state: TileState.VISIBLE
      } as TileStatus<GeometryTile>);

    if (!status || status.nonce !== response.nonce) {
      // Tile was removed from the tileset but canceling missed timing
      return;
    }

    if (status.tile) {
      status.tile.update({ response });
    } else {
      status.tile = new GeometryTile(
        this.arrayID,
        { ...this.styleOptions, response, feature: this.activeFeature },
        this.renderTarget,
        this.scene
      );
    }

    status.state = TileState.VISIBLE;
    this.updateLoadingStatus(true);
  }

  private onGeometryInfoDataLoad(id: string, response: InfoResponse) {
    if (id !== this.arrayID) {
      return;
    }

    for (const [, status] of this.tileStatus) {
      if (status.state === TileState.VISIBLE) {
        status.tile?.updateSelection(response.ids);
      }
    }

    window.dispatchEvent(
      new CustomEvent<GUIEvent>(Events.PICK_OBJECT, {
        bubbles: true,
        detail: {
          target: `geometry_info_${this.arrayID}`,
          props: response.info
        }
      })
    );
  }

  private buttonHandler(event: CustomEvent<GUIEvent<ButtonProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== this.arrayID) {
      return;
    }

    switch (event.detail.props.command) {
      case Commands.CLEAR:
        for (const [, status] of this.tileStatus) {
          if (status.state === TileState.VISIBLE) {
            status.tile?.updateSelection([]);
          }
        }
        break;
      case Commands.SELECT:
        for (const [, status] of this.tileStatus) {
          if (status.state === TileState.VISIBLE) {
            status.tile?.updatePicked(
              BigInt(event.detail.props.data?.id),
              BigInt(event.detail.props.data?.previousID ?? -1)
            );
          }
        }
        break;
      case Commands.COLOR:
        {
          if (target[1] === 'fillColor' || target[1] === 'outlineColor') {
            const color: { r: number; g: number; b: number } =
              event.detail.props.data;
            this.styleOptions[target[1]] = new Color3(
              color.r / 255,
              color.g / 255,
              color.b / 255
            );
          } else {
            const groupIndex = Number.parseInt(target[1]);
            const color: { r: number; g: number; b: number } =
              event.detail.props.data;

            this.styleOptions.colorScheme[4 * groupIndex] = color.r / 255;
            this.styleOptions.colorScheme[4 * groupIndex + 1] = color.g / 255;
            this.styleOptions.colorScheme[4 * groupIndex + 2] = color.b / 255;
          }

          for (const [, status] of this.tileStatus) {
            if (status.state === TileState.VISIBLE) {
              status.tile?.update(this.styleOptions);
            }
          }
        }
        break;
      case Commands.GROUP:
        {
          let state = this.styleOptions.groupState.get(this.activeFeature.name);
          if (!state) {
            state = new Map<number, number>();
            this.styleOptions.groupState.set(this.activeFeature.name, state);
          }
          state.set(
            event.detail.props.data.category,
            event.detail.props.data.group
          );

          for (const [, status] of this.tileStatus) {
            status.tile?.update({
              ...this.styleOptions,
              groupUpdate: {
                categoryIndex: event.detail.props.data.category,
                group: event.detail.props.data.group
              }
            });
          }
        }
        break;
      default:
        break;
    }
  }

  public setupEventListeners(): void {
    window.addEventListener(
      Events.BUTTON_CLICK,
      this.buttonHandler.bind(this) as any,
      { capture: true }
    );
    window.addEventListener(
      Events.SELECT_INPUT_CHANGE,
      this.selectHandler.bind(this) as any,
      { capture: true }
    );
    window.addEventListener(
      Events.SLIDER_CHANGE,
      this.sliderHandler.bind(this) as any,
      { capture: true }
    );
    window.addEventListener(
      Events.COLOR_CHANGE,
      this.buttonHandler.bind(this) as any,
      { capture: true }
    );
  }

  public stopEventListeners(): void {
    window.removeEventListener(
      Events.BUTTON_CLICK,
      this.buttonHandler.bind(this) as any,
      { capture: true }
    );
    window.removeEventListener(
      Events.SELECT_INPUT_CHANGE,
      this.selectHandler.bind(this) as any,
      { capture: true }
    );
    window.removeEventListener(
      Events.SLIDER_CHANGE,
      this.sliderHandler.bind(this) as any,
      { capture: true }
    );
    window.removeEventListener(
      Events.COLOR_CHANGE,
      this.buttonHandler.bind(this) as any,
      { capture: true }
    );
  }

  private selectHandler(event: CustomEvent<GUIEvent<SelectProps>>) {
    const target = event.detail.target.split('_');

    let updateOptions: GeometryUpdateOptions = { ...this.styleOptions };

    if (target[0] !== this.arrayID) {
      return;
    }

    switch (target[1]) {
      case 'style':
        this.styleOptions.style = event.detail.props.value + 1;
        updateOptions = { ...this.styleOptions };
        break;
      case 'feature':
        this.activeFeature = this.metadata.features[event.detail.props.value];
        updateOptions.feature = this.activeFeature;
        break;
      case 'renderingGroup':
        this.styleOptions.renderingGroup = event.detail.props.value + 1;
        updateOptions = { ...this.styleOptions };
        break;
      default:
        return;
    }

    for (const [, status] of this.tileStatus) {
      if (status.state === TileState.VISIBLE) {
        status.tile?.update(updateOptions);
      }
    }
  }

  private sliderHandler(event: CustomEvent<GUIEvent<SliderProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== this.arrayID) {
      return;
    }

    switch (target[1]) {
      case 'fillOpacity':
        this.styleOptions.fillOpacity = Math.max(
          event.detail.props.value,
          0.01
        );
        break;
      case 'lineThickness':
        this.styleOptions.outlineThickness = event.detail.props.value;
        break;
    }

    for (const [, status] of this.tileStatus) {
      if (status.state === TileState.VISIBLE) {
        status.tile?.update(this.styleOptions);
      }
    }
  }

  private onCancel(id: string, response: BaseResponse) {
    const tile = this.tileStatus.get(id);
    if (
      tile &&
      tile.state === TileState.LOADING &&
      tile.nonce === response.nonce
    ) {
      console.warn(`Tile '${id}' aborted unexpectedly. Retrying...`);

      const index = id
        .split('_')
        .map(x => parseInt(x))
        .filter(x => !Number.isNaN(x));

      this.workerPool.postMessage({
        type: RequestType.GEOMETRY,
        id: id,
        request: {
          index: index,
          tileSize: this.tileSize / 2 ** this.nativeZoom,
          arrayID: this.arrayID,
          namespace: this.namespace,
          idAttribute: this.metadata.idAttribute,
          geometryAttribute: this.metadata.geometryAttribute,
          pad: this.metadata.pad,
          type: this.metadata.type,
          imageCRS: this.baseCRS,
          geometryCRS: this.metadata.crs,
          geotransformCoefficients: this.transformationCoefficients,
          metersPerUnit: this.metersPerUnit,
          nonce: response.nonce
        } as GeometryMessage
      } as DataRequest);
    }
  }
}
