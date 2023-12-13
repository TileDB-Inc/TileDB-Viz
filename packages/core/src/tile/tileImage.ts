import { TileDBVisualization } from '../base';
import { Color3, DirectionalLight, Scene, Vector3 } from '@babylonjs/core';
import { TileDBTileImageOptions } from './types';
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
import { CameraManager } from './utils/camera-utils';
import { GeometryPipeline } from './pipelines/pickingPipeline';
import { PickingTool } from './utils/picking-tool';
import { Manager } from './model/manager';
import { Tile } from './model/tile';

export class TileDBTileImageVisualization extends TileDBVisualization {
  private scene!: Scene;
  private options: TileDBTileImageOptions;
  private tileset!: ImageManager;
  private baseWidth!: number;
  private baseHeight!: number;
  private metadata!: ImageMetadata;
  private attributes!: Attribute[];
  private dimensions!: Dimension[];
  private levels!: LevelRecord[];
  private groupAssets!: AssetEntry[];
  private gui!: TileImageGUI;
  private tileSize = 1024;
  private workerPool: WorkerPool;
  private cameraManager!: CameraManager;
  private pickingTool!: PickingTool;
  private geometryMetadata: Map<string, GeometryMetadata>;
  private assetManagers: Manager<Tile<any>>[];

  constructor(options: TileDBTileImageOptions) {
    super(options);

    this.options = options;

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

    this.geometryMetadata = new Map<string, GeometryMetadata>();
    this.assetManagers = [];
  }

  protected async createScene(): Promise<Scene> {
    return super.createScene().then(async scene => {
      this.scene = scene;
      await this.initializeScene();

      return scene;
    });
  }

  private async initializeScene() {
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

    if (this.options.defaultChannels) {
      const defaultAttribute = this.attributes.filter(x => x.visible)[0].name;

      for (const entry of this.metadata.channels.get(defaultAttribute) ?? []) {
        entry.visible = false;
      }

      for (const entry of this.options.defaultChannels) {
        const channel = this.metadata.channels
          .get(defaultAttribute)
          ?.at(entry.index);

        if (!channel) {
          continue;
        }

        channel.visible = true;
        channel.intensity = entry.intensity ?? channel.intensity;
        channel.color = entry.color
          ? [entry.color.r, entry.color.g, entry.color.b]
          : channel.color;
      }
    }

    this.baseWidth =
      this.levels[0].dimensions[this.levels[0].axes.indexOf('X')];
    this.baseHeight =
      this.levels[0].dimensions[this.levels[0].axes.indexOf('Y')];

    this.scene.getEngine().disableUniformBuffers = false;

    this.cameraManager = new CameraManager(
      this.scene,
      0.25,
      this.baseWidth,
      this.baseHeight
    );
    this.cameraManager.upperZoomLimit = 2 ** (this.levels.length + 3);

    this.pickingTool = new PickingTool(this.scene);

    if (this.options.geometryArrayID) {
      const light = new DirectionalLight(
        'light',
        new Vector3(0.5, -1, 0.5),
        this.scene
      );
      light.diffuse = new Color3(1, 1, 1);
      light.specular = new Color3(0.1, 0.1, 0.1);
      light.intensity = 1;

      const originalLevel = this.levels.at(-1);
      if (!originalLevel) {
        throw new Error(
          'Unable to construct geometry manager. Base image level is undefined'
        );
      }

      const pipeline = new GeometryPipeline(this.scene);
      const renderTarget = pipeline.initializeRTT();
      const transformationCoefficients =
        this.metadata.transformationCoefficients ?? [];
      const nativeZoom = this.levels.length - 1;
      transformationCoefficients[1] *= 2 ** nativeZoom;
      transformationCoefficients[2] *= 2 ** nativeZoom;
      transformationCoefficients[4] *= 2 ** nativeZoom;
      transformationCoefficients[5] *= 2 ** nativeZoom;

      for (const geometryArrayID of this.options.geometryArrayID) {
        const metadata = await getGeometryMetadata({
          ...this.options,
          geometryArrayID
        });

        this.geometryMetadata.set(geometryArrayID, metadata);
        this.assetManagers.push(
          new GeometryManager(
            this.scene,
            this.workerPool,
            this.pickingTool,
            this.tileSize,
            {
              renderTarget: renderTarget,
              arrayID: geometryArrayID,
              namespace: this.options.namespace,
              metadata: metadata,
              baseCRS: this.metadata.crs ?? '',
              baseWidth:
                originalLevel.dimensions[originalLevel.axes.indexOf('X')],
              baseHeight:
                originalLevel.dimensions[originalLevel.axes.indexOf('Y')],
              transformationCoefficients: transformationCoefficients,
              nativeZoom: nativeZoom,
              metersPerUnit: transformationCoefficients[1]
            }
          )
        );

        await initializeCacheDB([
          `${geometryArrayID}_${this.tileSize / 2 ** nativeZoom}`
        ]);
      }
    }

    await initializeCacheDB(
      this.levels
        .map(x => `${x.id}_${this.tileSize}`)
        .filter(
          (value: string, index: number, array: string[]) =>
            array.indexOf(value) === index
        )
    );

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

    this.scene.getEngine().onResizeObservable.add(() => {
      this.resizeViewport();
    });

    this.gui = new TileImageGUI(
      this.rootElement,
      this.metadata.channels.get(
        this.attributes.filter(x => x.visible)[0].name
      ) ?? [],
      this.dimensions,
      this.groupAssets,
      this.metadata,
      this.geometryMetadata,
      () => this.clearCache(),
      (namespace: string, groupID?: string, arrayID?: string) =>
        this.onAssetSelection(namespace, groupID, arrayID)
    );

    this.updateEngineInfo();

    const intervalID = setInterval(() => this.updateEngineInfo(), 30 * 1000);

    this.scene.onDisposeObservable.add(() => {
      clearInterval(intervalID);

      for (const manager of this.assetManagers) {
        manager.dispose();
      }
      this.tileset.dispose();
      this.workerPool.dispose();
      this.gui.dispose();
      this.cameraManager.dispose();
      this.pickingTool.dispose();
    });

    this.scene.onBeforeRenderObservable.add(() => {
      this.fetchTiles();
    });
  }

  private clearScene() {
    this.scene.onDisposeObservable.clear();
    this.scene.onBeforeRenderObservable.clear();

    for (const manager of this.assetManagers) {
      manager.dispose();
    }
    this.tileset.dispose();
    this.workerPool.cleanUp();
    this.gui.dispose();
    this.cameraManager.dispose();
    this.pickingTool.dispose();
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
      Math.min(
        this.levels.length - 1,
        Math.ceil(Math.log2(this.cameraManager.getZoom()))
      )
    );

    this.tileset.loadTiles(this.cameraManager.getMainCamera(), integerZoom);
    for (const manager of this.assetManagers) {
      manager.loadTiles(this.cameraManager.getMainCamera(), integerZoom);
    }
  }

  private resizeViewport() {
    this.cameraManager.resizeCameraViewport();
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
