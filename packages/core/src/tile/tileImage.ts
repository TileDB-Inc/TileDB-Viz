import { TileDBVisualization } from '../base';
import {
  Scene,
  Vector3,
  PointerInfo,
  PointerEventTypes,
  Nullable,
  FreeCamera
} from '@babylonjs/core';
import { TileDBTileImageOptions, TileViewerEvents, ZoomEvent } from './types';
import { setupCamera, resizeOrtographicCameraViewport } from './utils';
import getTileDBClient from '../utils/getTileDBClient';
import { Tileset } from './model/tileset';
import { LevelRecord, ImageMetadata } from './types';
import { Attribute, Dimension } from '../types';
import { getAssetMetadata } from '../utils/metadata-utils';
import TileImageGUI from './utils/gui-utils';

class TileDBTiledImageVisualization extends TileDBVisualization {
  private scene!: Scene;
  private options: TileDBTileImageOptions;
  private tileset!: Tileset;
  private baseWidth!: number;
  private baseHeight!: number;
  private metadata!: ImageMetadata;
  private attributes!: Attribute[];
  private dimensions!: Dimension[];
  private levels!: LevelRecord[];
  private camera!: FreeCamera;

  private pointerDownStartPosition: Nullable<Vector3>;
  private zoom: number;

  constructor(options: TileDBTileImageOptions) {
    super(options);

    this.options = options;
    this.pointerDownStartPosition = null;
    this.zoom = 0.25;

    if (options.token || options.tiledbEnv) {
      getTileDBClient({
        ...(options.token ? { apiKey: options.token } : {}),
        ...(options.tiledbEnv ? { basePath: options.tiledbEnv } : {})
      });
    }
  }

  protected async createScene(): Promise<Scene> {
    return super.createScene().then(async scene => {
      [this.metadata, this.attributes, this.dimensions, this.levels] =
        (await getAssetMetadata({
          token: this.options.token,
          tiledbEnv: this.options.tiledbEnv,
          namespace: this.options.namespace,
          assetID: this.options.assetID
        })) as [ImageMetadata, Attribute[], Dimension[], LevelRecord[]];
      this.baseWidth =
        this.levels[0].dimensions[this.levels[0].axes.indexOf('X')];
      this.baseHeight =
        this.levels[0].dimensions[this.levels[0].axes.indexOf('Y')];
      this.scene = scene;

      setupCamera(
        this.scene,
        this.zoom,
        new Vector3(this.baseWidth / 2, -100, this.baseHeight / 2)
      );
      this.setupCameraMovement();

      if (this.scene.activeCamera === null) {
        throw new Error('Failed to initialize camera');
      }

      this.camera = this.scene.activeCamera as FreeCamera;

      this.tileset = new Tileset(
        this.levels,
        this.dimensions,
        this.metadata.channels,
        this.attributes,
        1024,
        this.options.namespace,
        this.options.token,
        '',
        scene
      );

      this.scene.getEngine().onResizeObservable.add(() => {
        this.resizeViewport();
      });

      this.setupEventListeners();

      new TileImageGUI(
        this.scene,
        this.tileset,
        this.rootElement,
        this.height,
        this.metadata.channels.get('intensity') ?? [],
        this.dimensions
      );

      this.scene.onBeforeRenderObservable.add(() => {
        this.fetchTiles();

        //console.log(this.scene.getEngine()._uniformBuffers.length);
      });

      this.scene.onDisposeObservable.add(() => {
        this.cleanupEventListeners();
      });

      //scene.debugLayer.show();

      return scene;
    });
  }

  private fetchTiles() {
    this.tileset.calculateVisibleTiles(this.camera, Math.log2(this.zoom));
    this.tileset.evict();
  }

  private resizeViewport() {
    resizeOrtographicCameraViewport(this.scene, this.zoom);
  }

  private setupCameraMovement() {
    // Add camera panning and zoom via mouse control
    this.scene.onPointerObservable.add((pointerInfo: PointerInfo) => {
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN:
          this.pointerDownStartPosition = new Vector3(
            pointerInfo.event.offsetX * (1 / this.zoom),
            0,
            pointerInfo.event.offsetY * (1 / this.zoom)
          );
          break;
        case PointerEventTypes.POINTERUP:
          this.pointerDownStartPosition = null;
          break;
        case PointerEventTypes.POINTERMOVE:
          if (this.pointerDownStartPosition) {
            const pointerCurrentPosition = new Vector3(
              pointerInfo.event.offsetX * (1 / this.zoom),
              0,
              pointerInfo.event.offsetY * (1 / this.zoom)
            );
            const positionDifference = pointerCurrentPosition.subtract(
              this.pointerDownStartPosition
            );
            this.camera.position.addInPlace(
              positionDifference.multiplyByFloats(-1, 0, -1)
            );

            this.pointerDownStartPosition = pointerCurrentPosition;
          }
          break;
        case PointerEventTypes.POINTERWHEEL:
          this.zoom =
            2 **
            Math.max(
              -2,
              Math.min(
                this.levels.length,
                Math.log2(this.zoom) +
                  (pointerInfo.event as WheelEvent).deltaY / 1500
              )
            );
          resizeOrtographicCameraViewport(this.scene, this.zoom);
          break;
      }
    });
  }

  private setupEventListeners() {
    window.addEventListener(TileViewerEvents.ZOOM, e => this.onZoom(e as any), {
      capture: true
    });
  }

  private cleanupEventListeners() {
    window.removeEventListener(
      TileViewerEvents.ZOOM,
      e => this.onZoom(e as any),
      {
        capture: true
      }
    );
  }

  private onZoom(e: CustomEvent<ZoomEvent>) {
    this.zoom = 2 ** e.detail.zoom;
    resizeOrtographicCameraViewport(this.scene, this.zoom);
  }
}

export default TileDBTiledImageVisualization;
