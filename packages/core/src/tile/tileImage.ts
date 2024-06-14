import { TileDBVisualization } from '../base';
import {
  BoundingInfo,
  Color3,
  DirectionalLight,
  Scene,
  Vector3
} from '@babylonjs/core';
import {
  GeometryMetadata,
  PointCloudMetadata,
  TileDBTileImageOptions
} from './types';
import getTileDBClient from '../utils/getTileDBClient';
import { ImageMetadataV2 } from './types';
import { AssetEntry, FrameDetails, SceneOptions } from '../types';
import TileImageGUI from './utils/gui-utils';
import { Events } from '@tiledb-inc/viz-components';
import { WorkerPool } from './worker/tiledb.worker.pool';
import {
  getGeometryMetadata,
  getGroupContents,
  getImageMetadata,
  tileDBUriParser
} from '../utils/metadata-utils/metadata-utils';
import { ImageManager } from './model/image/imageManager';
import { CameraManager } from './utils/camera-utils';
import { PickingTool } from './utils/picking-tool';
import { Manager } from './model/manager';
import { Tile } from './model/tile';
import {
  GUIEvent,
  InfoPanelConfigEntry,
  InfoPanelInitializationEvent
} from '@tiledb-inc/viz-common';
import { ScenePanelInitializationEvent } from '@tiledb-inc/viz-common';
import proj4 from 'proj4';
import { inv } from 'mathjs';
import { getPointCloudMetadata } from '../utils/metadata-utils/pointcloud-metadata-utils';
import { PointManager } from './model/point/pointManager';
import { GeometryManager } from './model/geometry/geometryManager';
import { initializeCacheDB } from '../utils/cache';

export class TileDBTileImageVisualization extends TileDBVisualization {
  private scene!: Scene;
  private options: TileDBTileImageOptions;
  private gui!: TileImageGUI;
  private workerPool: WorkerPool;
  private cameraManager!: CameraManager;
  private pickingTool!: PickingTool;
  private imageMetadata!: ImageMetadataV2;
  private geometryMetadata: Map<string, GeometryMetadata>;
  private pointMetadata: Map<string, PointCloudMetadata>;
  private assetManagers: Manager<Tile<any>>[];
  private frameDetails: FrameDetails;
  private sceneOptions: SceneOptions;
  private groupAssets: AssetEntry[];

  constructor(options: TileDBTileImageOptions) {
    super(options);

    this.options = options;
    this.sceneOptions = {
      extents: new BoundingInfo(Vector3.ZeroReadOnly, Vector3.ZeroReadOnly)
    };
    this.groupAssets = [];

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

    this.geometryMetadata = new Map();
    this.pointMetadata = new Map();
    this.assetManagers = [];
    this.frameDetails = {
      zoom: 0.25,
      level: -2
    };
  }

  protected async createScene(): Promise<Scene> {
    return super.createScene().then(async scene => {
      this.scene = scene;
      // this.scene.debugLayer.show();
      await this.initializeScene();

      return scene;
    });
  }

