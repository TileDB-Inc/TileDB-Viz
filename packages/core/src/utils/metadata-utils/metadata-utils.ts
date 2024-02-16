import {
  AssetOptions,
  AssetMetadata,
  Attribute,
  Dimension,
  AssetEntry,
  Feature,
  FeatureType,
  Domain
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
import { GroupContents, Datatype } from '@tiledb-inc/tiledb-cloud/lib/v1';
import { Vector3 } from '@babylonjs/core';
import { GeometryConfig, PointConfig } from '@tiledb-inc/viz-common';
import { GeometryMetadata, PointCloudMetadata } from '@tiledb-inc/viz-common';

export function tileDBUriParser(
  uri: string,
  fallbackNamespace: string
): { namespace: string; id: string } {
  const tokens = uri.split('/');

  if (tokens.length === 1) {
    return { namespace: fallbackNamespace, id: uri };
  }

  if (tokens[0] !== 'tiledb:') {
    throw new Error(`'${uri}' is not a TileDB Uri`);
  }

  return { namespace: tokens[2], id: tokens[3] };
}

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

  const { namespace, id: baseGroup } = tileDBUriParser(
    options.namespace,
    options.baseGroup
  );

  return await client.groups
    .getGroupContents(namespace, baseGroup)
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
              groupID: entry.group?.id ?? ''
            } as AssetEntry;
          }),

        ...value.entries
          .filter((entry, _) => entry.array !== undefined)
          .map(entry => {
            return {
              namespace: entry.array?.namespace ?? '',
              name: entry.array?.name ?? '',
              arrayID: entry.array?.id ?? ''
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

  if (options.groupID && options.arrayID) {
    throw new Error(
      'Both groupID and arrayID specified. Please select only one asset.'
    );
  } else if (options.groupID) {
    [assetMetadata, uris] = await getGroupMetadata(options);
  } else if (options.arrayID) {
    [assetMetadata, uris] = await getArrayMetadata(options);
  } else {
    throw new Error('No asset selected.');
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
}

async function getArrayMetadata(
  options: AssetOptions
): Promise<[AssetMetadata, string[]]> {
  const client = getTileDBClient({
    ...(options.token ? { apiKey: options.token } : {}),
    ...(options.tiledbEnv ? { basePath: options.tiledbEnv } : {})
  });

  if (!options.arrayID) {
    throw new Error('Array ID is undefined');
  }

  const arrayMetadata = await client.ArrayApi.getArrayMetaDataJson(
    options.namespace,
    options.arrayID
  ).then((response: any) => response.data);

  return [arrayMetadata, [options.arrayID]];
}

async function getGroupMetadata(
  options: AssetOptions
): Promise<[AssetMetadata, string[]]> {
  const client = getTileDBClient({
    ...(options.token ? { apiKey: options.token } : {}),
    ...(options.tiledbEnv ? { basePath: options.tiledbEnv } : {})
  });

  if (!options.groupID) {
    throw new Error('Group ID is undefined');
  }

  const [groupMetadata, memberUris] = await Promise.all([
    client.groups.V2API.getGroupMetadata(options.namespace, options.groupID)
      .then((response: any) => response.data.entries)
      .then((data: any) => {
        return data.reduce((map: any, obj: any) => {
          map[obj.key] = deserializeBuffer(obj.type, obj.value);
          return map;
        }, {});
      }),
    client.groups.API.getGroupContents(options.namespace, options.groupID)
      .then((response: any) => response.data.entries)
      .then((data: any) => {
        data.sort((a: any, b: any) => a.array.size - b.array.size);
        return data.map((a: any) => a.array.id);
      })
  ]);

  return [groupMetadata, memberUris];
}

export async function getGeometryMetadata(
  options: AssetOptions,
  config?: GeometryConfig
): Promise<GeometryMetadata> {
  const client = getTileDBClient({
    ...(options.token ? { apiKey: options.token } : {}),
    ...(options.tiledbEnv ? { basePath: options.tiledbEnv } : {})
  });

  if (!options.geometryArrayID) {
    throw new Error('Geometry array ID is undefined');
  }

  const [arraySchemaResponse, info, arrayMetadata] = await Promise.all([
    client.ArrayApi.getArray(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      options.namespace,
      options.geometryArrayID,
      'application/json'
    ).then(x => x.data),
    client.info(options.namespace, options.geometryArrayID).then(x => x.data),
    client.ArrayApi.getArrayMetaDataJson(
      options.namespace,
      options.geometryArrayID
    ).then(x => x.data as any)
  ]);

  const attributes = arraySchemaResponse.attributes.map((value, index) => {
    return {
      name: value.name,
      type: value.type as string,
      visible: index === 0 ? true : false,
      enumeration: value.enumerationName
    } as Attribute;
  });

  const features = [
    {
      name: 'Default',
      attributes: [],
      interleaved: false,
      type: FeatureType.FLAT_COLOR
    } as Feature
  ];
  features.push(
    ...(attributes
      .map(x => {
        if (x.enumeration) {
          return {
            name: x.name,
            attributes: [x.name],
            interleaved: false,
            type: FeatureType.CATEGORICAL
          };
        }

        return undefined;
      })
      .filter(x => x !== undefined) as Feature[])
  );

  const geometryMetadata = {
    name: info.name,
    extent: [
      arrayMetadata['LAYER_EXTENT_MINX'],
      arrayMetadata['LAYER_EXTENT_MINY'],
      arrayMetadata['LAYER_EXTENT_MAXX'],
      arrayMetadata['LAYER_EXTENT_MAXY']
    ],
    type: arrayMetadata['GeometryType'],
    idAttribute: attributes.find(
      x =>
        x.name ===
          (config?.pickAttribute ?? arrayMetadata['FID_ATTRIBUTE_NAME']) &&
        (config?.pickable ?? true)
    ),
    extrudeAttribute: attributes.find(
      x => x.name === config?.extrudeAttribute && (config?.extrude ?? true)
    ),
    geometryAttribute: attributes.find(
      x =>
        x.name ===
        (config?.geometryAttribute ?? arrayMetadata['GEOMETRY_ATTRIBUTE_NAME'])
    ),
    pad: [arrayMetadata['PAD_X'], arrayMetadata['PAD_Y']],
    crs: 'CRS' in arrayMetadata ? arrayMetadata['CRS'] : undefined,
    features: features,
    attributes
  } as GeometryMetadata;

  const enumarations = new Set(
    [...attributes.values()]
      .map(x => x.enumeration)
      .filter(x => x !== undefined) as string[]
  );

  geometryMetadata.categories =
    enumarations.size === 0
      ? new Map()
      : new Map(
          (
            await client.loadEnumerationsRequest(
              options.namespace,
              options.geometryArrayID,
              { enumerations: [...enumarations.values()] }
            )
          ).map(x => {
            return [
              x.name,
              (x.values as any[]).map(x => {
                return x.toString();
              })
            ];
          })
        );

  return geometryMetadata;
}

export async function getPointCloudMetadata(
  options: AssetOptions,
  config?: PointConfig
): Promise<PointCloudMetadata> {
  const client = getTileDBClient({
    ...(options.token ? { apiKey: options.token } : {}),
    ...(options.tiledbEnv ? { basePath: options.tiledbEnv } : {})
  });

  if (!options.pointGroupID) {
    throw new Error('Point group ID is undefined');
  }

  const [info, members, groupMetadata] = await Promise.all([
    client.groups.API.getGroup(options.namespace, options.pointGroupID),
    client.groups.getGroupContents(options.namespace, options.pointGroupID),
    client.groups.V2API.getGroupMetadata(
      options.namespace,
      options.pointGroupID
    )
      .then((response: any) => response.data.entries)
      .then((data: any) => {
        return data.reduce((map: any, obj: any) => {
          map[obj.key] = deserializeBuffer(obj.type, obj.value);
          return map;
        }, {});
      })
  ]);

  const uris =
    members.entries
      ?.filter(x => x.array)
      .sort((a, b) => a.array?.name?.localeCompare(b.array?.name ?? '') ?? 0)
      .map(x => x.array?.id as string) ?? [];

  const [arrayMetadata, arraySchemaResponse] = await Promise.all([
    client.ArrayApi.getArrayMetaDataJson(options.namespace, uris[0]).then(
      (response: any) => response.data
    ),
    client.ArrayApi.getArray(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      options.namespace,
      uris[0],
      'application/json'
    ).then(x => x.data)
  ]);

  const attributes = arraySchemaResponse.attributes.map((value, index) => {
    return {
      name: value.name,
      type: value.type as string,
      visible: index === 0 ? true : false,
      enumeration: value.enumerationName
    } as Attribute;
  });

  const domain: Domain[] = arraySchemaResponse.domain.dimensions.map(value => {
    const extent: number[] = Object.values(value.domain).filter(x => x)[0];
    return {
      name: value.name ?? '',
      type: value.type as string,
      min: extent[0],
      max: extent[1]
    };
  });

  const bounds = Float64Array.from(JSON.parse(arrayMetadata['octree-bounds']));

  const features = [
    {
      name: 'Default',
      attributes: [],
      interleaved: false,
      type: FeatureType.FLAT_COLOR
    } as Feature
  ];
  features.push(
    ...(attributes
      .map(x => {
        if (x.enumeration) {
          return {
            name: x.name,
            attributes: [x.name],
            interleaved: false,
            type: FeatureType.CATEGORICAL
          };
        }

        return undefined;
      })
      .filter(x => x !== undefined) as Feature[])
  );

  const metadata: PointCloudMetadata = {
    groupID: options.pointGroupID,
    minPoint: Vector3.FromArray(bounds, 0),
    maxPoint: Vector3.FromArray(bounds, 3),
    octreeData: JSON.parse(arrayMetadata['octant-data']),
    name: info.data.name ?? options.pointGroupID,
    levels: uris,
    attributes: attributes,
    domain: domain,
    features: features,
    categories: new Map<string, string[]>(),
    crs: groupMetadata['crs'],
    idAttribute: attributes.find(
      x => x.name === config?.pickAttribute && (config?.pickable ?? true)
    )
  };

  if ('octree-bounds-conforming' in arrayMetadata) {
    const boundsConforming = Float64Array.from(
      JSON.parse(arrayMetadata['octree-bounds-conforming'])
    );

    metadata.minPointConforming = Vector3.FromArray(boundsConforming, 0);
    metadata.maxPointConforming = Vector3.FromArray(boundsConforming, 3);
  }

  const enumarations = new Set(
    [...attributes.values()]
      .map(x => x.enumeration)
      .filter(x => x !== undefined) as string[]
  );

  metadata.categories =
    enumarations.size === 0
      ? new Map()
      : new Map(
          (
            await client.loadEnumerationsRequest(options.namespace, uris[0], {
              enumerations: [...enumarations.values()]
            })
          ).map(x => {
            return [
              x.name,
              (x.values as any[]).map(x => {
                return x.toString();
              })
            ];
          })
        );
  return metadata;
}

function deserializeBuffer(type: string, buffer: Array<number>): any {
  switch (type) {
    case Datatype.StringUtf8: {
      let result = '';
      for (let i = 0; i < Math.ceil(buffer.length / 1000); ++i) {
        result += String.fromCharCode(
          ...buffer.slice(i * 1000, Math.min((i + 1) * 1000, buffer.length))
        );
      }
      return result;
    }
    case Datatype.Int64:
      return Number(new BigInt64Array(new Uint8Array(buffer).buffer)[0]);
    default:
      console.error(`Cannot deserialize type '${type}'`);
      return undefined;
  }
}
