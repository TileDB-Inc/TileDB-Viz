import { LevelRecord, types } from '../types';
import {
  Mesh,
  VertexData,
  Camera,
  Scene,
  RawTexture2DArray,
  UniformBuffer,
  Nullable,
  Vector2
} from '@babylonjs/core';
import { BioimageShaderMaterial } from '../materials/bioimageShaderMaterial';
import { Attribute, Dimension } from '../../types';
import { BioimageMinimapShaderMaterial } from '../materials/bioimageMinimapMaterial';

export class Tileset {
  public tiles: Map<string, Tile>;
  public minimap: Minimap;
  private levels: LevelRecord[];
  private dimensions: Dimension[];
  private attribute: Attribute;
  private tileSize: number;
  private baseWidth: number;
  private baseHeight: number;
  private scene: Scene;
  private token: string;
  private basePath: string;
  private namespace: string;
  private tileOptions: UniformBuffer;

  private channelMapping: number[] = [];
  private channelRanges: number[] = [];

  constructor(
    levels: LevelRecord[],
    dimensions: Dimension[],
    attribute: Attribute,
    tileSize: number,
    namespace: string,
    token: string,
    basePath: string,
    scene: Scene
  ) {
    this.levels = levels;
    this.dimensions = dimensions;
    this.attribute = attribute;
    this.tileSize = tileSize;
    this.namespace = namespace;
    this.token = token;
    this.basePath = basePath;
    this.tiles = new Map<string, Tile>();
    this.scene = scene;
    this.tileOptions = new UniformBuffer(scene.getEngine());

    this.baseWidth =
      this.levels[0].dimensions[this.levels[0].axes.indexOf('X')];
    this.baseHeight =
      this.levels[0].dimensions[this.levels[0].axes.indexOf('Y')];
  }

  public calculateVisibleTiles(camera: Camera, zoom: number) {
    if (!this.minimap) {
      this.minimap = new Minimap(
        [0, 0, 0],
        [0, 0, this.baseWidth, this.baseHeight],
        this.levels[0],
        this.dimensions,
        this.attribute,
        Math.max(this.baseWidth, this.baseHeight),
        this.tileOptions,
        this.namespace,
        this.token,
        this.basePath,
        this.scene
      );
    }

    if (!this.minimap.isLoaded && !this.minimap.isPending) {
      this.minimap.load(this.channelRanges, this.channelMapping);
    }

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
            [0, 0, this.baseWidth, this.baseHeight],
            this.levels[integerZoom],
            this.dimensions,
            this.attribute,
            this.tileSize,
            this.tileOptions,
            this.namespace,
            this.token,
            this.basePath,
            this.scene
          );

