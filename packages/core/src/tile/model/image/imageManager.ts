import { Scene, ArcRotateCamera, UniformBuffer } from '@babylonjs/core';
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
import { Manager, TileStatus, TileState } from '../manager';
import { ImageTile } from './image';
import { range } from '../../utils/helpers';
import { calculateChannelRanges, calculateChannelMapping } from './imageUtils';
import { Events, GUIEvent, ButtonProps, SliderProps } from '@tiledb-inc/viz-components';

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
  private tileOptions!: UniformBuffer;
  private levels: LevelRecord[];
  private dimensions: Dimension[];
  private attributes: Attribute[];
  private metadata: ImageMetadata;
  private namespace: string;

  private selectedAttribute!: Attribute;
  private hasMinimap: boolean;

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

    const channelCount =
      this.metadata.channels.get(this.selectedAttribute.name)?.length ?? 0;

    this.channelRanges = [0, channelCount - 1];
    this.channelMapping = new Int32Array(
      range(0, channelCount)
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

    this.initializeUniformBuffer();
    this.hasMinimap =
      (this.scene.activeCameras?.filter(x => x.name === 'Minimap').length ??
        0) > 0;

    window.addEventListener(Events.SLIDER_CHANGE, this.sliderHandler.bind(this) as any, {
      capture: true
    });
    window.addEventListener(Events.COLOR_CHANGE, this.buttonHandler.bind(this) as any, {
      capture: true
    });
    window.addEventListener(Events.TOGGLE_INPUT_CHANGE, this.buttonHandler.bind(this) as any, {
      capture: true
    });
  }

  public loadTiles(camera: ArcRotateCamera, zoom: number): void {
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

  protected stopEventListeners(): void {
    window.removeEventListener(Events.SLIDER_CHANGE, this.sliderHandler.bind(this) as any, {
      capture: true
    });
    window.removeEventListener(Events.COLOR_CHANGE, this.buttonHandler.bind(this) as any, {
      capture: true
    });
    window.removeEventListener(Events.TOGGLE_INPUT_CHANGE, this.buttonHandler.bind(this) as any, {
      capture: true
    });
  }

  private initializeUniformBuffer() {
    this.tileOptions = new UniformBuffer(this.scene.getEngine());
    this.tileOptions.addUniform('channelMapping', 4, this.channelMapping.length / 4);
    this.tileOptions.addUniform('ranges', 4, this.intensityRanges.length / 4);
    this.tileOptions.addUniform('colors', 4, this.colors.length / 4);

    this.tileOptions.updateIntArray('channelMapping', this.channelMapping);
    this.tileOptions.updateFloatArray('ranges', this.intensityRanges);
    this.tileOptions.updateFloatArray('colors', this.colors);

    this.tileOptions.update();
  }

  private buttonHandler(event: CustomEvent<GUIEvent<ButtonProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== 'channel') return;

    const index = Number(target[1]);

    switch (event.detail.props.command) {
      case 'color':
        this.colors[4 * index] = event.detail.props.data.r / 255;
        this.colors[4 * index + 1] = event.detail.props.data.g / 255;
        this.colors[4 * index + 2] = event.detail.props.data.b / 255;
  
        this.tileOptions.updateFloatArray('colors', this.colors);
        this.tileOptions.update();
        break;
      case 'visibility':
        this.channelMapping[4 * index] = event.detail.props.data ? index : -1;
        calculateChannelMapping(this.channelMapping);

        this.channelRanges = calculateChannelRanges(this.channelMapping);
        this.initializeUniformBuffer();
        this.update();
        break;
    }
  }

  private sliderHandler(event: CustomEvent<GUIEvent<SliderProps>>) {
    const target = event.detail.target.split('_');

    switch (target[0]) {
      case 'channel':
        {
          const index = Number(target[1]);

          this.intensityRanges[4 * index + 1] = event.detail.props.value;
          this.tileOptions.updateFloatArray('ranges', this.intensityRanges);
          this.tileOptions.update();      
        }
        break;
      case 'dimension':
        {
          const index = Number(target[1]);

          this.dimensions[index].value = event.detail.props.value;
          this.update();
        }
        break;
      default: 
        return;
    }
  }
}

function getParent(index: number[]): number[] | undefined {
  if (index[2] === 0) {
    return undefined;
  }

  return [index[0] >> 1, index[1] >> 1, index[2] - 1];
}
