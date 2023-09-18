import { Scene, Camera, UniformBuffer } from '@babylonjs/core';
import { Attribute, Dimension } from '../../../types';
import {
  Channel,
  DataRequest,
  ImageMessage,
  ImageMetadata,
  ImageResponse,
  LevelRecord,
  RequestType
} from '../../types';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { Manager, UpdateOperation, TileStatus, TileState } from '../manager';
import { ImageTile } from './image';
import { range } from '../../utils/helpers';
import { calculateChannelRanges, calculateChannelMapping } from './imageUtils';

interface ImageOptions {
  metadata: ImageMetadata;
  namespace: string;
  levels: LevelRecord[];
  dimensions: Dimension[];
  attributes: Attribute[];
}

export class ImageManager extends Manager<ImageTile> {
  private channelRanges: number[] = [];
  private channelMapping: Int32Array;
  private intensityRanges: Float32Array;
  private colors: Float32Array;
  private tileOptions: UniformBuffer;
  private levels: LevelRecord[];
  private dimensions: Dimension[];
  private attributes: Attribute[];
  private metadata: ImageMetadata;
  private namespace: string;

  private selectedAttribute!: Attribute;
  private hasMinimap: boolean;

  public static readonly ColorUpdate = class
    implements UpdateOperation<ImageManager>
  {
    public index: number;
    public color: { r: number; g: number; b: number };

    constructor(index: number, color: { r: number; g: number; b: number }) {
      this.index = index;
      this.color = color;
    }

    public apply(source: ImageManager): void {
      source.colors[4 * this.index] = this.color.r / 255;
      source.colors[4 * this.index + 1] = this.color.g / 255;
      source.colors[4 * this.index + 2] = this.color.b / 255;

      source.tileOptions.updateFloatArray(
        'colors',
        new Float32Array(source.colors)
      );
      source.tileOptions.update();
    }
  };

  public static readonly IntensityUpdate = class
    implements UpdateOperation<ImageManager>
  {
    public index: number;
    public intensity: number;

    constructor(index: number, intensity: number) {
      this.index = index;
      this.intensity = intensity;
    }

    apply(source: ImageManager): void {
      source.intensityRanges[4 * this.index + 1] = this.intensity;

      source.tileOptions.updateFloatArray(
        'ranges',
        new Float32Array(source.intensityRanges)
      );
      source.tileOptions.update();
    }
  };

  public static readonly ChannelUpdate = class
    implements UpdateOperation<ImageManager>
  {
    public index: number;
    public visible: boolean;

    constructor(index: number, visible: boolean) {
      this.index = index;
      this.visible = visible;
    }

    apply(source: ImageManager): void {
      source.channelMapping[4 * this.index] = this.visible ? this.index : -1;
      calculateChannelMapping(source.channelMapping);
      source.channelRanges = calculateChannelRanges(source.channelMapping);

      source.tileOptions = new UniformBuffer(source.scene.getEngine());
      source.tileOptions.addUniform(
        'channelMapping',
        4,
        source.channelMapping.length / 4
      );
      source.tileOptions.addUniform(
        'ranges',
        4,
        source.intensityRanges.length / 4
      );
      source.tileOptions.addUniform('colors', 4, source.colors.length / 4);

      source.tileOptions.updateIntArray(
        'channelMapping',
        source.channelMapping
      );
      source.tileOptions.updateFloatArray('ranges', source.intensityRanges);
      source.tileOptions.updateFloatArray('colors', source.colors);

      source.tileOptions.update();

      source.update();
    }
  };

  public static readonly DimensionUpdate = class
    implements UpdateOperation<ImageManager>
  {
    public index: number;
    public value: number;

    constructor(index: number, value: number) {
      this.index = index;
      this.value = value;
    }
    apply(source: ImageManager): void {
      source.dimensions[this.index].value = this.value;

      source.update();
    }
  };

