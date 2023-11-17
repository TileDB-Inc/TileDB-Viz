import {
  GeometryMessage,
  DataRequest,
  GeometryResponse,
  RequestType,
  GeometryInfoMessage,
  GeometryInfoResponse,
  BaseResponse,
  GeometryStyle
} from '../../types';
import { GeometryTile } from './geometry';
import {
  Scene,
  RenderTargetTexture,
  ArcRotateCamera,
  Color3
} from '@babylonjs/core';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { Manager, TileStatus, TileState } from '../manager';
import { GeometryMetadata } from '../../../types';
import {
  ButtonProps,
  Events,
  GUIEvent,
  Commands,
  SliderProps,
  SelectProps
} from '@tiledb-inc/viz-components';
import { getCamera } from '../../utils/camera-utils';
import { PickingTool } from '../../utils/picking-tool';

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
    outlineThickness: 1
  };

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

    this.workerPool.callbacks.geometry.push(
      this.onGeometryTileDataLoad.bind(this)
    );
    this.workerPool.callbacks.cancel.push(this.onCancel.bind(this));
    this.workerPool.callbacks.info.push(this.onGeometryInfoDataLoad.bind(this));
    this.pickingTool.pickCallbacks.push(this.pickGeometry.bind(this));

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
          const tileIndex = `geometry_${x}_${y}`;
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
                nonce: ++this.nonce
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
        id: 'geometry_info',
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
      status.tile = new GeometryTile(response, this.renderTarget, this.scene);
      status.tile.update(this.styleOptions);
    }

    status.state = TileState.VISIBLE;
    this.updateLoadingStatus(true);
  }

  private onGeometryInfoDataLoad(id: string, response: GeometryInfoResponse) {
    if (id !== 'geometry_info') {
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
          target: 'geometry_info',
          props: response.info
        }
      })
    );
  }

  private pickingHandler(event: CustomEvent<GUIEvent<ButtonProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== 'geometry') {
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
      default:
        break;
    }
  }

  public setupEventListeners(): void {
    window.addEventListener(
      Events.BUTTON_CLICK,
      this.pickingHandler.bind(this) as any,
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
  }

  public stopEventListeners(): void {
    window.removeEventListener(
      Events.BUTTON_CLICK,
      this.pickingHandler.bind(this) as any,
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
  }

  private selectHandler(event: CustomEvent<GUIEvent<SelectProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== 'geometry') {
      return;
    }

    switch (target[1]) {
      case 'style':
        this.styleOptions.style = event.detail.props.value + 1;
        break;
      default:
        return;
    }

    for (const [, status] of this.tileStatus) {
      if (status.state === TileState.VISIBLE) {
        status.tile?.update(this.styleOptions);
      }
    }
  }

  private sliderHandler(event: CustomEvent<GUIEvent<SliderProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== 'geometry') {
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

function screenToWorldSpaceBbox(scene: Scene, bbox: number[]) {
  // calculate world space bbox to use for geometry query
  const camera = getCamera(scene, 'Main');

  const screenBbox = [
    scene.getEngine().getRenderWidth(),
    scene.getEngine().getRenderHeight()
  ];
  const offset = [
    (camera?.target.x ?? 0) + (camera?.orthoLeft ?? 0),
    -(camera?.target.z ?? 0) + (camera?.orthoTop ?? 0)
  ];
  const worldBbox = [
    (camera?.orthoRight ?? 0) - (camera?.orthoLeft ?? 0),
    (camera?.orthoTop ?? 0) - (camera?.orthoBottom ?? 0)
  ];

  const selectionWorldBbox = new Array(4);
  [selectionWorldBbox[0], selectionWorldBbox[2]] = [
    offset[0] + (bbox[0] / screenBbox[0]) * worldBbox[0],
    offset[0] + (bbox[2] / screenBbox[0]) * worldBbox[0]
  ];
  [selectionWorldBbox[1], selectionWorldBbox[3]] = [
    offset[1] - (bbox[1] / screenBbox[1]) * worldBbox[1],
    offset[1] - (bbox[3] / screenBbox[1]) * worldBbox[1]
  ];

  return selectionWorldBbox;
}
