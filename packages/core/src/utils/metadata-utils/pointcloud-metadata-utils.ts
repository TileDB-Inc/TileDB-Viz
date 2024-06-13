import { PointConfig, RefineStrategy } from '@tiledb-inc/viz-common';
import {
  AssetOptions,
  PointDataContent,
  SceneOptions,
  TillingScheme
} from '../../types';
import { PointCloudMetadata } from '../../tile';
import getTileDBClient from '../getTileDBClient';
import { deserializeBuffer, get3DTransformedBoundingInfo } from './utils';
import { Vector3 } from '@babylonjs/core';
import { Matrix } from 'mathjs';
import { encode3D } from '@tiledb-inc/viz-common';
import { PointTileContent } from '../../tile/model/point/pointContent';
import { Tile } from '../../tile/model/tile';
import { Attribute } from '@tiledb-inc/viz-common';
import { Domain } from '@tiledb-inc/viz-common';
import { FeatureType } from '@tiledb-inc/viz-common';
import { Feature } from '@tiledb-inc/viz-common';
import proj4 from 'proj4';

export async function getPointCloudMetadata(
  options: AssetOptions,
  config?: PointConfig,
  sceneOptions?: SceneOptions
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
      .then((response: any) => response.data.entries ?? [])
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
            attributes: [{ name: x.name }],
            interleaved: false,
            type: FeatureType.CATEGORICAL
          };
        }

        return undefined;
      })
      .filter(x => x !== undefined) as Feature[])
  );

  if (config?.features) {
    features.push(
      ...(config.features
        .map(x => {
          if (
            !x.attributes.every(y =>
              attributes.find(attr => attr.name === y.name)
            )
          ) {
            console.warn(`Feature ${x.name} references missing attributes`);
            return undefined;
          }

          return x;
        })
        .filter(x => x !== undefined) as Feature[])
    );
  }

  const root = constructPointCloudTileset(
    Vector3.FromArray(bounds, 0),
    Vector3.FromArray(bounds, 3),
    JSON.parse(arrayMetadata['octant-data']),
    uris,
    sceneOptions?.crs && groupMetadata['crs']
      ? proj4(groupMetadata['crs'], sceneOptions.crs)
      : undefined,
    sceneOptions?.transformation
  );

  const metadata: PointCloudMetadata = {
    id: options.pointGroupID,
    root: root,
    name: info.data.name ?? options.pointGroupID,
    attributes: attributes,
    domain: domain,
    features: features,
    categories: new Map<string, string[]>(),
    crs: groupMetadata['crs'],
    idAttribute: attributes.find(
      x => x.name === config?.pickAttribute && (config?.pickable ?? true)
    ),
    loaderMetadata: {}
  };

  //TODO: Query conforming bounds directly from the array

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

  // await writeToCache(options.pointGroupID, 'metadata', metadata);
  return metadata;
}

function constructPointCloudTileset(
  minPoint: Vector3,
  maxPoint: Vector3,
  blocks: { [index: `${number}-${number}-${number}-${number}`]: number },
  uris: string[],
  converter?: proj4.Converter,
  transformation?: Matrix
): Tile<PointDataContent, PointTileContent> {
  const extents = maxPoint.subtract(minPoint);
  const tileDictionary: Map<
    number,
    Tile<PointDataContent, PointTileContent>
  > = new Map();

  console.log(blocks);

  for (const [index, _] of Object.entries(blocks)) {
    //These idices are in a right handed XYZ coordinate system
    const [lod, x, y, z] = index.split('-').map(Number);
    const mortonIndex = encode3D(x, y, z, lod);
    const tileExtents = extents.multiplyByFloats(
      2 ** -lod,
      2 ** -lod,
      2 ** -lod
    );

    const boxMinPoint: [number, number, number] = [
      minPoint.x + x * tileExtents.x,
      minPoint.y + y * tileExtents.y,
      minPoint.z + z * tileExtents.z
    ];
    const boxMaxPoint: [number, number, number] = [
      minPoint.x + (x + 1) * tileExtents.x,
      minPoint.y + (y + 1) * tileExtents.y,
      minPoint.z + (z + 1) * tileExtents.z
    ];

    const tile = new Tile<PointDataContent, PointTileContent>();
    tile.index = [mortonIndex];
    tile.content = [
      {
        uri: uris[lod],
        region: [
          {
            dimension: 'X',
            min: boxMinPoint[0],
            max: boxMaxPoint[0]
          },
          {
            dimension: 'Y',
            min: boxMinPoint[1],
            max: boxMaxPoint[1]
          },
          {
            dimension: 'Z',
            min: boxMinPoint[2],
            max: boxMaxPoint[2]
          }
        ]
      }
    ];
    tile.refineStrategy = RefineStrategy.ADD;
    tile.tillingScheme = TillingScheme.NONE;
    tile.boundingInfo = get3DTransformedBoundingInfo(
      boxMinPoint,
      boxMaxPoint,
      converter,
      transformation
    );

    tile.parent =
      lod === 0
        ? undefined
        : tileDictionary.get(encode3D(x / 2, y / 2, z / 2, lod - 1));
    tile.parent?.children.push(tile);
    if (tile.parent) {
      tile.parent.geometricError = Math.max(
        Math.abs(tileExtents.x),
        Math.abs(tileExtents.z)
      );
    }
    tileDictionary.set(tile.index[0], tile);
  }

  return tileDictionary.get(encode3D(0, 0, 0, 0))!;
}
