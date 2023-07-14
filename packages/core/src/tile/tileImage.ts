import { TileDBVisualization } from '../base';
import {
  Scene,
  Vector3,
  PointerInfo,
  KeyboardEventTypes,
  PointerEventTypes
} from '@babylonjs/core';
import {
  Attribute,
  Dimension,
  LevelRecord,
  Metadata,
  TileDBTileImageOptions
} from './types';
import { setupCamera, resizeOrtographicCameraViewport } from './utils';
import ImageModel from './model/image-model';
import getTileDBClient from '../utils/getTileDBClient';
import { getAssetMetadata } from './utils/metadata-utils';
import { Tileset } from './model/tileset';

class TileDBTiledImageVisualization extends TileDBVisualization {
  private scene: Scene;
  private model: ImageModel;
  private options: TileDBTileImageOptions;
  private tileset: Tileset;

  private pointerDownStartPosition: Vector3;
  private zoom: number;

  private levels: LevelRecord[];
  private metadata: Metadata;
  private attributes: Attribute[];
  private extraDimensions: Dimension[];

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

  attachKeys() {
    this.scene.onKeyboardObservable.add(kbInfo => {
      switch (kbInfo.type) {
        case KeyboardEventTypes.KEYDOWN:
          switch (kbInfo.event.key) {
            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
              this.model.calculateBlocks();
              break;
          }
          break;
      }
    });
  }

  protected async createScene(): Promise<Scene> {
    return super.createScene().then(async scene => {
      this.scene = scene;
      this.model = new ImageModel(scene, this.options);

      setupCamera(this.scene, this.zoom);
      this.setupCameraMovement();

      [this.metadata, this.attributes, this.extraDimensions, this.levels] =
        await getAssetMetadata(this.options);
      this.tileset = new Tileset(this.levels, 1024, scene);

      this.engine.onResizeObservable.add(() => {
        this.resizeViewport();
      });

      this.scene.onBeforeRenderObservable.add(() => {
        this.fetchTiles();
      });

      return scene;
    });
  }

  private fetchTiles() {
    this.tileset.calculateVisibleTiles(
      this.scene.activeCamera,
      Math.log2(this.zoom)
    );
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
            this.scene.activeCamera.position.addInPlace(
              positionDifference.multiplyByFloats(-1, 0, 1)
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
                Math.log2(this.zoom) + pointerInfo.event.deltaY / 1500
              )
            );
          resizeOrtographicCameraViewport(this.scene, this.zoom);
          break;
      }
    });
  }
}

export default TileDBTiledImageVisualization;
