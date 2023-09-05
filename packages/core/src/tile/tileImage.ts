import { TileDBVisualization } from '../base';
import {
  Scene,
  Vector3,
  PointerInfo,
  PointerEventTypes,
  Nullable,
  FreeCamera,
  Observer,
  MeshBuilder,
  Mesh,
  Color3,
  StandardMaterial,
  PointerInput
} from '@babylonjs/core';
import {
  GeometryOperations,
  ImageResponse,
  TileDBTileImageOptions
} from './types';
import { setupCamera, resizeOrtographicCameraViewport } from './utils';
import getTileDBClient from '../utils/getTileDBClient';
import { Tileset } from './model/tileset';
import { LevelRecord, ImageMetadata, types } from './types';
import { AssetEntry, Attribute, Dimension, GeometryMetadata } from '../types';
import {
  getAssetMetadata,
  getGeometryMetadata,
  getGroupContents
} from '../utils/metadata-utils';
import TileImageGUI from './utils/gui-utils';
import { Events } from '@tiledb-inc/viz-components';
import { clearMultiCache, getTileCount } from '../utils/cache';
import { GeometrySet } from './model/geometryset';
import earcut from 'earcut';
import { PolygonShaderMaterial } from './materials/polygonShaderMaterial';
import { WorkerPool } from './worker/tiledb.worker.pool';

class TileDBTiledImageVisualization extends TileDBVisualization {
  private scene!: Scene;
  private options: TileDBTileImageOptions;
  private tileset!: Tileset;
  private geometryset!: GeometrySet;
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
  private geometryMetadata?: GeometryMetadata;
  private workerPool: WorkerPool;

  private pointerDownStartPosition: Nullable<Vector3>;
  private zoom: number;

  private cameraObservable: Nullable<Observer<PointerInfo>>;
  private pickingObservable: Nullable<Observer<PointerInfo>>;
  private selectedVertexIndex = -1;
  private currentPolygonVertices: Nullable<Vector3[]>;
  private currentPolygon: Nullable<Mesh>;
  private pendingPolygons: Map<string, { mesh: Mesh; vertices: Vector3[] }>;

  constructor(options: TileDBTileImageOptions) {
    super(options);

    this.options = options;
    this.zoom = 0.25;

    if (options.token || options.tiledbEnv) {
      getTileDBClient({
        ...(options.token ? { apiKey: options.token } : {}),
        ...(options.tiledbEnv ? { basePath: options.tiledbEnv } : {})
      });
    }

    this.pendingPolygons = new Map<
      string,
      { mesh: Mesh; vertices: Vector3[] }
    >();
    this.pointerDownStartPosition = null;
    this.cameraObservable = null;
    this.pickingObservable = null;
    this.currentPolygonVertices = null;
    this.currentPolygon = null;

    this.workerPool = new WorkerPool('worker/tiledb.worker', {
      token: options.token,
      basePath: options.tiledbEnv
    });
  }

