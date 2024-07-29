/**
 * TODO: Need to add dimension control back
 */

import { Scene, UniformBuffer } from '@babylonjs/core';
import {
  Channel,
  DataRequest,
  ImageMetadataV2,
  ImagePayload,
  ImageResponse,
  RequestType
} from '../../types';
import { WorkerPool } from '../../worker/tiledb.worker.pool';
import { Manager } from '../manager';
import { calculateChannelRanges, calculateChannelMapping } from './imageUtils';
import {
  Events,
  GUIEvent,
  ButtonProps,
  SliderProps,
  Commands
} from '@tiledb-inc/viz-components';
import {
  Attribute,
  GUIChannelProperty,
  GUISelectProperty
} from '@tiledb-inc/viz-common';
import { ImageContent } from './imageContent';
import { ImageDataContent } from '../../../types';
import { Tile } from '../tile';
import { ImagePanelInitializationEvent } from '@tiledb-inc/viz-common';

interface ImageOptions {
  metadata: ImageMetadataV2;
  namespace: string;
}

export class ImageManager extends Manager<
  Tile<ImageDataContent, ImageContent>
> {
  private workerPool: WorkerPool;
  private channelRanges: number[] = [];
  private channelMapping: Uint32Array;
  private intensityRanges: Float32Array;
  private colors: Float32Array;
  private tileOptions!: UniformBuffer;
  private metadata: ImageMetadataV2;
  private namespace: string;

  private selectedAttribute: Attribute;

  constructor(
    scene: Scene,
    workerPool: WorkerPool,
    imageOptions: ImageOptions
  ) {
    super(imageOptions.metadata.root, scene);

    this.workerPool = workerPool;
    this.traverserOptions.errorLimit = Math.max(
      this.scene.getEngine().getRenderWidth(),
      this.scene.getEngine().getRenderHeight()
    );

    this.metadata = imageOptions.metadata;
    this.namespace = imageOptions.namespace;

    this.selectedAttribute = this.metadata.attributes.filter(
      item => item.visible
    )[0];

    this.channelMapping = new Uint32Array(
      this.metadata.channels
        .get(this.selectedAttribute.name)
        ?.map((x: Channel, index: number) => [
          x.visible ? index : 0x7fffffff,
          0,
          0,
          0
        ])
        .flat() ?? []
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
          Object.values(x.color).map(item =>
            Math.min(Math.max(item / 255, 0), 1)
          )
        )
        .flat() ?? []
    );

    calculateChannelMapping(this.channelMapping);
    this.channelRanges = calculateChannelRanges(this.channelMapping);
    this.initializeUniformBuffer();
    this.registerEventListeners();
  }

  public registerEventListeners(): void {
    window.addEventListener(
      Events.SLIDER_CHANGE,
      this.sliderHandler.bind(this) as any,
      {
        capture: true
      }
    );
    window.addEventListener(
      Events.COLOR_CHANGE,
      this.buttonHandler.bind(this) as any,
      {
        capture: true
      }
    );
    window.addEventListener(
      Events.TOGGLE_INPUT_CHANGE,
      this.buttonHandler.bind(this) as any,
      {
        capture: true
      }
    );
  }

  public removeEventListeners(): void {
    window.removeEventListener(
      Events.SLIDER_CHANGE,
      this.sliderHandler.bind(this) as any,
      {
        capture: true
      }
    );
    window.removeEventListener(
      Events.COLOR_CHANGE,
      this.buttonHandler.bind(this) as any,
      {
        capture: true
      }
    );
    window.removeEventListener(
      Events.TOGGLE_INPUT_CHANGE,
      this.buttonHandler.bind(this) as any,
      {
        capture: true
      }
    );
  }

  public requestTile(
    tile: Tile<ImageDataContent, ImageContent>,
    nonce?: number
  ): Promise<any> {
    // Initialize tile data if not
    if (!tile.data) {
      tile.data = new ImageContent(this.scene, tile);
    }

    if (tile.content.length === 0) {
      return new Promise((resolve, _) => resolve(true));
    }

    this.workerPool.postMessage({
      type: RequestType.IMAGE,
      id: tile.id,
      payload: {
        index: tile.index,
        uri: tile.content[0].uri,
        region: tile.content[0].region,
        namespace: this.namespace,
        attribute: this.selectedAttribute,
        channelRanges: this.channelRanges,
        dimensions: this.metadata.extraDimensions,
        loaderOptions: this.metadata.loaderMetadata?.get(tile.content[0].uri),
        nonce: nonce
      } as ImagePayload
    });

    // TODO: Rewrite worker pool to store resolve functions of promises
    return new Promise((resolve, _) => {
      this.workerPool.callbacks.set(`${tile.id}_${nonce}`, resolve);
    });
  }

  public cancelTile(
    tile: Tile<ImageDataContent, ImageContent>,
    nonce?: number
  ): void {
    this.workerPool.cancelRequest({
      type: RequestType.CANCEL,
      id: tile.id,
      payload: { nonce: nonce }
    } as DataRequest);
  }

  public onLoaded(
    tile: Tile<ImageDataContent, ImageContent>,
    data: ImageResponse
  ): void {
    if (tile.content.length === 0) {
      return;
    }

    tile.data?.update({
      data: {
        raw: data.data,
        width: data.width,
        height: data.height,
        depth: data.channels,
        dtype: data.dtype,
        channelLimit: this.intensityRanges.length / 4
      },
      UBO: this.tileOptions
    });
  }

  private initializeUniformBuffer() {
    this.tileOptions = new UniformBuffer(this.scene.getEngine());
    this.tileOptions.addUniform(
      'channelMapping',
      4,
      this.channelMapping.length / 4
    );
    this.tileOptions.addUniform('ranges', 4, this.intensityRanges.length / 4);
    this.tileOptions.addUniform('colors', 4, this.colors.length / 4);

    this.tileOptions.updateUIntArray('channelMapping', this.channelMapping);
    this.tileOptions.updateFloatArray('ranges', this.intensityRanges);
    this.tileOptions.updateFloatArray('colors', this.colors);

    this.tileOptions.update();
  }

  private buttonHandler(event: CustomEvent<GUIEvent<ButtonProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== this.metadata.id) {
      return;
    }

    if (target[1] !== 'channel') {
      return;
    }

    const index = Number(target[2]);

    switch (event.detail.props.command) {
      case Commands.COLOR:
        this.colors[4 * index] = event.detail.props.data.r / 255;
        this.colors[4 * index + 1] = event.detail.props.data.g / 255;
        this.colors[4 * index + 2] = event.detail.props.data.b / 255;

        this.tileOptions.updateFloatArray('colors', this.colors);
        this.tileOptions.update();
        break;
      case Commands.VISIBILITY:
        this.channelMapping[4 * index] = event.detail.props.data
          ? index
          : 0x7fffffff;
        calculateChannelMapping(this.channelMapping);

        this.channelRanges = calculateChannelRanges(this.channelMapping);
        this.initializeUniformBuffer();
        this.forceReloadTiles();
        break;
    }
  }

  private sliderHandler(event: CustomEvent<GUIEvent<SliderProps>>) {
    const target = event.detail.target.split('_');

    if (target[0] !== this.metadata.id) {
      return;
    }

    switch (target[1]) {
      case 'channel':
        {
          if (!event.detail.props.range) {
            break;
          }

          const index = Number(target[2]);

          this.intensityRanges[4 * index + 1] = event.detail.props.range[1];
          this.tileOptions.updateFloatArray('ranges', this.intensityRanges);
          this.tileOptions.update();
        }
        break;
      case 'dimension':
        {
          if (!event.detail.props.value) {
            break;
          }

          const index = Number(target[2]);

          this.metadata.extraDimensions[index].value = event.detail.props.value;
          this.forceReloadTiles();
        }
        break;
      default:
        return;
    }
  }

  public initializeGUIProperties(): void {
    const channelEntries: Record<string, GUIChannelProperty[]> = {};
    for (const [attribute, channels] of this.metadata.channels.entries()) {
      channelEntries[attribute] = channels.map((x, idx) => {
        return {
          name: x.name,
          id: `channel_${idx}`,
          min: x.min,
          max: x.max,
          color: `#${x.color.red.toString(16).padStart(2, '0')}${x.color.green
            .toString(16)
            .padStart(2, '0')}${x.color.blue.toString(16).padStart(2, '0')}`,
          defaultMin: x.min,
          defaultMax: x.intensity,
          visible: x.visible,
          step: 0.1
        } as GUIChannelProperty;
      });
    }

    window.dispatchEvent(
      new CustomEvent<GUIEvent<ImagePanelInitializationEvent>>(
        Events.INITIALIZE,
        {
          bubbles: true,
          detail: {
            target: 'image-panel',
            props: {
              id: this.metadata.id,
              name: this.metadata.name,
              attribute: {
                name: 'Attribute',
                id: 'attribute',
                entries: this.metadata.attributes.map((x, idx) => {
                  return { value: idx, name: x.name };
                }),
                default: 0
              } as GUISelectProperty,
              channels: channelEntries
            }
          }
        }
      )
    );
  }
}
