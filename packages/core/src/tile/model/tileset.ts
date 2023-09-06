import { Channel, LevelRecord } from '../types';
import { Camera, Scene, UniformBuffer } from '@babylonjs/core';
import { Attribute, Dimension } from '../../types';
import { range } from '../utils/helpers';
import { Tile } from './tile';
import { Minimap } from './minimap';

export class Tileset {
  public tiles: Map<string, Tile>;
  public minimap!: Minimap;
  private levels: LevelRecord[];
  private dimensions: Dimension[];
  private channels: Map<string, Channel[]>;
  private attributes: Attribute[];
  private tileSize: number;
  private baseWidth: number;
  private baseHeight: number;
  private scene: Scene;
  private token: string;
  private basePath: string;
  private namespace: string;
  private tileOptions: UniformBuffer;

  private channelRanges: number[] = [];
  private channelMapping: Int32Array;
  private intensityRanges: Float32Array;
  private colors: Float32Array;
  private selectedAttribute: Attribute;

  constructor(
    levels: LevelRecord[],
    dimensions: Dimension[],
    channels: Map<string, Channel[]>,
    attributes: Attribute[],
    tileSize: number,
    namespace: string,
    token: string,
    basePath: string,
    scene: Scene
  ) {
    this.levels = levels;
    this.dimensions = dimensions;
    this.channels = channels;
    this.attributes = attributes;
    this.tileSize = tileSize;
    this.namespace = namespace;
    this.token = token;
    this.basePath = basePath;
    this.tiles = new Map<string, Tile>();
    this.scene = scene;

    this.baseWidth =
      this.levels[0].dimensions[this.levels[0].axes.indexOf('X')];
    this.baseHeight =
      this.levels[0].dimensions[this.levels[0].axes.indexOf('Y')];

    this.selectedAttribute = this.attributes.filter(item => item.visible)[0];

    this.channelRanges = [
      0,
      (this.channels.get(this.selectedAttribute.name)?.length ?? 0) - 1
    ];
    this.channelMapping = new Int32Array(
      range(0, this.channels.get(this.selectedAttribute.name)?.length ?? 0)
        .map(x => [x, 0, 0, 0])
        .flat()
    );
    this.intensityRanges = new Float32Array(
      this.channels
        .get(this.selectedAttribute.name)
        ?.map((x: Channel) => [x.min, x.intensity, 0, 0])
        .flat() ?? []
    );
    this.colors = new Float32Array(
      this.channels
        .get(this.selectedAttribute.name)
        ?.map((x: Channel) =>
          x.color.map(item => Math.min(Math.max(item / 255, 0), 1))
        )
        .flat() ?? []
    );

    this.tileOptions = new UniformBuffer(scene.getEngine());
    this.tileOptions.addUniform(
      'channelMapping',
      4,
      this.channelMapping.length / 4
    );
    this.tileOptions.addUniform('ranges', 4, this.intensityRanges.length / 4);
    this.tileOptions.addUniform('colors', 4, this.colors.length / 4);

    this.tileOptions.updateIntArray('channelMapping', this.channelMapping);
    this.tileOptions.updateFloatArray('ranges', this.intensityRanges);
    this.tileOptions.updateFloatArray('colors', this.colors);

    this.tileOptions.update();
  }

