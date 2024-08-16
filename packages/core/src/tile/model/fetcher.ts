import { BoundingInfo } from '@babylonjs/core';
import { Tile } from './tile';
import { TileContent } from './tileContent';
import { InfoResponse } from '../types';

export abstract class Fetcher<T extends Tile<any, TileContent>, C> {
  public abstract fetch(tile: T, options?: C): Promise<any>;

  public abstract fetchInfo(
    tile: T,
    boundingInfo?: BoundingInfo,
    ids?: bigint[]
  ): Promise<InfoResponse>;
}