  protected async createScene(): Promise<Scene> {
    return super.createScene().then(async scene => {
      this.scene = scene;
      await this.initializeScene();
      //scene.debugLayer.show();

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

    if (this.options.geometryID) {
      this.geometryMetadata = await getGeometryMetadata({
        token: this.options.token,
        tiledbEnv: this.options.tiledbEnv,
        namespace: this.options.namespace,
        assetID: this.options.assetID,
        baseGroup: this.options.baseGroup,
        geometryID: this.options.geometryID
      });
    }

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
      this.workerPool,
      this.scene
    );

    if (this.geometryMetadata) {
      const width =
        this.levels.at(-1)?.dimensions[this.levels[0].axes.indexOf('X')] ?? 0;
      const height =
        this.levels.at(-1)?.dimensions[this.levels[0].axes.indexOf('Y')] ?? 0;
      this.geometryset = new GeometrySet(
        width,
        height,
        this.levels.length,
        this.tileSize,
        this.options.geometryID!,
        this.geometryMetadata,
        this.metadata.crs ?? '',
        this.metadata.transformationCoefficients ?? [],
        this.options.namespace,
        this.options.token,
        '',
        this.scene
      );
    }

    this.scene.getEngine().onResizeObservable.add(() => {
      this.resizeViewport();
      //this.tileset.minimap.resize();
    });

    const geometryOperations: GeometryOperations = {
      polygonAddMode: (enable: boolean) => this.polygonAddMode(enable),
      geometryClear: (id?: string) => this.geometryClear(id)
    };

    this.gui = new TileImageGUI(
      this.scene,
      this.tileset,
      this.rootElement,
      this.metadata.channels.get(
        this.attributes.filter(x => x.visible)[0].name
      ) ?? [],
      this.dimensions,
      this.groupAssets,
      this.metadata,
      geometryOperations,
      (step: number) => this.onZoom(step),
      () => this.clearCache(),
      (namespace: string, assetID: string) =>
        this.onAssetSelection(namespace, assetID)
    );

    this.updateEngineInfo();

    const intervalID = setInterval(() => this.updateEngineInfo(), 30 * 1000);

    this.scene.onDisposeObservable.add(() => {
      clearInterval(intervalID);
      this.workerPool.cleanUp();
      this.tileset.dispose();
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

    this.tileset.dispose();
    this.gui.dispose();
    this.camera.dispose();
    this.scene.getEngine().clearInternalTexturesCache();
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
    //this.geometryset.calculateVisibleTiles(this.camera, Math.log2(this.zoom));
    this.tileset.evict();
    //this.geometryset.evict();
  }

  private resizeViewport() {
    resizeOrtographicCameraViewport(this.scene, this.zoom);
  }

  private setupCameraMovement() {
    // Add camera panning and zoom via mouse control
    this.cameraObservable = this.scene.onPointerObservable.add(
      (pointerInfo: PointerInfo) => {
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
      }
    );
  }

  private onZoom(step: number) {
    this.zoom =
      2 **
      Math.max(
        -2,
        Math.min(this.levels.length - 1, Math.log2(this.zoom) + step)
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

  private polygonAddMode(enable: boolean) {
    if (enable) {
      this.scene.onPointerObservable.remove(this.cameraObservable);
      this.pickingObservable = this.scene.onPointerObservable.add(e =>
        this.drawPolygonPointerHandler(e)
      );

      this.currentPolygon = null;
      this.currentPolygonVertices = [];
      this.selectedVertexIndex = -1;
    } else {
      this.scene.onPointerObservable.remove(this.pickingObservable);
      this.cameraObservable = this.scene.onPointerObservable.add(
        this.cameraObservable!.callback
      );

      if (this.currentPolygonVertices?.length < 3) {
        return;
      }

      const polygonID = Math.random().toString();

      this.pendingPolygons.set(polygonID, {
        mesh: this.currentPolygon,
        vertices: this.currentPolygonVertices
      });

      window.dispatchEvent(
        new CustomEvent(Events.ENGINE_INFO_UPDATE, {
          bubbles: true,
          detail: {
            type: 'RECTANGLE_ADD',
            id: polygonID
          }
        })
      );
    }
  }

  private geometryClear(id?: string) {
    if (id && this.pendingPolygons.has(id)) {
      const value = this.pendingPolygons.get(id);

      value?.mesh.dispose(false);
      this.pendingPolygons.delete(id);
    } else if (id === '-1') {
      for (const [, val] of this.pendingPolygons) {
        val.mesh.dispose(false);
      }

      this.pendingPolygons.clear();
    }

    window.dispatchEvent(
      new CustomEvent(Events.ENGINE_INFO_UPDATE, {
        bubbles: true,
        detail: {
          type: 'RECTANGLE_LIST',
          ids: JSON.stringify(Array.from(this.pendingPolygons.keys()))
        }
      })
    );
  }

  private drawPolygonPointerHandler(pointerInfo: PointerInfo) {
    switch (pointerInfo.type) {
      case PointerEventTypes.POINTERDOWN:
        // If right click finalize the current polygon if able else skip
        if (pointerInfo.event.inputIndex === PointerInput.RightClick) {
          if (this.currentPolygonVertices?.length < 3) {
            return;
          }

          const polygonID = Math.random().toString();

          this.pendingPolygons.set(polygonID, {
            mesh: this.currentPolygon,
            vertices: this.currentPolygonVertices
          });

          this.currentPolygon = null;
          this.currentPolygonVertices = [];
          this.selectedVertexIndex = -1;

          window.dispatchEvent(
            new CustomEvent(Events.ENGINE_INFO_UPDATE, {
              bubbles: true,
              detail: {
                type: 'RECTANGLE_ADD',
                id: polygonID
              }
            })
          );

          break;
        }

        if (pointerInfo.pickInfo && pointerInfo.pickInfo.pickedPoint) {
          if (!this.currentPolygonVertices) {
            this.currentPolygonVertices = [];
          }

          const [x, z] = [
            pointerInfo.pickInfo.pickedPoint!.x,
            pointerInfo.pickInfo.pickedPoint!.z
          ];
          this.pointerDownStartPosition = new Vector3(
            x * 2 ** (this.levels.length - 1),
            0,
            z * 2 ** (this.levels.length - 1)
          );

          let minDistance = Number.MAX_VALUE;

          // Check if clicked near a point of the current polygon to enter edit mode
          for (const [index, vertex] of this.currentPolygonVertices.entries()) {
            const distance =
              Vector3.Distance(vertex, this.pointerDownStartPosition) *
              this.zoom;
            if (distance < 5 && distance < minDistance) {
              //5 pixels in screen space
              this.selectedVertexIndex = index;
              minDistance = distance;
            }
          }

          if (minDistance < Number.MAX_VALUE) {
            this.currentPolygonVertices[this.selectedVertexIndex].set(
              this.pointerDownStartPosition?.x,
              0,
              this.pointerDownStartPosition?.z
            );
          } else {
            // else proceed to add new point
            this.selectedVertexIndex = this.currentPolygonVertices.length;

            this.currentPolygonVertices.push(
              this.pointerDownStartPosition?.clone()
            );
          }

          if (this.currentPolygonVertices.length > 2) {
            this.currentPolygon?.dispose();

            this.currentPolygon = MeshBuilder.CreatePolygon(
              'polygon' + Math.random(),
              {
                shape: this.currentPolygonVertices
              },
              this.scene,
              earcut
            );

            this.currentPolygon.position.addInPlaceFromFloats(0, -10, 0);
            this.currentPolygon.material = PolygonShaderMaterial(
              'polygon',
              this.scene
            );
          }
        }
        break;
      case PointerEventTypes.POINTERUP:
        this.pointerDownStartPosition = null;
        break;
      case PointerEventTypes.POINTERMOVE:
        if (
          this.pointerDownStartPosition &&
          pointerInfo.pickInfo &&
          pointerInfo.pickInfo.ray
        ) {
          const [x, z] = [
            pointerInfo.pickInfo.ray.origin.x,
            pointerInfo.pickInfo.ray.origin.z
          ];

          this.pointerDownStartPosition = new Vector3(
            x * 2 ** (this.levels.length - 1),
            0,
            z * 2 ** (this.levels.length - 1)
          );
          this.currentPolygonVertices[this.selectedVertexIndex].set(
            this.pointerDownStartPosition?.x,
            0,
            this.pointerDownStartPosition?.z
          );

          if (this.currentPolygonVertices.length > 2) {
            this.currentPolygon?.dispose();

            this.currentPolygon = MeshBuilder.CreatePolygon(
              'polygon' + Math.random(),
              {
                shape: this.currentPolygonVertices
              },
              this.scene,
              earcut
            );

            this.currentPolygon.position.addInPlaceFromFloats(0, -10, 0);
            this.currentPolygon.material = PolygonShaderMaterial(
              'polygon',
              this.scene
            );
          }
        }
        break;
    }
  }
}

export default TileDBTiledImageVisualization;
