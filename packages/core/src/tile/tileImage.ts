import { TileDBVisualization } from '../base';
import {
  Scene,
  Vector3,
  PointerInfo,
  PointerEventTypes,
  Nullable,
  FreeCamera
} from '@babylonjs/core';
import { TileDBTileImageOptions } from './types';
import { setupCamera, resizeOrtographicCameraViewport } from './utils';
import getTileDBClient from '../utils/getTileDBClient';
import { Tileset } from './model/tileset';
import { LevelRecord, ImageMetadata, types } from './types';
import { AssetEntry, Attribute, Dimension } from '../types';
import { getAssetMetadata, getGroupContents } from '../utils/metadata-utils';
import TileImageGUI from './utils/gui-utils';
import { Events } from '@tiledb-inc/viz-components';
import { clearMultiCache, getTileCount } from '../utils/cache';

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
  private groupAssets!: AssetEntry[];
  private camera!: FreeCamera;
  private gui!: TileImageGUI;
  private tileSize = 1024;

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
      this.scene = scene;
      await this.initializeScene();
      // scene.debugLayer.show();

      return scene;
    });
  }

  private async initializeScene() {
    this.pointerDownStartPosition = null;
    this.zoom = 0.25;

    [this.metadata, this.attributes, this.dimensions, this.levels] =
      (await getAssetMetadata({
        token: this.options.token,
        tiledbEnv: this.options.tiledbEnv,
        namespace: this.options.namespace,
        assetID: this.options.assetID
      })) as [ImageMetadata, Attribute[], Dimension[], LevelRecord[]];

    this.groupAssets = await getGroupContents({
      token: this.options.token,
      tiledbEnv: this.options.tiledbEnv,
      namespace: this.options.namespace,
      assetID: this.options.assetID,
      baseGroup: this.options.baseGroup
    });

    this.baseWidth =
      this.levels[0].dimensions[this.levels[0].axes.indexOf('X')];
    this.baseHeight =
      this.levels[0].dimensions[this.levels[0].axes.indexOf('Y')];
    this.scene.getEngine().disableUniformBuffers = false;

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
      this.tileSize,
      this.options.namespace,
      this.options.token,
      '',
      this.scene
    );

    this.scene.getEngine().onResizeObservable.add(() => {
      this.resizeViewport();
      this.tileset.minimap.resize();
    });

    this.gui = new TileImageGUI(
      this.scene,
      this.tileset,
      this.rootElement,
      this.metadata.channels.get('intensity') ?? [],
      this.dimensions,
      this.groupAssets,
      (step: number) => this.onZoom(step),
      () => this.clearCache(),
      (namespace: string, assetID: string) =>
        this.onAssetSelection(namespace, assetID)
    );

    this.updateEngineInfo();

    const intervalID = setInterval(() => this.updateEngineInfo(), 30 * 1000);

    this.scene.onDisposeObservable.add(() => {
      clearInterval(intervalID);
      this.gui.dispose();
    });

    this.scene.onBeforeRenderObservable.add(() => {
      this.fetchTiles();

      //console.log(this.scene.getEngine()._uniformBuffers.length);
    });
  }

  private clearScene() {
    this.scene.onDisposeObservable.clear();
    this.scene.onBeforeRenderObservable.clear();

    this.gui.dispose();
    this.camera.dispose();
    this.tileset.minimap.dispose();
    this.tileset.tiles.forEach(x => x.dispose());
  }

  private updateEngineInfo() {
    getTileCount(this.levels.map(x => `${x.id}_${this.tileSize}`)).then(
      tileCount => {
        const selectedAttribute = this.attributes
          .filter(x => x.visible)[0]
          .type.toLowerCase();
        const size =
          (tileCount *
            (types as any)[selectedAttribute].bytes *
            this.tileSize ** 2) /
          2 ** 30;

        window.dispatchEvent(
          new CustomEvent(Events.ENGINE_INFO_UPDATE, {
            bubbles: true,
            detail: {
              type: 'CACHE_INFO',
              tiles: tileCount,
              diskSpace: size
            }
          })
        );
      }
    );
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
          this.onZoom((pointerInfo.event as WheelEvent).deltaY / 1500);
          break;
      }
    });
  }

  private onZoom(step: number) {
    this.zoom = this.zoom =
      2 **
      Math.max(-2, Math.min(this.levels.length, Math.log2(this.zoom) + step));

    resizeOrtographicCameraViewport(this.scene, this.zoom);

    window.dispatchEvent(
      new CustomEvent(Events.ENGINE_INFO_UPDATE, {
        bubbles: true,
        detail: {
          type: 'ZOOM_INFO',
          zoom: Math.log2(this.zoom)
        }
      })
    );
  }

  private onAssetSelection(namespace: string, assetID: string) {
    this.scene.getEngine().stopRenderLoop();

    this.clearScene();

    this.options.assetID = assetID;
    this.options.namespace = namespace;

    this.initializeScene().then(() =>
      this.scene.getEngine().runRenderLoop(() => this.scene.render())
    );
  }

  private clearCache() {
    clearMultiCache(this.levels.map(x => `${x.id}_${this.tileSize}`));
  }
}

export default TileDBTiledImageVisualization;