  constructor(
    scene: Scene,
    workerPool: WorkerPool,
    tileSize: number,
    imageOptions: ImageOptions
  ) {
    const xIndex = imageOptions.levels[0].axes.indexOf('X');
    const yIndex = imageOptions.levels[0].axes.indexOf('Y');

    const baseWidth = imageOptions.levels[0].dimensions[xIndex];
    const baseHeight = imageOptions.levels[0].dimensions[yIndex];

    super(scene, workerPool, tileSize, baseWidth, baseHeight);

    this.workerPool.callbacks.image.push(this.onImageTileDataLoad.bind(this));

    this.levels = imageOptions.levels;
    this.dimensions = imageOptions.dimensions;
    this.attributes = imageOptions.attributes;
    this.metadata = imageOptions.metadata;
    this.namespace = imageOptions.namespace;

    this.selectedAttribute = this.attributes.filter(item => item.visible)[0];
    this.channelRanges = [
      0,
      (this.metadata.channels.get(this.selectedAttribute.name)?.length ?? 0) - 1
    ];
    this.channelMapping = new Int32Array(
      range(
        0,
        this.metadata.channels.get(this.selectedAttribute.name)?.length ?? 0
      )
        .map(x => [x, 0, 0, 0])
        .flat()
    );
    this.intensityRanges = new Float32Array(
      this.metadata.channels
        .get(this.selectedAttribute.name)
        ?.map((x: Channel) => [x.min, x.intensity, 0, 0])
        .flat() ?? []
    );
    this.colors = new Float32Array(
      this.metadata.channels
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

    this.hasMinimap =
      (this.scene.activeCameras?.filter(x => x.name === 'Minimap').length ??
        0) > 0;
  }

  public loadTiles(camera: Camera, zoom: number): void {
    for (const [key, value] of this.tileStatus) {
      value.evict = this.hasMinimap ? !key.endsWith('0') : true;
    }

    const [minXIndex, maxXIndex, minYIndex, maxYIndex] = this.getTileIndexRange(
      camera,
      zoom
    );

    for (let x = minXIndex; x <= maxXIndex; ++x) {
      for (let y = minYIndex; y <= maxYIndex; ++y) {
        const tileIndex = `image_${x}_${y}_${zoom}`;
        const status =
          this.tileStatus.get(tileIndex) ??
          ({ evict: false, type: 'IMAGE' } as TileStatus<ImageTile>);

        status.evict = false;

        if (status.state === TileState.LOADING) {
          let parent = getParent([x, y, zoom]);

          while (parent !== undefined) {
            const parentIndex = `image_${parent[0]}_${parent[1]}_${parent[2]}`;
            const parentState = this.tileStatus.get(parentIndex);
            if (parentState?.state === TileState.VISIBLE) {
              parentState.evict = false;
              break;
            }

            parent = getParent(parent);
          }
        } else if (status.state === undefined) {
          this.workerPool.postMessage({
            type: RequestType.IMAGE,
            id: tileIndex,
            request: {
              index: [x, y, zoom],
              tileSize: this.tileSize,
              levelRecord: this.levels[zoom],
              namespace: this.namespace,
              attribute: this.selectedAttribute,
              channelRanges: this.channelRanges,
              dimensions: this.dimensions
            } as ImageMessage
          } as DataRequest);

          status.state = TileState.LOADING;
          this.tileStatus.set(tileIndex, status);

          this.updateLoadingStatus(false);

          let parent = getParent([x, y, zoom]);
          while (parent !== undefined) {
            const parentIndex = `image_${parent[0]}_${parent[1]}_${parent[2]}`;
            const parentState = this.tileStatus.get(parentIndex);
            if (parentState?.state === TileState.VISIBLE) {
              parentState.evict = false;
              break;
            }

            parent = getParent(parent);
          }
        }
      }
    }

    for (const key of this.tileStatus.keys()) {
      const status = this.tileStatus.get(key);
      if (!status?.evict) {
        continue;
      }

      if (status.state === TileState.LOADING) {
        const canceled = this.workerPool.cancelRequest({
          type: RequestType.CANCEL,
          id: key
        } as DataRequest);

        if (canceled) {
          this.updateLoadingStatus(true);
        }
      } else if (status.state === TileState.VISIBLE) {
        status.tile?.dispose();
      }

      this.tileStatus.delete(key);
    }
  }

  public setupEventListeners(): void {
    // Empty
  }

  public stopEventListeners(): void {
    // Empty
  }

  public onImageTileDataLoad(id: string, response: ImageResponse) {
    if (response.canceled) {
      return;
    }

    const tileIndex = `image_${response.index[0]}_${response.index[1]}_${response.index[2]}`;
    const status = this.tileStatus.get(id);

    if (!status) {
      // Tile was removed from the tileset but canceling missed timing
      return;
    }

    if (status.tile) {
      status.tile.update({ uniformBuffer: this.tileOptions, response });
    } else {
      status.tile = new ImageTile(
        [0, 0, this.baseWidth, this.baseHeight],
        this.tileSize,
        this.metadata.channels.get(this.selectedAttribute.name)?.length ?? 0,
        this.tileOptions,
        this.hasMinimap,
        response,
        this.scene
      );
    }

    status.state = TileState.VISIBLE;
    status.evict = false;
    this.tileStatus.set(tileIndex, status);
    this.updateLoadingStatus(true);
  }

  private update() {
    for (const key of this.tileStatus.keys()) {
      const index = key
        .split('_')
        .map(x => parseInt(x))
        .filter(x => !Number.isNaN(x));

      const status = this.tileStatus.get(key);

      if (!status) {
        console.error(`Unexpected key ${key}`);
        continue;
      }

      status.state = TileState.LOADING;

      const canceled = this.workerPool.cancelRequest({
        type: RequestType.CANCEL,
        id: key
      } as DataRequest);

      if (canceled) {
        this.updateLoadingStatus(true);
      }

      this.workerPool.postMessage({
        id: key,
        type: RequestType.IMAGE,
        request: {
          index: index,
          tileSize: this.tileSize,
          levelRecord: this.levels[index[2]],
          namespace: this.namespace,
          attribute: this.selectedAttribute,
          channelRanges: this.channelRanges,
          dimensions: this.dimensions
        }
      });

      this.updateLoadingStatus(false);
    }
  }
}

function getParent(index: number[]): number[] | undefined {
  if (index[2] === 0) {
    return undefined;
  }

  return [index[0] >> 1, index[1] >> 1, index[2] - 1];
}
