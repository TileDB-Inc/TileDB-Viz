import {
  AssetOptions,
  AssetMetadata,
  Attribute,
  Dimension,
  AssetEntry
} from '../../types';
import getTileDBClient from '../getTileDBClient';
import {
  getBiomedicalMetadata,
  getRasterMetadata
} from '../../tile/utils/metadata-utils';
import {
  BiomedicalAssetMetadata,
  RasterAssetMetadata,
  LevelRecord
} from '../../tile/types';
import { GroupContents } from '@tiledb-inc/tiledb-cloud/lib/v1';

export async function getGroupContents(
  options: AssetOptions
): Promise<AssetEntry[]> {
  const client = getTileDBClient({
    ...(options.token ? { apiKey: options.token } : {}),
    ...(options.tiledbEnv ? { basePath: options.tiledbEnv } : {})
  });

  if (!options.baseGroup) {
    return [];
  }

  return await client.groups
    .getGroupContents(options.namespace, options.baseGroup)
    .then((value: GroupContents) => {
      if (!value.entries) {
        return [];
      }

      return [
        ...value.entries
          .filter((entry, _) => entry.group !== undefined)
          .map((entry, _) => {
            return {
              namespace: entry.group?.namespace ?? '',
              name: entry.group?.name ?? '',
              id: entry.group?.id ?? ''
            } as AssetEntry;
          }),

        ...value.entries
          .filter((entry, _) => entry.array !== undefined)
          .map(entry => {
            return {
              namespace: entry.array?.namespace ?? '',
              name: entry.array?.name ?? '',
              id: entry.array?.id ?? ''
            } as AssetEntry;
          })
      ];
    });
}

export async function getAssetMetadata(
  options: AssetOptions
): Promise<[AssetMetadata, Attribute[], Dimension[], LevelRecord[]]> {
  const client = getTileDBClient({
    ...(options.token ? { apiKey: options.token } : {}),
    ...(options.tiledbEnv ? { basePath: options.tiledbEnv } : {})
  });

  let assetMetadata: AssetMetadata;
  let uris: string[];

  //TODO: Find a better way to differentiate between group or array
  try {
    await client.info(options.namespace, options.assetID);
    [assetMetadata, uris] = await getArrayMetadata(options);
  } catch (e: unknown) {
    [assetMetadata, uris] = await getGroupMetadata(options);
  }

  const arraySchemaResponse = await client.ArrayApi.getArray(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    options.namespace,
    uris[0],
    'application/json'
  );

  const attributes = arraySchemaResponse.data.attributes.map((value, index) => {
    return {
      name: value.name,
      type: value.type as string,
      visible: index === 0 ? true : false
    } as Attribute;
  });

  switch (assetMetadata.dataset_type) {
    case 'BIOIMG':
      return getBiomedicalMetadata(
        assetMetadata as BiomedicalAssetMetadata,
        attributes,
        uris
      );
    case 'RASTER':
      return getRasterMetadata(
        assetMetadata as RasterAssetMetadata,
        attributes,
        uris
      );
    default:
      if ((assetMetadata as any)._gdal) {
        return getRasterMetadata(
          assetMetadata as RasterAssetMetadata,
          attributes,
          uris
        );
      }
      throw new Error(`Unknown dataset type '${assetMetadata.dataset_type}'`);
  }

  return [] as any;
}

async function getArrayMetadata(
  options: AssetOptions
): Promise<[AssetMetadata, string[]]> {
  const client = getTileDBClient({
    ...(options.token ? { apiKey: options.token } : {}),
    ...(options.tiledbEnv ? { basePath: options.tiledbEnv } : {})
  });

  const arrayMetadata = await client.ArrayApi.getArrayMetaDataJson(
    options.namespace,
    options.assetID
  ).then((response: any) => response.data);

  return [arrayMetadata, [options.assetID]];
}

async function getGroupMetadata(
  options: AssetOptions
): Promise<[AssetMetadata, string[]]> {
  const client = getTileDBClient({
    ...(options.token ? { apiKey: options.token } : {}),
    ...(options.tiledbEnv ? { basePath: options.tiledbEnv } : {})
  });

  const [groupMetadata, memberUris] = await Promise.all([
    client.groups.V2API.getGroupMetadata(options.namespace, options.assetID)
      .then((response: any) => response.data.entries)
      .then((data: any) => {
        return data.reduce((map: any, obj: any) => {
          map[obj.key] = deserializeBuffer(obj.type, obj.value);
          return map;
        }, {});
      }),
    client.groups.API.getGroupContents(options.namespace, options.assetID)
      .then((response: any) => response.data.entries)
      .then((data: any) => {
        data.sort((a: any, b: any) => a.array.size - b.array.size);
        return data.map((a: any) => a.array.id);
      })
  ]);

  return [groupMetadata, memberUris];
}

function deserializeBuffer(type: string, buffer: Array<number>): any {
  switch (type) {
    case 'STRING_UTF8':
      return String.fromCharCode(...buffer);
    case 'INT64':
      return Number(new BigInt64Array(new Uint8Array(buffer).buffer)[0]);
    default:
      console.error(`Cannot deserialize type '${type}'`);
      return undefined;
  }
}
