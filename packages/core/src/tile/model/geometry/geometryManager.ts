import {
  GeometryMessage,
  DataRequest,
  GeometryResponse,
  RequestType,
  GeometryInfoMessage,
  GeometryInfoResponse
} from '../../types';
import { GeometryTile } from './geometry';
import {
  Scene,
  RenderTargetTexture,
  AbstractMesh,
  HighlightLayer,
  Color3,
  Mesh,
  VertexData,
  StandardMaterial,
  PointerInfo,
  PointerEventTypes,
  Nullable,
  Observer,
  Constants,
  ArcRotateCamera
} from '@babylonjs/core';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { Manager, TileStatus, TileState } from '../manager';
import { GeometryMetadata } from '../../../types';
import { ButtonProps, Events, GUIEvent } from '@tiledb-inc/viz-components';

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
  private highlightLayer: HighlightLayer;
  private selectedPolygon?: Mesh;
  private pointerHandler: Nullable<Observer<PointerInfo>>;
  private metersPerUnit: number;

  constructor(
    scene: Scene,
    workerPool: WorkerPool,
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
    this.pointerHandler = null;
    this.metersPerUnit = geometryOptions.metersPerUnit;

    this.workerPool.callbacks.geometry.push( this.onGeometryTileDataLoad.bind(this));
    this.workerPool.callbacks.info.push(this.onGeometryInfoDataLoad.bind(this));

    this.highlightLayer = new HighlightLayer('GeometryHighlight', scene);

    this.setupEventListeners();
  }

  public loadTiles(camera: ArcRotateCamera, zoom: number): void {
    for (const [, value] of this.tileStatus) {
      value.evict = true;
    }

    if (zoom < this.nativeZoom) {
      return;
    }

    const [minXIndex, maxXIndex, minYIndex, maxYIndex] = this.getTileIndexRange(
      camera,
      0
    );

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
              tileSize: this.tileSize,
              arrayID: this.arrayID,
              namespace: this.namespace,
              idAttribute: this.metadata.idAttribute,
              geometryAttribute: this.metadata.geometryAttribute,
              pad: this.metadata.pad,
              type: this.metadata.type,
              imageCRS: this.baseCRS,
              geometryCRS: this.metadata.crs,
              geotransformCoefficients: this.transformationCoefficients,
              metersPerUnit: this.metersPerUnit
            } as GeometryMessage
          } as DataRequest);

          this.updateLoadingStatus(false);

          status.state = TileState.LOADING;
          this.tileStatus.set(tileIndex, status);
        }
      }
    }

    for (const key of this.tileStatus.keys()) {
      const status = this.tileStatus.get(key);
      if (!status?.evict) {
        continue;
      }

      if (status.state === TileState.LOADING) {
        const canceled = this.workerPool.cancelRequest({
          type: RequestType.CANCEL,
          id: key
        } as DataRequest);

        if (canceled) {
          this.updateLoadingStatus(true);
        }
      } else if (status.state === TileState.VISIBLE) {
        status.tile?.dispose();
      }

      this.tileStatus.delete(key);
    }
  }

  public pickGeometry(pickedMesh: AbstractMesh, x: number, y: number) {
    const buffer = new Uint32Array(4);
    const gl = this.scene.getEngine()._gl;

    this.renderTarget._bindFrameBuffer();
    gl.readPixels(
      x,
      this.renderTarget.getRenderHeight() - y,
      1,
      1,
      gl.RGBA_INTEGER,
      gl.UNSIGNED_INT,
      buffer
    );

    if (buffer[3] === 1) {
      const index =
        pickedMesh.name.split(',').map(x => Number.parseInt(x)) ?? [];
      this.workerPool.postMessage({
        type: RequestType.GEOMETRY_INFO,
        id: 'geometry_info',
        request: {
          id: new BigInt64Array(buffer.buffer)[0],
          index: index,
          tileSize: this.tileSize,
          arrayID: this.arrayID,
          namespace: this.namespace,
          idAttribute: this.metadata.idAttribute,
          geometryAttribute: this.metadata.geometryAttribute,
          imageCRS: this.baseCRS,
          geometryCRS: this.metadata.crs,
          geotransformCoefficients: this.transformationCoefficients
        } as GeometryInfoMessage
      } as DataRequest);
    }
  }

  private onGeometryTileDataLoad(id: string, response: GeometryResponse) {
    if (response.canceled) {
      return;
    }

    const tileIndex = `geometry_${response.index[0]}_${response.index[1]}`;
    const status =
      this.tileStatus.get(tileIndex) ??
      ({
        evict: false,
        state: TileState.VISIBLE
      } as TileStatus<GeometryTile>);

    if (status.tile) {
      status.tile.update({ response });
    } else {
      status.tile = new GeometryTile(response, this.renderTarget,  this.scene);
    }

    status.state = TileState.VISIBLE;
    this.tileStatus.set(tileIndex, status);
    this.updateLoadingStatus(true);
  }

  private onGeometryInfoDataLoad(id: string, response: GeometryInfoResponse) {
    if (response.canceled || id !== 'geometry_info') {
      return;
    }

    this.highlightLayer.removeAllMeshes();
    this.selectedPolygon?.dispose(false, true);

    const material = new StandardMaterial(
      'SelectedPolygonMaterial',
      this.scene
    );
    material.diffuseColor = new Color3(0.2, 1, 0.2);
    material.depthFunction = Constants.LEQUAL;

    this.selectedPolygon = new Mesh('SelectedPolygon', this.scene);
    this.selectedPolygon.alwaysSelectAsActiveMesh = true;
    this.selectedPolygon.scaling.z = -1;
    this.selectedPolygon.material = material;
    this.selectedPolygon.layerMask = 1;
    this.selectedPolygon.renderingGroupId = 1;

    const vertexData = new VertexData();
    vertexData.positions = response.positions;
    vertexData.indices = response.indices;
    vertexData.applyToMesh(this.selectedPolygon, false);

    this.highlightLayer.addMesh(this.selectedPolygon, new Color3(0, 1, 0));

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

    if (target[0] !== 'geometry') return;

    switch (event.detail.props.command) {
      case 'clear':
        this.selectedPolygon?.dispose(false, true);
        this.highlightLayer.removeAllMeshes();
        break;
      default: 
        return;
    }
  }

  public setupEventListeners(): void {
    window.addEventListener(
      Events.BUTTON_CLICK,
      this.pickingHandler.bind(this) as any,
      { capture: true }
    );

    this.pointerHandler = this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERTAP:
          if (!pointerInfo.pickInfo?.pickedMesh) return;

          this.pickGeometry(
            pointerInfo.pickInfo?.pickedMesh,
            pointerInfo.event.offsetX,
            pointerInfo.event.offsetY
          );
          break;
      }
    });
  }

  public stopEventListeners(): void {
    window.removeEventListener(
      Events.BUTTON_CLICK,
      this.pickingHandler.bind(this) as any,
      { capture: true }
    ); 

    this.scene.onPointerObservable.remove(this.pointerHandler);
  }
}
