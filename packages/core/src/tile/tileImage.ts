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
import { LevelRecord, ImageMetadata, types } from './types';
import { AssetEntry, Attribute, Dimension, GeometryMetadata } from '../types';
import { getAssetMetadata, getGroupContents } from '../utils/metadata-utils';
import TileImageGUI from './utils/gui-utils';
import { Events } from '@tiledb-inc/viz-components';
import {
  clearMultiCache,
  getTileCount,
  initializeCacheDB
} from '../utils/cache';
import { WorkerPool } from './worker/tiledb.worker.pool';
import { getGeometryMetadata } from '../utils/metadata-utils/metadata-utils';
import { ImageManager } from './model/image/imageManager';
import { GeometryManager } from './model/geometry/geometryManager';
import { MinimapManager } from './model/image/minimap';

export class TileDBTileImageVisualization extends TileDBVisualization {
  private scene!: Scene;
  private options: TileDBTileImageOptions;
  private tileset!: ImageManager;
  private geometryManager?: GeometryManager;
  private minimapManager!: MinimapManager;
  private baseWidth!: number;
  private baseHeight!: number;
  private metadata!: ImageMetadata;
  private attributes!: Attribute[];
  private dimensions!: Dimension[];
  private geometryMetadata?: GeometryMetadata;
  private levels!: LevelRecord[];
  private groupAssets!: AssetEntry[];
  private camera!: FreeCamera;
  private gui!: TileImageGUI;
  private tileSize = 1024;
  private workerPool: WorkerPool;

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

    this.workerPool = new WorkerPool({
      token: options.token,
      basePath: options.tiledbEnv
    });
  }

  protected async createScene(): Promise<Scene> {
    return super.createScene().then(async scene => {
      this.scene = scene;
      await this.initializeScene();

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
        arrayID: this.options.arrayID,
        groupID: this.options.groupID
      })) as [ImageMetadata, Attribute[], Dimension[], LevelRecord[]];

    this.groupAssets = await getGroupContents({
      token: this.options.token,
      tiledbEnv: this.options.tiledbEnv,
      namespace: this.options.namespace,
      baseGroup: this.options.baseGroup
    });

    if (this.options.geometryArrayID) {
      this.geometryMetadata = await getGeometryMetadata(this.options);

      const originalLevel = this.levels.at(-1);

      if (!originalLevel) {
        console.warn(
          'Unable to construct geometry manager. Base image level is undefined'
        );
      } else {
        this.geometryManager = new GeometryManager(
          this.scene,
          this.workerPool,
          this.tileSize,
          {
            arrayID: this.options.geometryArrayID,
            namespace: this.options.namespace,
            metadata: this.geometryMetadata,
            baseCRS: this.metadata.crs ?? '',
            baseWidth:
              originalLevel.dimensions[originalLevel.axes.indexOf('X')],
            baseHeight:
              originalLevel.dimensions[originalLevel.axes.indexOf('Y')],
            transformationCoefficients:
              this.metadata.transformationCoefficients ?? [],
            nativeZoom: this.levels.length - 1
          }
        );

        await initializeCacheDB([
          `${this.options.geometryArrayID}_${this.tileSize}`
        ]);
      }
    }

    this.baseWidth =
      this.levels[0].dimensions[this.levels[0].axes.indexOf('X')];
    this.baseHeight =
      this.levels[0].dimensions[this.levels[0].axes.indexOf('Y')];

    await initializeCacheDB([
      `${this.levels[0].id}_${Math.max(this.baseWidth, this.baseHeight)}`
    ]);
    await initializeCacheDB(
      this.levels
        .map(x => `${x.id}_${this.tileSize}`)
        .filter(
          (value: string, index: number, array: string[]) =>
            array.indexOf(value) === index
        )
    );

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

    this.tileset = new ImageManager(
      this.scene,
      this.workerPool,
      this.tileSize,
      {
        metadata: this.metadata,
        dimensions: this.dimensions,
        attributes: this.attributes,
        levels: this.levels,
        namespace: this.options.namespace
      }
    );

    this.minimapManager = new MinimapManager(
      this.scene,
      this.workerPool,
      Math.max(this.baseWidth, this.baseHeight),
      {
        metadata: this.metadata,
        dimensions: this.dimensions,
        attributes: this.attributes,
        baseLevel: this.levels[0],
        namespace: this.options.namespace
      }
    );

    this.scene.getEngine().onResizeObservable.add(() => {
      this.resizeViewport();
      this.minimapManager.updateTiles(new MinimapManager.SizeUpdate());
    });

    this.gui = new TileImageGUI(
      this.tileset,
      this.minimapManager,
      this.rootElement,
      this.metadata.channels.get(
        this.attributes.filter(x => x.visible)[0].name
      ) ?? [],
      this.dimensions,
      this.groupAssets,
      (step: number) => this.onZoom(step),
      () => this.clearCache(),
      (namespace: string, groupID?: string, arrayID?: string) =>
        this.onAssetSelection(namespace, groupID, arrayID)
    );

    this.updateEngineInfo();

    const intervalID = setInterval(() => this.updateEngineInfo(), 30 * 1000);

    this.scene.onDisposeObservable.add(() => {
      clearInterval(intervalID);
      this.tileset.dispose();
      this.geometryManager?.dispose();
      this.minimapManager.dispose();
      this.workerPool.dispose();
      this.gui.dispose();
    });

    this.scene.onBeforeRenderObservable.add(() => {
      this.fetchTiles();
    });
  }

  private clearScene() {
    this.scene.onDisposeObservable.clear();
    this.scene.onBeforeRenderObservable.clear();

    this.tileset.dispose();
    this.minimapManager.dispose();
    this.geometryManager?.dispose();
    this.workerPool.cleanUp();
    this.gui.dispose();
    this.camera.dispose();
    this.scene.getEngine().clearInternalTexturesCache();
  }

  private updateEngineInfo() {
    getTileCount(this.levels.map(x => `${x.id}_${this.tileSize}`)).then(
      (tileCount: number) => {
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
    const integerZoom = Math.max(
      0,
      Math.min(this.levels.length - 1, Math.ceil(Math.log2(this.zoom)))
    );

    this.tileset.loadTiles(this.camera, integerZoom);
    this.minimapManager.loadTiles(this.camera, integerZoom);
    this.geometryManager?.loadTiles(this.camera, integerZoom);
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
    this.zoom =
      2 **
      Math.max(
        -2,
        Math.min(this.levels.length + 1, Math.log2(this.zoom) + step)
      );

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

  private onAssetSelection(
    namespace: string,
    groupID?: string,
    arrayID?: string
  ) {
    this.scene.getEngine().stopRenderLoop();

    this.clearScene();

    this.options.groupID = groupID;
    this.options.arrayID = arrayID;
    this.options.namespace = namespace;

    this.initializeScene().then(() =>
      this.scene.getEngine().runRenderLoop(() => this.scene.render())
    );
  }

  private clearCache() {
    clearMultiCache(this.levels.map(x => `${x.id}_${this.tileSize}`));
  }
}