  private async initializeScene() {
    const light = new DirectionalLight(
      'Global Light',
      new Vector3(0.5, -1, 0.5),
      this.scene
    );
    light.diffuse = new Color3(1, 1, 1);
    light.specular = new Color3(0.1, 0.1, 0.1);
    light.intensity = 1;

    let imageNamespace = this.options.namespace;
    let imageArrayID: string | undefined = undefined;
    let imageGroupID: string | undefined = undefined;

    if (this.options.arrayID) {
      ({ namespace: imageNamespace, id: imageArrayID } = tileDBUriParser(
        this.options.arrayID,
        this.options.namespace
      ));
    } else if (this.options.groupID) {
      ({ namespace: imageNamespace, id: imageGroupID } = tileDBUriParser(
        this.options.groupID,
        this.options.namespace
      ));
    }

    this.updateLoadingScreen('Loading image asset metadata', true);
    this.imageMetadata = await getImageMetadata({
      token: this.options.token,
      tiledbEnv: this.options.tiledbEnv,
      namespace: imageNamespace,
      arrayID: imageArrayID,
      groupID: imageGroupID
    });

    this.assetManagers.push(
      new ImageManager(this.scene, this.workerPool, {
        metadata: this.imageMetadata,
        namespace: imageNamespace
      })
    );

    await initializeCacheDB(this.imageMetadata.uris);

    // Draw image tileset
    // const explore = (tile: ImageTile) => {
    //   const mesh = CreateBox(`${tile.index}`, {
    //     width: 2 * tile.boundingInfo.boundingBox.extendSize.x,
    //     depth: 2 * tile.boundingInfo.boundingBox.extendSize.z
    //   }, this.scene);
    //   mesh.position = tile.boundingInfo.boundingBox.minimum.add(tile.boundingInfo.boundingBox.extendSize);
    //   mesh.visibility = 0;

    //   for (const child of tile.children) {
    //     explore(child);
    //   }
    // }

    // explore(this.metadata.root);

    // Everthing should be transformed to the image coordinate system if it exists
    this.sceneOptions.crs = this.imageMetadata.crs;

    // The transformation matrix is defined at base level of the image
    // The scene units are bases on the smallest level se we need to adjust the scaling coefficients
    this.sceneOptions.transformation = this.imageMetadata.pixelToCRS
      ? inv(this.imageMetadata.pixelToCRS)
      : undefined;
    this.sceneOptions.extents.encapsulateBoundingInfo(
      this.imageMetadata.root.boundingInfo
    );

    this.groupAssets = await getGroupContents({
      token: this.options.token,
      tiledbEnv: this.options.tiledbEnv,
      namespace: this.options.namespace,
      baseGroup: this.options.baseGroup
    });

    // if (this.options.defaultChannels) {
    //   const defaultAttribute = this.attributes.filter(x => x.visible)[0].name;

    //   for (const entry of this.metadata.channels.get(defaultAttribute) ?? []) {
    //     entry.visible = false;
    //   }

    //   for (const entry of this.options.defaultChannels) {
    //     const channel = this.metadata.channels
    //       .get(defaultAttribute)
    //       ?.at(entry.index);

    //     if (!channel) {
    //       continue;
    //     }

    //     channel.visible = true;
    //     channel.intensity = entry.intensity ?? channel.intensity;
    //     channel.color = entry.color
    //       ? [entry.color.r, entry.color.g, entry.color.b]
    //       : channel.color;
    //   }
    // }

    // Force enable uniform buffers for the material to work properly
    this.scene.getEngine().disableUniformBuffers = false;

    // this.pickingTool = new PickingTool(this.scene);

    // const pipeline = new GeometryPipeline(this.scene);
    // const renderTarget = pipeline.initializeRTT();

    if (this.options.geometryArrayID) {
      for (const [
        index,
        geometryArrayID
      ] of this.options.geometryArrayID.entries()) {
        this.updateLoadingScreen(
          `Loading geometry asset metadata ${index + 1} out of ${
            this.options.geometryArrayID.length
          }`,
          true
        );
        const { namespace, id } = tileDBUriParser(
          geometryArrayID,
          this.options.namespace
        );

        const metadata = await getGeometryMetadata(
          {
            namespace: namespace,
            token: this.options.token,
            tiledbEnv: this.options.tiledbEnv,
            geometryArrayID: id
          },
          undefined,
          this.sceneOptions
        );

        this.geometryMetadata.set(id, metadata);
        this.assetManagers.push(
          new GeometryManager(this.scene, this.workerPool, {
            arrayID: id,
            namespace: namespace,
            metadata: metadata,
            sceneOptions: this.sceneOptions
          })
        );

        this.sceneOptions.extents.encapsulateBoundingInfo(
          metadata.root.boundingInfo
        );

        await initializeCacheDB([id]);
      }
    }

    if (this.options.pointGroupID) {
      for (const [index, pointGroupID] of this.options.pointGroupID.entries()) {
        this.updateLoadingScreen(
          `Loading point cloud asset metadata ${index + 1} out of ${
            this.options.pointGroupID.length
          }`,
          true
        );
        const { namespace, id } = tileDBUriParser(
          pointGroupID,
          this.options.namespace
        );

        const metadata = await getPointCloudMetadata(
          {
            namespace: namespace,
            token: this.options.token,
            tiledbEnv: this.options.tiledbEnv,
            pointGroupID: id
          },
          this.options.sceneConfig?.pointConfigs?.at(index),
          this.sceneOptions
        );

        this.pointMetadata.set(id, metadata);
        this.assetManagers.push(
          new PointManager(this.scene, this.workerPool, {
            namespace: namespace,
            metadata: metadata,
            sceneOptions: this.sceneOptions
          })
        );

        await initializeCacheDB(metadata.uris);
      }
    }

    // proj4.defs("EPSG:4978","+proj=geocent +datum=WGS84 +units=m +no_defs +type=crs");
    // if (this.options.tileUris) {
    //   for (const tileURI of this.options.tileUris) {
    //     const res = await load3DTileset(tileURI, {
    //       sourceCRS: '+proj=geocent +datum=WGS84 +units=m +no_defs +type=crs',
    //       targetCRS: this.metadata.crs,
    //       transformation: this.metadata.transformationCoefficients
    //     });

    //     this.assetManagers.push(
    //       new TileManager(this.scene, this.workerPool, 0, {
    //         metadata: res,
    //         baseCRS: this.metadata.crs,
    //         transformation: this.metadata.transformationCoefficients
    //       })
    //     );
    //   }
    // }

    //Extract scene dimensions to use for camera initialization
    this.cameraManager = new CameraManager(
      this.scene,
      0.25,
      this.sceneOptions.extents
    );
    // TODO: Make it user configurable in the UI
    this.cameraManager.upperZoomLimit = 2 ** 10;

    this.scene.getEngine().onResizeObservable.add(() => {
      this.resizeViewport();
    });

    this.gui = new TileImageGUI(
      this.rootElement,
      this.groupAssets,
      () => this.clearCache(),
      (namespace: string, groupID?: string, arrayID?: string) =>
        this.onAssetSelection(namespace, groupID, arrayID)
    );

    // this.updateEngineInfo();

    // const intervalID = setInterval(() => this.updateEngineInfo(), 30 * 1000);

    this.scene.onDisposeObservable.add(() => {
      //clearInterval(intervalID);

      for (const manager of this.assetManagers) {
        manager.dispose();
      }

      this.workerPool.dispose();
      this.gui.dispose();
      this.cameraManager.dispose();
      this.pickingTool.dispose();
    });

    this.scene.onBeforeRenderObservable.addOnce(() => this.initializeGUI());
    this.scene.onBeforeRenderObservable.add(() => {
      this.fetchTiles();
    });

    this.updateLoadingScreen('', false);
  }