  public calculateVisibleTiles(camera: Camera, zoom: number) {
    if (!this.minimap) {
      this.minimap = new Minimap(
        [0, 0, 0],
        [0, 0, this.baseWidth, this.baseHeight],
        this.levels[0],
        this.dimensions,
        this.selectedAttribute,
        Math.max(this.baseWidth, this.baseHeight),
        this.channels.get(this.selectedAttribute.name)?.length ?? 0,
        this.tileOptions,
        this.namespace,
        this.token,
        this.basePath,
        this.scene
      );
    }

    if (!this.minimap.isLoaded && !this.minimap.isPending) {
      this.minimap.load(this.channelRanges);
    }

    for (const [, value] of this.tiles.entries()) {
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

    if (this.minimap.isLoaded) {
      this.minimap.updateVisibleArea(
        Math.min(this.baseHeight, Math.max(top, 0)),
        Math.min(this.baseWidth, Math.max(left, 0)),
        Math.min(this.baseHeight, Math.max(bottom, 0)),
        Math.min(this.baseWidth, Math.max(right, 0))
      );
    }

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
          const tile = this.tiles.get(tileIndex);

          if (tile === undefined) {
            throw new Error(
              `Unexpected tile requested. Tile index: ${tileIndex}`
            );
          }

          tile.canEvict = false;
        } else {
          const tile = new Tile(
            [x, y, integerZoom],
            [0, 0, this.baseWidth, this.baseHeight],
            this.levels[integerZoom],
            this.dimensions,
            this.selectedAttribute,
            this.tileSize,
            this.channels.get(this.selectedAttribute.name)?.length ?? 0,
            this.tileOptions,
            this.namespace,
            this.token,
            this.basePath,
            this.scene
          );

          tile.load(this.channelRanges);
          this.tiles.set(tileIndex, tile);
        }
      }
    }

    for (const [, value] of this.tiles.entries()) {
      if (!value.canEvict && !value.isLoaded) {
        let parent = getParent(value.index);
        while (parent !== undefined) {
          const tile = this.tiles.get(`${parent[0]}_${parent[1]}_${parent[2]}`);
          if (tile?.isLoaded) {
            tile.canEvict = false;
            break;
          }

          parent = getParent(parent);
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

  public updateChannelIntensity(index: number, value: number) {
    this.intensityRanges[4 * index + 1] = value;

    this.tileOptions.updateFloatArray(
      'ranges',
      new Float32Array(this.intensityRanges)
    );
    this.tileOptions.update();
  }

  public updateChannelColor(
    index: number,
    color: { r: number; g: number; b: number }
  ) {
    this.colors[4 * index] = color.r / 255;
    this.colors[4 * index + 1] = color.g / 255;
    this.colors[4 * index + 2] = color.b / 255;

    this.tileOptions.updateFloatArray('colors', new Float32Array(this.colors));
    this.tileOptions.update();
  }

  public updateChannelVisibility(index: number, visible: boolean) {
    this.channelMapping[4 * index] = visible ? index : -1;
    this.calculateChannelMapping();
    this.calculateChannelRanges();

    this.tileOptions = new UniformBuffer(this.scene.getEngine());
    this.tileOptions.addUniform(
      'channelMapping',
      4,
      this.channelMapping.length / 4
    );
    this.tileOptions.addUniform('ranges', 4, this.intensityRanges.length / 4);
    this.tileOptions.addUniform('colors', 4, this.colors.length / 4);

    this.tileOptions.updateIntArray('channelMapping', this.channelMapping);
    this.tileOptions.updateFloatArray('ranges', this.intensityRanges);
    this.tileOptions.updateFloatArray('colors', this.colors);

    this.tileOptions.update();

    for (const tile of this.tiles.values()) {
      tile.updateTileOptionsAndData(
        this.channelRanges,
        this.dimensions,
        this.tileOptions
      );
    }
    this.minimap.updateTileOptionsAndData(
      this.channelRanges,
      this.dimensions,
      this.tileOptions
    );
  }

  public updateExtraDimensions(index: number, value: number) {
    this.dimensions[index].value = value;

    for (const tile of this.tiles.values()) {
      tile.updateTileOptionsAndData(
        this.channelRanges,
        this.dimensions,
        this.tileOptions
      );
    }
    this.minimap.updateTileOptionsAndData(
      this.channelRanges,
      this.dimensions,
      this.tileOptions
    );
  }

  public toggleMinimap(visible: boolean) {
    if (this.minimap.mesh === null) {
      console.warn('Minimap is not initialized');
      return;
    }

    this.minimap.mesh.isVisible = visible;
  }

  private calculateChannelRanges() {
    let range: number[] = [];
    this.channelRanges = [];
    for (let index = 0; index < this.channelMapping.length / 4; ++index) {
      if (this.channelMapping[4 * index] === -1) {
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

  private calculateChannelMapping() {
    let visibleCounter = 0;
    for (let index = 0; index < this.channelMapping.length / 4; ++index) {
      if (this.channelMapping[4 * index] === -1) {
        continue;
      }

      this.channelMapping[4 * index] = visibleCounter++;
    }
  }

  public dispose() {
    for (const tile of this.tiles.values()) {
      tile.dispose();
    }

    this.minimap.dispose();
  }
}

function getParent(index: number[]): number[] | undefined {
  if (index[2] === 0) {
    return undefined;
  }

  return [index[0] >> 1, index[1] >> 1, index[2] - 1];
}