          tile.load(this.channelRanges, this.channelMapping);
          this.tiles.set(tileIndex, tile);
        }
      }
    }

    for (const [_, value] of this.tiles.entries()) {
      if (value.canEvict) {
        for (const child of getChildren(value.index)) {
          const childIndex = `${child[0]}_${child[1]}_${child[2]}`;

          if (
            this.tiles.has(childIndex) &&
            !this.tiles.get(childIndex)?.isLoaded
          ) {
            value.canEvict = false;
            break;
          }
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

  public updateTileOptions(
    channelMapping: number[],
    intensityRanges: number[],
    colors: number[]
  ) {
    const needDataUpdate =
      this.channelMapping.toString() != channelMapping.toString();

    if (needDataUpdate) {
      this.channelMapping = [...channelMapping];
      this.generateChannelMapping();

      this.tileOptions = new UniformBuffer(
        this.scene.getEngine(),
        undefined,
        true
      );

      // Pad everything to 16 bytes (thanks std140)

      this.tileOptions.addUniform('channelMapping', 4, channelMapping.length);
      this.tileOptions.addUniform('ranges', 4, channelMapping.length);
      this.tileOptions.addUniform('colors', 4, channelMapping.length);

      this.tileOptions.updateIntArray(
        'channelMapping',
        new Int32Array(channelMapping.map(x => [x, 0, 0, 0]).flat())
      );
      this.tileOptions.updateFloatArray(
        'ranges',
        new Float32Array(intensityRanges)
      );
      this.tileOptions.updateFloatArray('colors', new Float32Array(colors));

      this.tileOptions.update();

      for (const tile of this.tiles.values()) {
        tile.updateTileOptionsAndData(
          this.channelRanges,
          this.channelMapping,
          this.tileOptions
        );
        this.minimap.updateTileOptionsAndData(
          this.channelRanges,
          this.channelMapping,
          this.tileOptions
        );
      }
    } else {
      this.tileOptions.updateFloatArray(
        'ranges',
        new Float32Array(intensityRanges)
      );
      this.tileOptions.updateFloatArray('colors', new Float32Array(colors));
      this.tileOptions.update();
    }
  }

  private generateChannelMapping() {
    let range: number[] = [];
    this.channelRanges = [];
    for (let index = 0; index < this.channelMapping.length; ++index) {
      if (this.channelMapping[index] == -1) {
        continue;
      }

      if (range.length === 0) {
        range.push(index);
      } else {
        if (index - (range.at(-1) as number) !== 1) {
          this.channelRanges.push(range[0], range.at(-1) as number);
          range = [index];
        } else {
          range.push(index);
        }
      }
    }
    this.channelRanges.push(range[0], range.at(-1) as number);
  }
}

export class Tile {
  public isLoaded: boolean;
  public isPending: boolean;
  public canEvict: boolean;
  public index: number[];
  public mesh: Nullable<Mesh>;

  private scene: Scene;
  private vertexData: VertexData;
  private tileOptions: UniformBuffer;
  private worker: Worker;

  private namespace: string;
  private token: string;
  private basePath: string;
  private tileSize: number;
  private level: LevelRecord;
  private attribute: Attribute;
  private dimensions: Dimension[];

  constructor(
    index: number[],
    bounds: number[],
    level: LevelRecord,
    dimensions: Dimension[],
    attribute: Attribute,
    tileSize: number,
    tileOptions: UniformBuffer,
    namespace: string,
    token: string,
    basePath: string,
    scene: Scene
  ) {
    this.mesh = null;
    this.scene = scene;
    this.index = index;
    this.level = level;
    this.dimensions = dimensions;
    this.attribute = attribute;
    this.namespace = namespace;
    this.token = token;
    this.basePath = basePath;
    this.canEvict = false;
    this.isLoaded = false;
    this.isPending = false;
    this.tileOptions = tileOptions;
    this.tileSize = tileSize;

    const left = Math.max(bounds[0], (index[0] * tileSize) / 2 ** index[2]);
    const right = Math.min(
      bounds[2],
      ((index[0] + 1) * tileSize) / 2 ** index[2]
    );
    const bottom = Math.max(bounds[1], (index[1] * tileSize) / 2 ** index[2]);
    const top = Math.min(
      bounds[3],
      ((index[1] + 1) * tileSize) / 2 ** index[2]
    );

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
    this.vertexData.indices = [0, 3, 1, 1, 3, 2];
  }

  public updateTileOptionsAndData(
    channelRanges: number[],
    channelMapping: number[],
    tileOptions: UniformBuffer
  ) {
    if (!this.isLoaded) {
      this.worker.terminate();
    }

    this.tileOptions = tileOptions;
    this.load(channelRanges, channelMapping);
  }

  public load(channelRanges: number[], channelMapping: number[]) {
    const data = {
      index: this.index,
      tileSize: this.tileSize,
      levelRecord: this.level,
      namespace: this.namespace,
      attribute: this.attribute,
      channelRanges: channelRanges,
      channelMapping: channelMapping,
      dimensions: this.dimensions,
      token: this.token,
      basePath: this.basePath
    };

    this.worker = new Worker(
      new URL('../worker/tiledb.tile.worker', import.meta.url),
      {
        type: 'module'
      }
    );

    this.worker.onmessage = (event: any) => {
      this.worker.terminate();
      this.isLoaded = true;
      this.isPending = false;
      const [data, width, height, channels] = Object.values(event.data);
      const dtype = this.attribute.type.toLowerCase();

      const intensityTexture = new RawTexture2DArray(
        data,
        width,
        height,
        channels,
        (types as any)[dtype].format,
        this.scene,
        false,
        false,
        (types as any)[dtype].filtering,
        (types as any)[dtype].type
      );

      intensityTexture.wrapU = RawTexture2DArray.CLAMP_ADDRESSMODE;
      intensityTexture.wrapV = RawTexture2DArray.CLAMP_ADDRESSMODE;

      if (this.mesh) {
        this.mesh.dispose(false, true);
      }

      this.mesh = new Mesh(this.index.toString(), this.scene);

      this.vertexData.applyToMesh(this.mesh);
      const material = BioimageShaderMaterial(
        this.index.toString(),
        this.scene,
        (types as any)[dtype].samplerType,
        channels
      );

      material.setTexture('texture_arr', intensityTexture);
      material.setUniformBuffer('tileOptions', this.tileOptions);

      this.mesh.material = material;
      this.mesh.material.freeze();
    };

    this.isLoaded = false;
    this.isPending = true;

    this.worker.postMessage(data);
  }

  public dispose() {
    if (!this.isLoaded) {
      this.worker.terminate();
    }

    this.mesh?.dispose(false, true);
  }
}

export class Minimap {
  public isLoaded: boolean;
  public isPending: boolean;
  public mesh: Nullable<Mesh>;

  private bounds: number[];
  private scene: Scene;
  private vertexData: VertexData;
  private tileOptions: UniformBuffer;
  private worker: Worker;

  private namespace: string;
  private token: string;
  private basePath: string;
  private tileSize: number;
  private level: LevelRecord;
  private attribute: Attribute;
  private dimensions: Dimension[];

  constructor(
    index: number[],
    bounds: number[],
    level: LevelRecord,
    dimensions: Dimension[],
    attribute: Attribute,
    tileSize: number,
    tileOptions: UniformBuffer,
    namespace: string,
    token: string,
    basePath: string,
    scene: Scene
  ) {
    this.bounds = bounds;
    this.mesh = null;
    this.scene = scene;
    this.level = level;
    this.dimensions = dimensions;
    this.attribute = attribute;
    this.namespace = namespace;
    this.token = token;
    this.basePath = basePath;
    this.tileOptions = tileOptions;
    this.tileSize = tileSize;
    this.isLoaded = false;
    this.isPending = false;

    this.vertexData = new VertexData();
    this.vertexData.positions = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0];
    this.vertexData.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    this.vertexData.indices = [0, 1, 3, 1, 2, 3];
  }

  public updateTileOptionsAndData(
    channelRanges: number[],
    channelMapping: number[],
    tileOptions: UniformBuffer
  ) {
    if (!this.isLoaded) {
      this.worker.terminate();
    }

    this.tileOptions = tileOptions;
    this.load(channelRanges, channelMapping);
  }

  public load(channelRanges: number[], channelMapping: number[]) {
    const data = {
      index: [0, 0, 0],
      tileSize: this.tileSize,
      levelRecord: this.level,
      namespace: this.namespace,
      attribute: this.attribute,
      channelRanges: channelRanges,
      channelMapping: channelMapping,
      dimensions: this.dimensions,
      token: this.token,
      basePath: this.basePath
    };

    this.worker = new Worker(
      new URL('../worker/tiledb.tile.worker', import.meta.url),
      {
        type: 'module'
      }
    );

    this.worker.onmessage = (event: any) => {
      this.worker.terminate();
      this.isLoaded = true;
      this.isPending = false;
      const [data, width, height, channels] = Object.values(event.data);
      const dtype = this.attribute.type.toLowerCase();

      const intensityTexture = new RawTexture2DArray(
        data,
        width,
        height,
        channels,
        (types as any)[dtype].format,
        this.scene,
        false,
        false,
        (types as any)[dtype].filtering,
        (types as any)[dtype].type
      );

      intensityTexture.wrapU = RawTexture2DArray.CLAMP_ADDRESSMODE;
      intensityTexture.wrapV = RawTexture2DArray.CLAMP_ADDRESSMODE;

      if (this.mesh) {
        this.mesh.dispose(false, true);
      }

      this.mesh = new Mesh('minimap', this.scene);
      this.mesh.alwaysSelectAsActiveMesh = true;

      this.vertexData.applyToMesh(this.mesh);
      const material = BioimageMinimapShaderMaterial(
        'minimap',
        this.scene,
        (types as any)[dtype].samplerType,
        channels
      );

      const aspectRatio = Math.min(200 / this.bounds[2], 200 / this.bounds[3]);

      material.setVector2(
        'screenSize',
        new Vector2(
          this.scene.getEngine().getRenderWidth(),
          this.scene.getEngine().getRenderHeight()
        )
      );
      material.setVector2(
        'minimapSize',
        new Vector2(aspectRatio * this.bounds[2], aspectRatio * this.bounds[3])
      );
      material.setVector2('margins', new Vector2(20, 20));
      material.setTexture('texture_arr', intensityTexture);
      material.setUniformBuffer('tileOptions', this.tileOptions);

      this.mesh.material = material;
      this.mesh.material.freeze();
    };

    this.isLoaded = false;
    this.isPending = true;

    this.worker.postMessage(data);
  }

  public dispose() {
    if (!this.isLoaded) {
      this.worker.terminate();
    }

    this.mesh?.dispose(false, true);
  }
}

function getChildren(index: number[]): number[][] {
  return [
    [2 * index[0], 2 * index[1], index[2] + 1],
    [2 * index[0] + 1, 2 * index[1], index[2] + 1],
    [2 * index[0], 2 * index[1] + 1, index[2] + 1],
    [2 * index[0] + 1, 2 * index[1] + 1, index[2] + 1]
  ];
}