  // private clearScene() {
  //   this.scene.onDisposeObservable.clear();
  //   this.scene.onBeforeRenderObservable.clear();

  //   for (const manager of this.assetManagers) {
  //     manager.dispose();
  //   }

  //   this.workerPool.cleanUp();
  //   this.gui.dispose();
  //   this.cameraManager.dispose();
  //   this.pickingTool.dispose();
  //   this.scene.getEngine().clearInternalTexturesCache();
  // }

  // private updateEngineInfo() {
  //   getTileCount(this.levels.map(x => `${x.id}_${this.tileSize}`)).then(
  //     (tileCount: number) => {
  //       const selectedAttribute = this.attributes
  //         .filter(x => x.visible)[0]
  //         .type.toLowerCase();
  //       const size =
  //         (tileCount *
  //           (types as any)[selectedAttribute].bytes *
  //           this.tileSize ** 2) /
  //         2 ** 30;

  //       window.dispatchEvent(
  //         new CustomEvent(Events.ENGINE_INFO_UPDATE, {
  //           bubbles: true,
  //           detail: {
  //             type: 'CACHE_INFO',
  //             tiles: tileCount,
  //             diskSpace: size
  //           }
  //         })
  //       );
  //     }
  //   );
  // }

  private fetchTiles() {
    for (const manager of this.assetManagers) {
      manager.loadTiles(
        [
          this.cameraManager.getMainCamera(),
          this.cameraManager.getMinimapCamera()
        ],
        this.frameDetails
      );
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
    // this.scene.getEngine().stopRenderLoop();
    // this.clearScene();
    // this.options.groupID = groupID;
    // this.options.arrayID = arrayID;
    // this.options.namespace = namespace;
    // this.initializeScene().then(() =>
    //   this.scene.getEngine().runRenderLoop(() => this.scene.render())
    // );
  }

  private clearCache() {
    // clearMultiCache(this.levels.map(x => `${x.id}_${this.tileSize}`));
    // clearMultiCache(
    //   [this.options.arrayID ?? this.options.groupID ?? ''].map(
    //     x => x.split('/').at(-1)!
    //   )
    // );
    // if (this.options.pointGroupID && this.options.pointGroupID.length !== 0) {
    //   clearMultiCache(this.options.pointGroupID.map(x => x.split('/').at(-1)!));
    // }
    // if (
    //   this.options.geometryArrayID &&
    //   this.options.geometryArrayID.length !== 0
    // ) {
    //   clearMultiCache(
    //     this.options.geometryArrayID.map(x => x.split('/').at(-1)!)
    //   );
    // }
  }

  private initializeGUI() {
    const infoPanelConfig = new Map<string, InfoPanelConfigEntry>();

    // for (const [key, value] of this.geometryMetadata) {
    //   if (!value.idAttribute) {
    //     continue;
    //   }

    //   infoPanelConfig.set(key, {
    //     name: value.name,
    //     pickAttribute: value.idAttribute.name,
    //     attributes: value.attributes
    //   });
    // }

    // for (const [key, value] of this.pointMetadata) {
    //   if (!value.idAttribute) {
    //     continue;
    //   }

    //   infoPanelConfig.set(key, {
    //     name: value.name,
    //     pickAttribute: value.idAttribute.name,
    //     attributes: value.attributes
    //   });
    // }

    window.dispatchEvent(
      new CustomEvent<GUIEvent<InfoPanelInitializationEvent>>(
        Events.INITIALIZE,
        {
          bubbles: true,
          detail: {
            target: 'info-panel',
            props: {
              config: infoPanelConfig
            }
          }
        }
      )
    );

    this.initializeGUIProperties();

    for (const manager of this.assetManagers) {
      manager.initializeGUIProperties();
    }
  }

  public initializeGUIProperties() {
    this.cameraManager.initializeGUIProperties();
    const projections: { value: number; name: string }[] = [];

    if (this.imageMetadata.crs) {
      // Type definitions are incorrect/incomplete for proj4
      const projection = proj4.Proj(this.imageMetadata.crs) as any;
      projections.push({ value: 0, name: projection.name ?? projection.title });
    } else {
      projections.push({ value: 0, name: 'None' });
    }

    window.dispatchEvent(
      new CustomEvent<GUIEvent<ScenePanelInitializationEvent>>(
        Events.INITIALIZE,
        {
          bubbles: true,
          detail: {
            target: 'scene-panel',
            props: {
              baseCRS: {
                name: 'Base CRS',
                id: 'baseCRS',
                entries: projections,
                default: 0
              }
            }
          }
        }
      )
    );
  }

  private updateLoadingScreen(message: string, show: boolean): void {
    window.dispatchEvent(
      new CustomEvent<GUIEvent<{ message: string; show: boolean }>>(
        Events.ENGINE_INFO_UPDATE,
        {
          bubbles: true,
          detail: {
            target: 'LOADING_SCREEN',
            props: {
              message,
              show
            }
          }
        }
      )
    );
  }
}
