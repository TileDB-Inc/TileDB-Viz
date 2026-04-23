import { Scene } from '@babylonjs/core';
import { AssetType, AssetEntry } from '@tiledb-inc/viz-common';
import { SceneOptions } from '../../types';
import { Manager } from '../model/manager';
import { Tile } from '../model/tile';
import { WorkerPool } from '../worker/tiledb.worker.pool';
import { Fetcher } from '../model/fetcher';

export type AssetFactoryContext = {
  scene: Scene;
  workerPool: WorkerPool;
  sceneOptions: SceneOptions;
  workspace?: string;
  teamspace?: string;
  token?: string;
  tiledbEnv?: string;
};

export type AssetFactoryResult = {
  manager: Manager<Tile<any>>;
  pickable: boolean;
  minimap: boolean;
  cacheKeys?: string[];
};

type AssetFactory = (
  entry: AssetEntry,
  context: AssetFactoryContext
) => Promise<AssetFactoryResult>;

const registry = new Map<AssetType, AssetFactory>();

export function registerAssetFactory(
  type: AssetType,
  factory: AssetFactory
): void {
  registry.set(type, factory);
}

export function getAssetFactory(type: AssetType): AssetFactory | undefined {
  return registry.get(type);
}
