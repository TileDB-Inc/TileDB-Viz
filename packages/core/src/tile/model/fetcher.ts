import { Tile } from './tile';
import { TileContent } from './tileContent';

export abstract class Fetcher<T extends Tile<any, TileContent>> {
  public abstract fetch(tile: T): Promise<any>;

  public abstract fetchInfo(tile: T): Promise<any>;
}
