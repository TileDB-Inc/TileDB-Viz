import {
  Channel,
  DataRequest,
  ImageResponse,
  LevelRecord,
  RequestType
} from '../types';
import { Camera, Scene, UniformBuffer, Nullable } from '@babylonjs/core';
import { Attribute, Dimension } from '../../types';
import { range } from '../utils/helpers';
import { Tile } from './tile';
import { Minimap } from './minimap';
import { WorkerPool } from '../worker/tiledb.worker.pool';
import { Events } from '@tiledb-inc/viz-components';

const enum TileState {
  LOADING,
  VISIBLE
}

interface TileStatus {
  tile?: Tile;
  state?: TileState;
  evict: boolean;
}

export class Tileset {
  public minimap: Nullable<Minimap>;
  private levels: LevelRecord[];
  private dimensions: Dimension[];
  private channels: Map<string, Channel[]>;
  private attributes: Attribute[];
  private tileSize: number;
  private baseWidth: number;
  private baseHeight: number;
  private scene: Scene;
  private namespace: string;
  private tileOptions: UniformBuffer;

  private channelRanges: number[] = [];
  private channelMapping: Int32Array;
  private intensityRanges: Float32Array;
  private colors: Float32Array;
  private selectedAttribute: Attribute;

  public workerPool!: WorkerPool;
  public tileStatus: Map<string, TileStatus>;

  constructor(
    levels: LevelRecord[],
    dimensions: Dimension[],
    channels: Map<string, Channel[]>,
    attributes: Attribute[],
    tileSize: number,
    namespace: string,
    workerPool: WorkerPool,
    scene: Scene
  ) {
    this.levels = levels;
    this.dimensions = dimensions;
    this.channels = channels;
    this.attributes = attributes;
    this.tileSize = tileSize;
    this.namespace = namespace;
    this.tileStatus = new Map<string, TileStatus>();
    this.workerPool = workerPool;
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

    this.workerPool.callbacks.image = this.onTileDataLoad.bind(this);
    this.minimap = null;

    if (
      this.baseWidth <= Minimap.IMAGE_MAX_SIZE &&
      this.baseHeight <= Minimap.IMAGE_MAX_SIZE
    ) {
      this.workerPool.postMessage({
        id: 'image_minimap',
        type: RequestType.IMAGE,
        request: {
          id: 'image_minimap',
          index: [0, 0, 0],
          tileSize: Math.max(this.baseWidth, this.baseHeight),
          levelRecord: this.levels[0],
          namespace: this.namespace,
          attribute: this.selectedAttribute,
          channelRanges: this.channelRanges,
          dimensions: this.dimensions
        }
      });
    }
  }

  public onTileDataLoad(id: string, response: ImageResponse) {
    if (response.canceled) {
      return;
    }

    if (id === 'image_minimap') {
      if (this.minimap) {
        this.minimap.update(this.tileOptions, response);
        updateLoadingStatus(true);
      } else {
        this.minimap = new Minimap(
          [0, 0, this.baseWidth, this.baseHeight],
          this.channels.get(this.selectedAttribute.name)?.length ?? 0,
          this.tileOptions,
          response,
          this.scene
        );
      }
    } else {
      const tileIndex = `${response.index[0]}_${response.index[1]}_${response.index[2]}`;
      const status = this.tileStatus.get(tileIndex) ?? {
        evict: false,
        state: TileState.VISIBLE
      };

      if (status.tile) {
        status.tile.update(this.tileOptions, response);
      } else {
        status.tile = new Tile(
          [0, 0, this.baseWidth, this.baseHeight],
          this.tileSize,
          this.channels.get(this.selectedAttribute.name)?.length ?? 0,
          this.tileOptions,
          response,
          this.scene
        );
      }

      status.state = TileState.VISIBLE;
      this.tileStatus.set(tileIndex, status);
      updateLoadingStatus(true);
    }
  }

