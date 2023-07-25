import { TileDBVisualization } from '../base';
import {
  Scene,
  Vector3,
  PointerInfo,
  PointerEventTypes,
  Nullable
} from '@babylonjs/core';
import {
  ChannelUpdateEvent,
  TileDBTileImageOptions,
  TileViewerEvents,
  ZoomEvent
} from './types';
import { setupCamera, resizeOrtographicCameraViewport } from './utils';
import getTileDBClient from '../utils/getTileDBClient';
import { Tileset } from './model/tileset';
import { Channel, LevelRecord, ImageMetadata } from './types';
import { range } from './utils/helpers';
import { Attribute, Dimension } from '../types';
import { getAssetMetadata } from '../utils/metadata-utils';

class TileDBTiledImageVisualization extends TileDBVisualization {
  private scene!: Scene;
  private options: TileDBTileImageOptions;
  private channelMapping!: number[];
  private intensityRanges!: number[];
  private colors!: number[];
  private tileset!: Tileset;
  private baseWidth!: number;
  private baseHeight!: number;
  private metadata!: ImageMetadata;
  private attributes!: Attribute[];
  private dimensions!: Dimension[];
  private levels!: LevelRecord[];

  private pointerDownStartPosition: Nullable<Vector3>;
  private zoom: number;
  private renderOptionsDirty: boolean;

  constructor(options: TileDBTileImageOptions) {
    super(options);

    this.options = options;
    this.renderOptionsDirty = true;
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
      this.initializeViewerState();

      setupCamera(
        this.scene,
        this.zoom,
        new Vector3(this.baseWidth / 2, -100, this.baseHeight / 2)
      );
      this.setupCameraMovement();

      this.tileset = new Tileset(
        this.levels,
        this.dimensions,
        this.attributes.filter(x => x.visible)[0],
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

      this.scene.onBeforeRenderObservable.add(() => {
        if (this.renderOptionsDirty) {
          this.renderOptionsDirty = false;
          this.generateChannelMapping();
          this.tileset.updateTileOptions(
            this.channelMapping,
            this.intensityRanges,
            this.colors
          );
        }

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
    this.tileset.calculateVisibleTiles(
      this.scene.activeCamera!,
      Math.log2(this.zoom)
    );
    this.tileset.evict();
  }

  private resizeViewport() {
    resizeOrtographicCameraViewport(this.scene, this.zoom);
  }

  private generateChannelMapping() {
    let visibleCounter = 0;
    for (let index = 0; index < this.channelMapping.length; ++index) {
      if (this.channelMapping[index] === -1) {
        continue;
      }

      this.channelMapping[index] = visibleCounter++;
    }
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
            this.scene.activeCamera!.position.addInPlace(
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
    window.addEventListener(
      TileViewerEvents.CHANNEL_UPDATE,
      e => this.onChannelUpdate(e as any),
      { capture: true }
    );
    window.addEventListener(TileViewerEvents.ZOOM, e => this.onZoom(e as any), {
      capture: true
    });
  }

  private cleanupEventListeners() {
    window.removeEventListener(
      TileViewerEvents.CHANNEL_UPDATE,
      e => this.onChannelUpdate(e as any),
      { capture: true }
    );
    window.removeEventListener(
      TileViewerEvents.ZOOM,
      e => this.onZoom(e as any),
      {
        capture: true
      }
    );
  }

  private initializeViewerState() {
    const selectedAttribute = this.attributes.filter(item => item.visible)[0]
      .name;

    this.channelMapping = range(
      0,
      this.metadata.channels.get(selectedAttribute)?.length ?? 0
    );
    this.intensityRanges =
      this.metadata.channels
        .get(selectedAttribute)
        ?.map((x: Channel) => [x.min, x.intensity, 0, 0])
        .flat() ?? [];
    this.colors =
      this.metadata.channels
        .get(selectedAttribute)
        ?.map((x: Channel) =>
          x.color.map(item => Math.min(Math.max(item / 255, 0), 1))
        )
        .flat() ?? [];
  }

  private onZoom(e: CustomEvent<ZoomEvent>) {
    this.zoom = 2 ** e.detail.zoom;
    resizeOrtographicCameraViewport(this.scene, this.zoom);
  }

  private onChannelUpdate(e: CustomEvent<ChannelUpdateEvent>) {
    const index = e.detail.channelIndex;

    this.channelMapping[index] = e.detail.visible ? index : -1;
    this.intensityRanges[4 * index + 1] = e.detail.intensity;
    this.colors.splice(
      4 * index,
      4,
      ...e.detail.color.map(item => Math.min(Math.max(item / 255, 0), 1))
    );

    this.renderOptionsDirty = true;
  }
}

export default TileDBTiledImageVisualization;
