import { Geometry } from './geometry';
import { Scene, Camera } from '@babylonjs/core';
import { GeometryMetadata } from '../../types';

export class GeometrySet {
  public tiles: Map<string, Geometry>;

  private tileSize: number;
  private baseWidth: number;
  private baseHeight: number;
  private maxZoom: number;
  private imageCRS: string;
  private geometryMetadata: GeometryMetadata;
  private geotransformCoefficients: number[];

  private scene: Scene;
  private geometryID: string;
  private token: string;
  private basePath: string;
  private namespace: string;

  public constructor(
    baseWidth: number,
    baseHeight: number,
    maxZoom: number,
    tileSize: number,
    geometryID: string,
    geometryMetadata: GeometryMetadata,
    imageCRS: string,
    geotransformCoefficients: number[],
    namespace: string,
    token: string,
    basePath: string,
    scene: Scene
  ) {
    this.baseWidth = baseWidth;
    this.baseHeight = baseHeight;
    this.maxZoom = maxZoom;
    this.geometryID = geometryID;
    this.tileSize = tileSize;
    this.imageCRS = imageCRS;
    this.geometryMetadata = geometryMetadata;
    this.geotransformCoefficients = geotransformCoefficients;
    this.namespace = namespace;
    this.token = token;
    this.basePath = basePath;
    this.tiles = new Map<string, Geometry>();
    this.scene = scene;
  }

  public calculateVisibleTiles(camera: Camera, zoom: number) {
    for (const [, value] of this.tiles.entries()) {
      value.canEvict = true;
    }

    const integerZoom = Math.max(
      0,
      Math.min(this.maxZoom - 1, Math.ceil(zoom))
    );

    const maxTileX =
      Math.ceil(this.baseWidth / (this.tileSize / 2 ** this.maxZoom)) - 1;
    const maxTileY =
      Math.ceil(this.baseHeight / (this.tileSize / 2 ** this.maxZoom)) - 1;

    const top = camera.position.z + (camera?.orthoTop ?? 0);
    const bottom = camera.position.z + (camera?.orthoBottom ?? 0);
    const left = camera.position.x + (camera?.orthoLeft ?? 0);
    const right = camera.position.x + (camera?.orthoRight ?? 0);

    if (
      top < 0 ||
      bottom > this.baseHeight ||
      right < 0 ||
      left > this.baseWidth
    ) {
      return;
    }

    // Load and render one extra tile around the visible region
    // This can still result to geometry not being rendered if pad is larger than the tile extend
    const maxYIndex = Math.max(
      0,
      Math.min(
        maxTileY,
        Math.floor(top / (this.tileSize / 2 ** integerZoom)) + 1
      )
    );
    const minYIndex = Math.max(
      0,
      Math.min(
        maxTileY,
        Math.floor(bottom / (this.tileSize / 2 ** integerZoom))
      ) - 1
    );
    const maxXIndex = Math.max(
      0,
      Math.min(
        maxTileX,
        Math.floor(right / (this.tileSize / 2 ** integerZoom)) + 1
      )
    );
    const minXIndex = Math.max(
      0,
      Math.min(
        maxTileX,
        Math.floor(left / (this.tileSize / 2 ** integerZoom))
      ) - 1
    );

    for (let x = minXIndex; x <= maxXIndex; ++x) {
      for (let y = minYIndex; y <= maxYIndex; ++y) {
        const tileIndex = `${x}_${y}`;

        if (this.tiles.has(tileIndex)) {
          const tile = this.tiles.get(tileIndex);

          if (tile === undefined) {
            throw new Error(
              `Unexpected tile requested. Tile index: ${tileIndex}`
            );
          }

          tile.canEvict = false;
        } else {
          const tile = new Geometry(
            [x, y],
            this.geometryID,
            this.tileSize,
            this.geometryMetadata,
            this.imageCRS,
            this.geotransformCoefficients,
            this.namespace,
            this.token,
            this.basePath,
            this.scene
          );

          tile.load();
          this.tiles.set(tileIndex, tile);
        }
      }
    }
  }

  public evict() {
    for (const key of this.tiles.keys()) {
      const tile = this.tiles.get(key);
      if (tile?.canEvict) {
        tile.dispose();

        this.tiles.delete(key);
      }
    }
  }

  public dispose() {
    for (const tile of this.tiles.values()) {
      tile.dispose();
    }
  }
}
