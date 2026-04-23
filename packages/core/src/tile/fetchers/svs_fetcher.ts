import { OpenSlideImage } from '@conflux-xyz/openslide-wasm';
import { Fetcher } from '../model/fetcher';
import { Tile } from '../model/tile';
import { WorkerPool } from '../worker/tiledb.worker.pool';
import { ImageDataContent } from '../../types';
import { ImageContent } from '../model/image/imageContent';
import { ImageFetchOptions } from '../model/image/imageFetcher';
import { getBoundingInfo } from '../../utils/metadata-utils/metadata-utils';
import { RefineStrategy } from '@tiledb-inc/viz-common';
import { RequestType, SVSImagePayload } from '../types';
import { BoundingInfo } from '@babylonjs/core';

export class SVSImageFetcher extends Fetcher<
  Tile<ImageDataContent, ImageContent>,
  ImageFetchOptions
> {
  private workerPool: WorkerPool;
  private image: OpenSlideImage;

  constructor(workerPool: WorkerPool, image: OpenSlideImage) {
    super();

    this.workerPool = workerPool;
    this.image = image;
  }

  public fetch(
    tile: Tile<ImageDataContent, ImageContent>,
    options: ImageFetchOptions
  ): Promise<any> {
    const region = tile.content[0].region;
    const level = Number.parseInt(tile.content[0].uri);
    const width = region[0].max - region[0].min;
    const height = region[1].max - region[1].min;

    this.image.readRegion(region[0].min, region[1].min, level, width, height).then(buffer => {
      this.workerPool.postMessage({
            type: RequestType.SVSIMAGE,
            id: tile.id,
            payload: {
                buffer: buffer,
                index: tile.index,
                channelRanges: options.channelRanges,
                width: width,
                height: height,
                nonce: options.nonce
            } as SVSImagePayload
        }, [buffer.buffer]);
    });

    return new Promise((resolve, _) => {
      this.workerPool.callbacks.set(`${tile.id}_${options.nonce}`, resolve);
    });
  }

  public fetchInfo(
    tile: Tile<ImageDataContent, ImageContent>,
    boundingInfo?: BoundingInfo,
    ids?: bigint[]
  ): Promise<any> {
    throw new Error('Method not implemented.');
  }
}

export function constructImageTileset(
  levels: { width: [number, number]; height: [number, number] }[],
): Tile<ImageDataContent, ImageContent> {
  const DATA_TILE_SIZE = 1024;
  const ROOT_SIZE = 1024;
  const EXPLORATION_LIMIT = 12;

  const tileDictionary: Map<
    string,
    Tile<ImageDataContent, ImageContent>
  > = new Map();
  const baseWidth = levels[0].width[1] - levels[0].width[0] + 1;
  const baseHeight = levels[0].height[1] - levels[0].height[0] + 1;

  const errorBase = Math.max(baseWidth, baseHeight);

  // TODO: Fix bounding info to account for images not starting at (0,0)
  const root = new Tile<ImageDataContent, ImageContent>();
  root.boundingInfo = getBoundingInfo([0, 0, baseWidth, baseHeight]);
  root.geometricError = 16 * errorBase;
  root.refineStrategy = RefineStrategy.ADD;

  for (const [idx, level] of levels.entries()) {
    if (idx >= EXPLORATION_LIMIT) {
      break;
    }

    const levelWidth = level.width[1] - level.width[0] + 1;
    const levelHeight = level.height[1] - level.height[0] + 1;

    const downsample = Math.round(levelWidth / baseWidth)
    const TILE_SIZE = ROOT_SIZE / downsample;

    for (let x = 0; x < Math.ceil(levelWidth / DATA_TILE_SIZE); ++x) {
      for (let y = 0; y < Math.ceil(levelHeight / DATA_TILE_SIZE); ++y) {
        const dataOrigin = [x * DATA_TILE_SIZE, y * DATA_TILE_SIZE];
        const dataExtent = [
          Math.min((x + 1) * DATA_TILE_SIZE, levelWidth) - dataOrigin[0],
          Math.min((y + 1) * DATA_TILE_SIZE, levelHeight) - dataOrigin[1]
        ];

        const physicalExtent = [
          x * TILE_SIZE,
          y * TILE_SIZE,
          (x + dataExtent[0] / DATA_TILE_SIZE) * TILE_SIZE,
          (y + dataExtent[1] / DATA_TILE_SIZE) * TILE_SIZE
        ];

        const tile = new Tile<ImageDataContent, ImageContent>();
        tile.boundingInfo = getBoundingInfo(physicalExtent);
        tile.content.push({
          uri: `${idx}`,
          region: [
            {
              dimension: 'x',
              min: dataOrigin[0],
              max: dataOrigin[0] + dataExtent[0]
            },
            {
              dimension: 'y',
              min: dataOrigin[1],
              max: dataOrigin[1] + dataExtent[1]
            }
          ]
        });
        tile.index = [x, y];
        tile.refineStrategy = RefineStrategy.REPLACE;

        tileDictionary.set(`${idx}-${x}-${y}`, tile);

        //TODO: Fix for non power of two downsample
        if (idx === 0) {
          tile.parents.push(root);
          root.children.push(tile);
        } else {
          const parentLevelWidth =
            levels[idx - 1].width[1] - levels[idx - 1].width[0] + 1;
          const relativeDownsample = levelWidth / parentLevelWidth;

          // When tile overlaps with multiple parent tiles find way to detect it and add it to both parents as child
          // TODO: Modify tile to have multiple parents. The graph will still be a DAG

          // POSIBLE SOLUTION [(x + 1) % downsample < 1] === true -> overlaps with multiple tiles
          const overlap_x = (x + 1) % relativeDownsample;
          const overlap_y = (y + 1) % relativeDownsample;

          const x_parents: number[] = [];
          const y_parents: number[] = [];

          // Tile overlaps in the X axis with multiple parent tiles
          if (overlap_x > 0 && overlap_x < 1) {
            x_parents.push(
              Math.floor(x / relativeDownsample),
              Math.ceil(x / relativeDownsample)
            );
          } else {
            x_parents.push(Math.floor(x / relativeDownsample));
          }

          // Tile overlaps in the Y axis with multiple parent tiles
          if (overlap_y > 0 && overlap_y < 1) {
            y_parents.push(
              Math.floor(y / relativeDownsample),
              Math.ceil(y / relativeDownsample)
            );
          } else {
            y_parents.push(Math.floor(y / relativeDownsample));
          }

          for (const x_idx of x_parents) {
            for (const y_idx of y_parents) {
              const parent = tileDictionary.get(`${idx - 1}-${x_idx}-${y_idx}`);

              if (!parent) {
                continue;
              }

              tile.parents.push(parent);
              parent.geometricError = errorBase / downsample;
              parent.children.push(tile);
            }
          }
        }
      }
    }
  }

  return root;
}