  public calculateVisibleTiles(camera: Camera, zoom: number) {
    for (const [, value] of this.tileStatus) {
      value.evict = true;
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

    if (this.minimap) {
      this.minimap.update(this.tileOptions, undefined, [
        Math.min(this.baseWidth, Math.max(left, 0)),
        Math.min(this.baseHeight, Math.max(bottom, 0)),
        Math.min(this.baseWidth, Math.max(right, 0)),
        Math.min(this.baseHeight, Math.max(top, 0))
      ]);
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
        const status = this.tileStatus.get(tileIndex) ?? { evict: false };

        status.evict = false;

        if (status.state === TileState.LOADING) {
          let parent = getParent([x, y, integerZoom]);

          while (parent !== undefined) {
            const parentIndex = `${parent[0]}_${parent[1]}_${parent[2]}`;
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
            id: `image_${x}_${y}_${integerZoom}`,
            request: {
              index: [x, y, integerZoom],
              tileSize: this.tileSize,
              levelRecord: this.levels[integerZoom],
              namespace: this.namespace,
              attribute: this.selectedAttribute,
              channelRanges: this.channelRanges,
              dimensions: this.dimensions
            }
          });

          status.state = TileState.LOADING;
          this.tileStatus.set(tileIndex, status);

          updateLoadingStatus(false);

          let parent = getParent([x, y, integerZoom]);
          while (parent !== undefined) {
            const parentIndex = `${parent[0]}_${parent[1]}_${parent[2]}`;
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
  }

  public evict() {
    for (const key of this.tileStatus.keys()) {
      const status = this.tileStatus.get(key);
      if (!status?.evict) {
        continue;
      }

      if (status.state === TileState.LOADING) {
        const canceled = this.workerPool.cancelRequest({
          type: RequestType.CANCEL,
          id: `image_${key}`
        } as DataRequest);

        if (canceled) {
          updateLoadingStatus(true);
        }
      } else if (status.state === TileState.VISIBLE) {
        status.tile?.dispose();
      }

      this.tileStatus.delete(key);
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

    this.update();
  }

  public updateExtraDimensions(index: number, value: number) {
    this.dimensions[index].value = value;

    this.update();
  }

  private update() {
    for (const key of this.tileStatus.keys()) {
      const index = key.split('_').map(x => parseInt(x));

      const status = this.tileStatus.get(key);
      if (!status) {
        console.error(`Unexpected key ${key}`);
        continue;
      }

      status.state = TileState.LOADING;

      const canceled = this.workerPool.cancelRequest({
        type: RequestType.CANCEL,
        id: `image_${key}`
      } as DataRequest);

      if (canceled) {
        updateLoadingStatus(true);
      }

      this.workerPool.postMessage({
        id: `image_${key}`,
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

      updateLoadingStatus(false);
    }

    const canceled = this.workerPool.cancelRequest({
      type: RequestType.CANCEL,
      id: 'image_minimap'
    } as DataRequest);

    if (canceled) {
      updateLoadingStatus(true);
    }

    this.workerPool.postMessage({
      id: 'image_minimap',
      type: RequestType.IMAGE,
      request: {
        index: [0, 0, 0],
        tileSize: Math.max(this.baseWidth, this.baseHeight),
        levelRecord: this.levels[0],
        namespace: this.namespace,
        attribute: this.selectedAttribute,
        channelRanges: this.channelRanges,
        dimensions: this.dimensions
      }
    });

    updateLoadingStatus(false);
  }

  public toggleMinimap(visible: boolean) {
    this.minimap?.hide(visible);
  }

  public onViewportResize() {
    this.minimap?.resize();
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
    for (const [, status] of this.tileStatus) {
      status.tile?.dispose();
    }

    this.minimap?.dispose();
  }
}

function getParent(index: number[]): number[] | undefined {
  if (index[2] === 0) {
    return undefined;
  }

  return [index[0] >> 1, index[1] >> 1, index[2] - 1];
}

function updateLoadingStatus(loaded: boolean) {
  window.dispatchEvent(
    new CustomEvent(Events.ENGINE_INFO_UPDATE, {
      bubbles: true,
      detail: {
        type: 'LOADING_TILE',
        loaded
      }
    })
  );
}
