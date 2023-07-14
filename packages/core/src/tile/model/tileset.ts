import { LevelRecord, TypedArray } from '../types';
import { Mesh, VertexData, Camera, Scene } from '@babylonjs/core';
import { BioimageShaderMaterial } from '../materials/bioimageShaderMaterial';

export class Tileset {
  public tiles: Map<string, Tile>;
  private levels: LevelRecord[];
  private tileSize: number;
  private baseWidth: number;
  private baseHeight: number;
  private scene: Scene;

  constructor(levels: LevelRecord[], tileSize: number, scene: Scene) {
    this.levels = levels;
    this.tileSize = tileSize;
    this.tiles = new Map<string, Tile>();
    this.scene = scene;

    this.baseWidth =
      this.levels[0].dimensions[this.levels[0].axes.indexOf('X')];
    this.baseHeight =
      this.levels[0].dimensions[this.levels[0].axes.indexOf('Y')];
  }

  public calculateVisibleTiles(camera: Camera, zoom: number) {
    for (const [_, value] of this.tiles.entries()) {
      value.canEvict = true;
    }

    const integerZoom = Math.max(
      0,
      Math.min(this.levels.length - 1, Math.ceil(zoom))
    );

    const maxTileX =
      Math.ceil(this.baseWidth / (this.tileSize / 2 ** integerZoom)) - 1;
    const maxTileY =
      Math.ceil(this.baseHeight / (this.tileSize / 2 ** integerZoom)) - 1;

    const top = camera.position.z + camera.orthoTop ?? 0;
    const bottom = camera.position.z + camera.orthoBottom ?? 0;
    const left = camera.position.x + camera.orthoLeft ?? 0;
    const right = camera.position.x + camera.orthoRight ?? 0;

    if (
      top < 0 ||
      bottom > this.baseHeight ||
      right < 0 ||
      left > this.baseWidth
    ) {
      console.log('NOPE');
      return;
    }

    const maxYIndex = Math.max(
      0,
      Math.min(maxTileY, Math.floor(top / (this.tileSize / 2 ** integerZoom)))
    );
    const minYIndex = Math.max(
      0,
      Math.min(
        maxTileY,
        Math.floor(bottom / (this.tileSize / 2 ** integerZoom))
      )
    );
    const maxXIndex = Math.max(
      0,
      Math.min(maxTileX, Math.floor(right / (this.tileSize / 2 ** integerZoom)))
    );
    const minXIndex = Math.max(
      0,
      Math.min(maxTileX, Math.floor(left / (this.tileSize / 2 ** integerZoom)))
    );

    for (let x = minXIndex; x <= maxXIndex; ++x) {
      for (let y = minYIndex; y <= maxYIndex; ++y) {
        const tileIndex = `${x}_${y}_${integerZoom}`;

        if (this.tiles.has(tileIndex)) {
          const tile = this.tiles.get(tileIndex)!;

          tile.canEvict = false;
        } else {
          const tile = new Tile(
            [x, y, integerZoom],
            this.baseWidth,
            this.baseHeight,
            this.tileSize,
            this.scene
          );

          tile.load(null, 0, 0, 0, '');

          this.tiles.set(tileIndex, tile);
        }
      }
    }
  }

  public evict() {
    for (const key of this.tiles.keys()) {
      const tile = this.tiles.get(key);
      if (tile?.canEvict) {
        if (tile.isLoaded) {
          tile.mesh.dispose();
        }
        this.tiles.delete(key);
      }
    }
  }
}

export class Tile {
  public isLoaded: boolean;
  public canEvict: boolean;
  public index: number[];
  public mesh: Mesh;

  private scene: Scene;
  private vertexData: VertexData;

  constructor(
    index: number[],
    width: number,
    height: number,
    tileSize: number,
    scene: Scene
  ) {
    this.index = index;
    this.canEvict = false;
    this.isLoaded = false;

    this.scene = scene;
    const left = (index[0] * tileSize) / 2 ** index[2];
    const right = Math.min(width, ((index[0] + 1) * tileSize) / 2 ** index[2]);
    const bottom = (index[1] * tileSize) / 2 ** index[2];
    const top = Math.min(height, ((index[1] + 1) * tileSize) / 2 ** index[2]);

    this.vertexData = new VertexData();
    this.vertexData.positions = [
      left,
      0,
      bottom,
      right,
      0,
      bottom,
      right,
      0,
      top,
      left,
      0,
      top
    ];
    this.vertexData.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    this.vertexData.indices = [0, 1, 3, 1, 2, 3];
  }

  public load(
    data: TypedArray,
    width: number,
    height: number,
    channels: number,
    dtype: string
  ) {
    this.isLoaded = true;

    // const texture_arr = new RawTexture2DArray(
    //   data,
    //   width,
    //   height,
    //   channels,
    //   types[dtype].format,
    //   this.scene,
    //   false,
    //   false,
    //   types[dtype].filtering,
    //   types[dtype].type
    // );

    this.mesh = new Mesh(this.index.toString(), this.scene);
    this.vertexData.applyToMesh(this.mesh);
    this.mesh.material = BioimageShaderMaterial(
      this.scene,
      '', //types[dtype].samplerType,
      channels
    );
    //this.mesh.material.setTexture("texture_arr", texture_arr);
  }
}
