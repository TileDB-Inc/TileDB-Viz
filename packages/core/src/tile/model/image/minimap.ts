import { Scene, UniformBuffer, Camera } from '@babylonjs/core';
import { Manager, UpdateOperation, TileStatus, TileState } from '../manager';
import {
  Channel,
  DataRequest,
  ImageMessage,
  ImageMetadata,
  ImageResponse,
  LevelRecord,
  RequestType
} from '../../types';
import { Attribute, Dimension } from '../../../types';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { MinimapTile } from './minimapTile';
import { calculateChannelRanges, calculateChannelMapping } from './imageUtils';
import { range } from '../../utils/helpers';

export interface MinimapOptions {
  metadata: ImageMetadata;
  namespace: string;
  baseLevel: LevelRecord;
  attributes: Attribute[];
  dimensions: Dimension[];
}

export class MinimapManager extends Manager<MinimapTile> {
  private channelRanges: number[] = [];
  private channelMapping: Int32Array;
  private intensityRanges: Float32Array;
  private colors: Float32Array;
  private tileOptions: UniformBuffer;
  private baseLevel: LevelRecord;
  private dimensions: Dimension[];
  private attributes: Attribute[];
  private metadata: ImageMetadata;
  private namespace: string;

  private selectedAttribute!: Attribute;

  public static readonly MINIMAP_MAX_SIZE = 200;
  public static readonly IMAGE_MAX_SIZE = 4096;

  public static readonly ColorUpdate = class
    implements UpdateOperation<MinimapManager>
  {
    public index: number;
    public color: { r: number; g: number; b: number };

    constructor(index: number, color: { r: number; g: number; b: number }) {
      this.index = index;
      this.color = color;
    }

    public apply(source: MinimapManager): void {
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
    implements UpdateOperation<MinimapManager>
  {
    public index: number;
    public intensity: number;

    constructor(index: number, intensity: number) {
      this.index = index;
      this.intensity = intensity;
    }

    apply(source: MinimapManager): void {
      source.intensityRanges[4 * this.index + 1] = this.intensity;

      source.tileOptions.updateFloatArray(
        'ranges',
        new Float32Array(source.intensityRanges)
      );
      source.tileOptions.update();
    }
  };

  public static readonly ChannelUpdate = class
    implements UpdateOperation<MinimapManager>
  {
    public index: number;
    public visible: boolean;

    constructor(index: number, visible: boolean) {
      this.index = index;
      this.visible = visible;
    }

    apply(source: MinimapManager): void {
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
    implements UpdateOperation<MinimapManager>
  {
    public index: number;
    public value: number;

    constructor(index: number, value: number) {
      this.index = index;
      this.value = value;
    }
    apply(source: MinimapManager): void {
      source.dimensions[this.index].value = this.value;

      source.update();
    }
  };

  public static readonly VisibilityUpdate = class
    implements UpdateOperation<MinimapManager>
  {
    public visible: boolean;

    constructor(visible: boolean) {
      this.visible = visible;
    }

    apply(source: MinimapManager): void {
      const status = source.tileStatus.get('minimap');
      status?.tile?.update({ visible: this.visible });
    }
  };

  constructor(
    scene: Scene,
    workerPool: WorkerPool,
    tileSize: number,
    minimapOptions: MinimapOptions
  ) {
    const xIndex = minimapOptions.baseLevel.axes.indexOf('X');
    const yIndex = minimapOptions.baseLevel.axes.indexOf('Y');

    const baseWidth = minimapOptions.baseLevel.dimensions[xIndex];
    const baseHeight = minimapOptions.baseLevel.dimensions[yIndex];

    super(scene, workerPool, tileSize, baseWidth, baseHeight);

    this.workerPool.callbacks.image.push(this.onImageTileDataLoad.bind(this));

    this.baseLevel = minimapOptions.baseLevel;
    this.dimensions = minimapOptions.dimensions;
    this.attributes = minimapOptions.attributes;
    this.metadata = minimapOptions.metadata;
    this.namespace = minimapOptions.namespace;

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
  }

  public loadTiles(camera: Camera, zoom: number): void {
    if (
      this.baseHeight > MinimapManager.IMAGE_MAX_SIZE ||
      this.baseWidth > MinimapManager.IMAGE_MAX_SIZE
    ) {
      return;
    }

    const status =
      this.tileStatus.get('minimap') ??
      ({ evict: false } as TileStatus<MinimapTile>);

    if (status.state === undefined) {
      console.log('Minimap Loading');
      this.workerPool.postMessage({
        type: RequestType.IMAGE,
        id: 'minimap',
        request: {
          index: [0, 0, 0],
          tileSize: this.tileSize,
          levelRecord: this.baseLevel,
          namespace: this.namespace,
          attribute: this.selectedAttribute,
          channelRanges: this.channelRanges,
          dimensions: this.dimensions
        } as ImageMessage
      } as DataRequest);

      status.state = TileState.LOADING;
      this.tileStatus.set('minimap', status);
    } else if (status.state === TileState.VISIBLE) {
      const top = Math.min(
        this.baseHeight,
        Math.max(camera.position.z + (camera?.orthoTop ?? 0), 0)
      );
      const bottom = Math.min(
        this.baseHeight,
        Math.max(camera.position.z + (camera?.orthoBottom ?? 0), 0)
      );
      const left = Math.min(
        this.baseWidth,
        Math.max(camera.position.x + (camera?.orthoLeft ?? 0), 0)
      );
      const right = Math.min(
        this.baseWidth,
        Math.max(camera.position.x + (camera?.orthoRight ?? 0), 0)
      );

      status.tile?.update({ visibleArea: [left, bottom, right, top] });
    }
  }

  public onImageTileDataLoad(id: string, response: ImageResponse) {
    if (response.canceled) {
      return;
    }

    const status = this.tileStatus.get(id);

    if (!status) {
      return;
    }

    if (status.tile) {
      status.tile.update({ uniformBuffer: this.tileOptions, response });
    } else {
      status.tile = new MinimapTile(
        response,
        this.scene,
        [this.baseWidth, this.baseHeight],
        MinimapManager.MINIMAP_MAX_SIZE,
        this.metadata.channels.get(this.selectedAttribute.name)?.length ?? 0,
        this.tileOptions
      );
    }

    status.state = TileState.VISIBLE;
    this.tileStatus.set('minimap', status);
    this.updateLoadingStatus(true);
  }

  private update() {
    if (
      this.baseHeight > MinimapManager.IMAGE_MAX_SIZE ||
      this.baseWidth > MinimapManager.IMAGE_MAX_SIZE
    ) {
      return;
    }

    const status = this.tileStatus.get('minimap');

    if (!status) {
      console.error('Minimap no found');
      return;
    }

    status.state = TileState.LOADING;

    const canceled = this.workerPool.cancelRequest({
      type: RequestType.CANCEL,
      id: 'minimap'
    } as DataRequest);

    if (canceled) {
      this.updateLoadingStatus(true);
    }

    this.workerPool.postMessage({
      id: 'minimap',
      type: RequestType.IMAGE,
      request: {
        index: [0, 0, 0],
        tileSize: this.tileSize,
        levelRecord: this.baseLevel,
        namespace: this.namespace,
        attribute: this.selectedAttribute,
        channelRanges: this.channelRanges,
        dimensions: this.dimensions
      }
    });

    this.updateLoadingStatus(false);
  }
}
