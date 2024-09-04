import {
  AssetOptions,
  AssetMetadata,
  Dimension,
  AssetEntry,
  RefineStrategy,
  SceneOptions,
  ImageDataContent,
  GeometryDataContent,
  TDBNonEmptyDomain,
  DatasetType
} from '../../types';
import getTileDBClient from '../getTileDBClient';
import {
  BiomedicalAssetMetadata,
  RasterAssetMetadata,
  ImageMetadata,
  ImageLoaderMetadata,
  GeometryMetadata,
  ImageAssetMetadata
} from '../../tile/types';
import {
  GroupContents,
  Datatype,
  ArrayInfo
} from '@tiledb-inc/tiledb-cloud/lib/v1';
import { BoundingInfo, Vector3 } from '@babylonjs/core';
import { GeometryConfig } from '@tiledb-inc/viz-common';
import {
  Feature,
  FeatureType,
  Attribute,
  Domain
} from '@tiledb-inc/viz-common';
import { getQueryDataFromCache, writeToCache } from '../cache';
import proj4 from 'proj4';
import { MathArray, Matrix, matrix, multiply } from 'mathjs';
import { ArraySchema, DomainArray } from '@tiledb-inc/tiledb-cloud/lib/v1';
import { Tile } from '../../tile/model/tile';
import { ImageContent } from '../../tile/model/image/imageContent';
import { GeometryContent } from '../../tile/model/geometry/geometryContent';

const WIDTH_ALIASES = ['X', 'WIDTH', '_X'];
const HEIGHT_ALIASES = ['Y', 'HEIGHT', '_Y'];
const CHANNEL_ALIASES = ['C', 'BANDS'];

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

export function getImageDomain(schema: ArraySchema): {
  width: [number, number];
  height: [number, number];
} {
  // If schema has a WebP compressed attribute last dimension needs special handling
  const filter = schema.attributes
    // @ts-expect-error Filter type does not match the type returned from REST
    .find(x => x.filterPipeline.filters?.some(y => y.type === 'WEBP') ?? false)
    // @ts-expect-error Filter type does not match the type returned from REST
    ?.filterPipeline.filters?.find(z => z.type === 'WEBP');

  if (filter) {
    // When WebP is found the array schema has 2 dimension of which the last one has a 2 dimensions interleaved
    // To determine the length of the interleaved dimension we read the WebP config
    // @ts-expect-error Missing optional webpConfig field
    const channelCount = filter.webpConfig.format < 3 ? 3 : 4;
    const widthChannelDomain = getDomain(schema.domain.dimensions[1].domain);

    return {
      width: [
        widthChannelDomain[0],
        (widthChannelDomain[1] + 1) / channelCount - 1
      ],
      height: getDomain(schema.domain.dimensions[0].domain)
    };
  } else {
    const widthDimension = schema.domain.dimensions.find(x =>
      WIDTH_ALIASES.includes(x.name?.toUpperCase() ?? '')
    );
    const heightDimension = schema.domain.dimensions.find(x =>
      HEIGHT_ALIASES.includes(x.name?.toUpperCase() ?? '')
    );

    if (!widthDimension || !heightDimension) {
      throw new Error('Missing or unknown width or height dimensions');
    }

    return {
      width: getDomain(widthDimension.domain),
      height: getDomain(heightDimension.domain)
    };
  }
}

export async function getImageMetadata(
  options: AssetOptions
): Promise<ImageMetadata> {
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

  const imageMetadata = JSON.parse(
    (assetMetadata as BiomedicalAssetMetadata & RasterAssetMetadata).metadata
  ) as ImageAssetMetadata;
  let schemas: ArraySchema[] | undefined = await getQueryDataFromCache(
    options.groupID ?? options.arrayID ?? '',
    'schemas'
  );

  if (!schemas) {
    schemas = await Promise.all(
      uris.map(x => {
        return client.ArrayApi.getArray(
          options.namespace,
          x,
          'application/json'
        ).then(y => {
          const schema = y.data as ArraySchema;
          schema.uri = x;

          return schema;
        });
      })
    );

    await writeToCache(
      options.groupID ?? options.arrayID ?? '',
      'schemas',
      schemas
    );
  }

  const loaderMetadata: Map<string, ImageLoaderMetadata> = new Map(
    schemas.map(x => {
      return [
        x.uri ?? '',
        {
          schema: x,
          domain: x.domain.dimensions
            .filter(x => {
              return (
                WIDTH_ALIASES.includes(x.name ?? '') ||
                HEIGHT_ALIASES.includes(x.name ?? '') ||
                CHANNEL_ALIASES.includes(x.name ?? '')
              );
            })
            .map(x => {
              const domain = getDomain(x.domain);
              return {
                name: x.name ?? '',
                type: x.type,
                min: domain[0],
                max: domain[1]
              } as Domain;
            }),
          implicitChannel: !x.domain.dimensions.some(y =>
            CHANNEL_ALIASES.includes(y.name ?? '')
          ),
          isWebPCompressed: x.attributes.some(y =>
            // @ts-expect-error Filter type does not match the type returned from REST
            y.filterPipeline.filters?.some(z => z.type === 'WEBP')
          ),
          dimensions: x.domain.dimensions.map(y => y.name ?? '')
        } as ImageLoaderMetadata
      ];
    })
  );

  // All arrays of the image group should have the same attributes
  // so we only need to parse the first one
  const attributes = schemas[0].attributes.map(x => {
    return {
      name: x.name,
      type: x.type,
      visible: false
    } as Attribute;
  });
  attributes[0].visible = true;

  const dimensions = schemas[0].domain.dimensions
    .filter(x => {
      return (
        !WIDTH_ALIASES.includes(x.name ?? '') &&
        !HEIGHT_ALIASES.includes(x.name ?? '') &&
        !CHANNEL_ALIASES.includes(x.name ?? '')
      );
    })
    .map(x => {
      const domain = getDomain(x.domain);
      return {
        name: x.name ?? '',
        type: x.type,
        value: domain[0],
        min: domain[0],
        max: domain[1]
      } as Dimension;
    });

  // Extract the image extends from each array
  const extents = schemas
    .map(x => {
      return getImageDomain(x);
    })
    .sort(
      (
        a: { width: [number, number]; height: [number, number] },
        b: { width: [number, number]; height: [number, number] }
      ) => {
        return a.width[1] - a.width[0] + 1 - (b.width[1] - b.width[0] + 1);
      }
    );

  const tilesetRoot = constructImageTileset(extents, schemas);

  // Scale the transformation matrix to express the conversion
  // from level 0 instead of max level
  const scale = Math.round(
    (extents.at(-1)!.width[1] - extents.at(-1)!.width[0] + 1) /
      (extents[0].width[1] - extents[0].width[0] + 1)
  );

  const channels = new Map(Object.entries(imageMetadata.channels));
  channels.forEach(x =>
    x.forEach(y => {
      y.intensity = y.max;
      y.visible = true;
    })
  );

  let name = '';
  if (options.groupID) {
    name = await client.groups.API.getGroup(
      options.namespace,
      options.groupID
    ).then(x => x.data.name ?? '');
  } else if (options.arrayID) {
    name = await client
      .info(options.namespace, schemas[0].uri ?? '')
      .then(x => x.data.name ?? '');
  }

  return {
    id: options.groupID ?? options.arrayID,
    namespace: options.namespace,
    name: name,
    root: tilesetRoot,
    uris: uris,
    channels: channels,
    attributes: attributes,
    extraDimensions: dimensions,
    crs: getCRS(assetMetadata),
    pixelToCRS: getTransformationMatrix(assetMetadata, scale),
    loaderMetadata: loaderMetadata
  } as ImageMetadata;
}

// export async function getAssetMetadata(
//   options: AssetOptions
// ): Promise<[AssetMetadata, Attribute[], Dimension[], LevelRecord[]]> {
//   const cachedMetadata = await getQueryDataFromCache(
//     options.groupID ?? options.arrayID ?? '',
//     'metadata'
//   );
//   // if (cachedMetadata) {

//   //   const levels = cachedMetadata[3] as LevelRecord[];
//   //   const root = constructImageTileset(levels);

//   //   cachedMetadata[0].root = root;

//   //   return cachedMetadata;
//   // }

//   const client = getTileDBClient({
//     ...(options.token ? { apiKey: options.token } : {}),
//     ...(options.tiledbEnv ? { basePath: options.tiledbEnv } : {})
//   });

//   let assetMetadata: AssetMetadata;
//   let uris: string[];

//   if (options.groupID && options.arrayID) {
//     throw new Error(
//       'Both groupID and arrayID specified. Please select only one asset.'
//     );
//   } else if (options.groupID) {
//     [assetMetadata, uris] = await getGroupMetadata(options);
//   } else if (options.arrayID) {
//     [assetMetadata, uris] = await getArrayMetadata(options);
//   } else {
//     throw new Error('No asset selected.');
//   }

//   const metadataV2 = await getImageMetadata(options);
//   console.log(metadataV2);

//   const arraySchemaResponse = await client.ArrayApi.getArray(
//     // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//     options.namespace,
//     uris[0],
//     'application/json'
//   );

//   const attributes = arraySchemaResponse.data.attributes.map((value, index) => {
//     return {
//       name: value.name,
//       type: value.type as string,
//       visible: index === 0 ? true : false
//     } as Attribute;
//   });

//   let metadata;

//   switch (assetMetadata.dataset_type) {
//     case 'BIOIMG':
//       metadata = getBiomedicalMetadata(
//         assetMetadata as BiomedicalAssetMetadata,
//         attributes,
//         uris
//       );
//       break;
//     case 'RASTER':
//       metadata = getRasterMetadata(
//         assetMetadata as RasterAssetMetadata,
//         attributes,
//         uris
//       );
//       break;
//     default:
//       if ((assetMetadata as any)._gdal) {
//         metadata = getRasterMetadata(
//           assetMetadata as RasterAssetMetadata,
//           attributes,
//           uris
//         );
//         break;
//       }
//       throw new Error(`Unknown dataset type '${assetMetadata.dataset_type}'`);
//   }

//   metadata[0].root = metadataV2.root;
//   await writeToCache(
//     options.groupID ?? options.arrayID ?? '',
//     'metadata',
//     metadata
//   );
//   return metadata;
// }

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

  let arrayMetadata = await getQueryDataFromCache<AssetMetadata>(
    options.arrayID,
    'arrayMetadata'
  );

  if (!arrayMetadata) {
    arrayMetadata = await client.ArrayApi.getArrayMetaDataJson(
      options.namespace,
      options.arrayID
    ).then((response: any) => response.data);

    await writeToCache(options.arrayID, 'arrayMetadata', arrayMetadata);
  }

  return [arrayMetadata!, [options.arrayID]];
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

  // Check if the are cached result for the queries
  let groupMetadata = await getQueryDataFromCache<AssetMetadata>(
    options.groupID,
    'groupMetadata'
  );
  let memberUris = await getQueryDataFromCache<string[]>(
    options.groupID,
    'memberUris'
  );

  if (!groupMetadata || !memberUris) {
    [groupMetadata, memberUris] = await Promise.all([
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

    await writeToCache(options.groupID, 'groupMetadata', groupMetadata);
    await writeToCache(options.groupID, 'memberUris', memberUris);
  }

  return [groupMetadata!, memberUris!];
}

export async function getGeometryMetadata(
  options: AssetOptions,
  config?: GeometryConfig,
  sceneOptions?: SceneOptions
): Promise<GeometryMetadata> {
  const client = getTileDBClient({
    ...(options.token ? { apiKey: options.token } : {}),
    ...(options.tiledbEnv ? { basePath: options.tiledbEnv } : {})
  });

  if (!options.geometryArrayID) {
    throw new Error('Geometry array ID is undefined');
  }

  let arraySchemaResponse = await getQueryDataFromCache<ArraySchema>(
    options.geometryArrayID,
    'arraySchemaResponse'
  );
  let info = await getQueryDataFromCache<ArrayInfo>(
    options.geometryArrayID,
    'info'
  );
  let arrayMetadata = await getQueryDataFromCache<any>(
    options.geometryArrayID,
    'arrayMetadata'
  );

  if (!arraySchemaResponse || !info || !arrayMetadata) {
    [arraySchemaResponse, info, arrayMetadata] = await Promise.all([
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

    await writeToCache(
      options.geometryArrayID,
      'arraySchemaResponse',
      arraySchemaResponse
    );
    await writeToCache(options.geometryArrayID, 'info', info);
    await writeToCache(options.geometryArrayID, 'arrayMetadata', arrayMetadata);
  }

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
            attributes: [{ name: x.name }],
            interleaved: false,
            type: FeatureType.CATEGORICAL
          };
        }

        return undefined;
      })
      .filter(x => x !== undefined) as Feature[])
  );

  const domain = arraySchemaResponse.domain.dimensions.map(x => {
    const dimensionDomain = getDomain(x.domain);
    return {
      name: x.name ?? '',
      type: x.type,
      min: dimensionDomain[0],
      max: dimensionDomain[1]
    } as Domain;
  });

  const widthIndex = domain.findIndex(x => WIDTH_ALIASES.includes(x.name));
  const heightIndex = domain.findIndex(x => HEIGHT_ALIASES.includes(x.name));

  if (widthIndex === -1 || heightIndex === -1) {
    throw new Error('Missing known dimension for geometry array');
  }

  const extents = await client.ArrayApi.getArrayNonEmptyDomainJson(
    options.namespace,
    options.geometryArrayID
  )
    .then(x => x.data as TDBNonEmptyDomain)
    .then(x => {
      if (x.isEmpty) {
        const widthDim = domain[widthIndex];
        const heightDim = domain[heightIndex];
        return [widthDim.min, heightDim.min, widthDim.min, heightDim.min];
      } else {
        const values = Object.values(x.nonEmptyDomain)[0];
        return [
          values[2 * widthIndex],
          values[2 * heightIndex],
          values[2 * widthIndex + 1],
          values[2 * heightIndex + 1]
        ];
      }
    });

  const root = constructGeometryTileset(
    extents,
    options.geometryArrayID,
    sceneOptions?.crs && arrayMetadata['CRS']
      ? proj4(arrayMetadata['CRS'], sceneOptions?.crs)
      : undefined,
    sceneOptions?.transformation
  );

  const enumarations = new Set(
    [...attributes.values()]
      .map(x => x.enumeration)
      .filter(x => x !== undefined) as string[]
  );

  const categories =
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

  const geometryMetadata = {
    name: info.name,
    namespace: options.namespace,
    root: root,
    extent: extents,
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
    attributes,
    categories: categories
  } as GeometryMetadata;

  return geometryMetadata;
}

function constructImageTileset(
  levels: { width: [number, number]; height: [number, number] }[],
  schemas: ArraySchema[]
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

    const downsample = Math.log2(Math.round(levelWidth / baseWidth));
    const TILE_SIZE = ROOT_SIZE / 2 ** downsample;
    const widthDimName = schemas[idx].domain.dimensions.find(x =>
      WIDTH_ALIASES.includes(x.name ?? '')
    );
    const heightDimName = schemas[idx].domain.dimensions.find(x =>
      HEIGHT_ALIASES.includes(x.name ?? '')
    );

    for (let x = 0; x < Math.ceil(levelWidth / 1024); ++x) {
      for (let y = 0; y < Math.ceil(levelHeight / 1024); ++y) {
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
          uri: schemas[idx].uri ?? '',
          region: [
            {
              dimension: widthDimName?.name ?? 'X',
              min: dataOrigin[0],
              max: dataOrigin[0] + dataExtent[0]
            },
            {
              dimension: heightDimName?.name ?? 'Y',
              min: dataOrigin[1],
              max: dataOrigin[1] + dataExtent[1]
            }
          ]
        });
        tile.index = [x, y];
        tile.refineStrategy = RefineStrategy.REPLACE;

        tileDictionary.set(`${idx}-${x}-${y}`, tile);

        if (idx === 0) {
          tile.parent = root;
          root.children.push(tile);
        } else {
          const parentLevelWidth =
            levels[idx - 1].width[1] - levels[idx - 1].width[0] + 1;
          const relativeDownsample = Math.log2(
            Math.round(levelWidth / parentLevelWidth)
          );

          const parent = tileDictionary.get(
            `${idx - 1}-${Math.floor(x / 2 ** relativeDownsample)}-${Math.floor(
              y / 2 ** relativeDownsample
            )}`
          );

          if (!parent) {
            console.log(
              `${idx - 1}-${Math.floor(
                x / 2 ** relativeDownsample
              )}-${Math.floor(y / 2 ** relativeDownsample)} not found`
            );
            continue;
          }

          tile.parent = parent;
          parent.geometricError = errorBase / 2 ** downsample;
          parent.children.push(tile);
        }
      }
    }
  }

  return root;
}

function constructGeometryTileset(
  extent: Array<number>,
  uri: string,
  converter?: proj4.Converter,
  transformation?: Matrix
): Tile<GeometryDataContent, GeometryContent> {
  const root = new Tile<GeometryDataContent, GeometryContent>();
  root.boundingInfo = getBoundingInfo(extent, converter, transformation);

  // Construct child tiles
  // Since no subdivision information exists, subdivide each dimension with a fixed subdivision scheme
  // TODO: Allow user to change subdivision scheme - will cause cache invalidation
  const SUBDIVISIONS = 10;

  // Calculate the tile extent in the native coordinates
  const step = [
    (extent[2] - extent[0]) / SUBDIVISIONS,
    (extent[3] - extent[1]) / SUBDIVISIONS
  ];

  for (let x = 0; x < SUBDIVISIONS; ++x) {
    for (let y = 0; y < SUBDIVISIONS; ++y) {
      const childExtent = [
        extent[0] + x * step[0],
        extent[1] + y * step[1],
        extent[0] + (x + 1) * step[0],
        extent[1] + (y + 1) * step[1]
      ];
      const child = new Tile<GeometryDataContent, GeometryContent>();
      child.boundingInfo = getBoundingInfo(
        childExtent,
        converter,
        transformation
      );
      child.index = [x, y];
      child.parent = root;
      child.refineStrategy = RefineStrategy.ADD;
      child.content.push({
        uri: uri,
        region: [
          {
            dimension: 'X',
            min: childExtent[0],
            max: childExtent[2]
          },
          {
            dimension: 'Y',
            min: childExtent[1],
            max: childExtent[3]
          }
        ]
      });

      root.children.push(child);
    }
  }

  root.geometricError = root.children[0].boundingInfo.boundingSphere.radius;

  return root;
}

function getBoundingInfo(
  extent: number[],
  converter?: proj4.Converter,
  transformation?: Matrix
): BoundingInfo {
  // When contructing the bounding boxes we need all corners because with the transformation between different
  // coordinate system using only two corners can result in invalid bounding boxes

  const corners = [
    [extent[0], extent[1], 0, 1],
    [extent[0], extent[3], 0, 1],
    [extent[2], extent[1], 0, 1],
    [extent[2], extent[3], 0, 1]
  ];

  if (converter) {
    for (const [idx, corner] of corners.entries()) {
      corners[idx] = [...converter.forward(corner.slice(0, 2)), 0, 1];
    }
  }

  if (transformation) {
    for (const [idx, corner] of corners.entries()) {
      corners[idx] = multiply(transformation, corner).toArray() as number[];
    }
  }

  const minPoint = [
    Math.min(...corners.map(x => x[0])),
    Math.min(...corners.map(x => x[2])),
    Math.min(...corners.map(x => -x[1]))
  ];
  const maxPoint = [
    Math.max(...corners.map(x => x[0])),
    Math.max(...corners.map(x => x[2])),
    Math.max(...corners.map(x => -x[1]))
  ];

  return new BoundingInfo(
    Vector3.FromArray(minPoint.slice(0, 3)),
    Vector3.FromArray(maxPoint.slice(0, 3))
  );
}

function deserializeBuffer(type: string, buffer: Array<number>): any {
  switch (type) {
    case Datatype.StringAscii:
      return new TextDecoder('ascii').decode(new Uint8Array(buffer));
    case Datatype.StringUtf8:
      return new TextDecoder('utf-8').decode(new Uint8Array(buffer));
    case Datatype.StringUtf16:
      return new TextDecoder('utf-16').decode(new Uint8Array(buffer));
    case Datatype.Int64:
      return Number(new BigInt64Array(new Uint8Array(buffer).buffer)[0]);
    default:
      console.error(`Cannot deserialize type '${type}'`);
      return undefined;
  }
}

function getDomain(domain: DomainArray): [number, number] {
  for (const values of Object.values(domain)) {
    if (values === undefined) {
      continue;
    }

    return [Number(values[0]), Number(values[1])];
  }

  return [0, 0];
}

function getCRS(assetMetadata: AssetMetadata): string | undefined {
  let crs: string | undefined;

  if (
    (assetMetadata as RasterAssetMetadata)._gdal ||
    assetMetadata.dataset_type?.toLowerCase() === DatasetType.RASTER
  ) {
    const xml = new DOMParser().parseFromString(
      (assetMetadata as RasterAssetMetadata)._gdal ?? '',
      'text/xml'
    );

    crs =
      xml.getElementsByTagName('SRS')[0].childNodes[0].nodeValue ?? undefined;
  }

  return crs;
}

function getTransformationMatrix(
  assetMetadata: AssetMetadata,
  scale: number
): Matrix | undefined {
  let pixelToCRS: Matrix | undefined;

  switch (assetMetadata.dataset_type?.toLowerCase()) {
    case DatasetType.BIOIMG:
      {
        const metadata = JSON.parse(
          (assetMetadata as BiomedicalAssetMetadata).metadata ?? ''
        ) as ImageAssetMetadata;
        const defaultScale = metadata.physicalSizeX ?? 1;

        pixelToCRS = matrix([
          [(metadata.physicalSizeX ?? defaultScale) * scale, 0, 0, 0],
          [0, (metadata.physicalSizeY ?? defaultScale) * scale, 0, 0],
          [0, 0, (metadata.physicalSizeZ ?? defaultScale) * scale, 0],
          [0, 0, 0, 1]
        ] as MathArray);
      }
      break;
    case DatasetType.RASTER:
    default:
      {
        const xml = new DOMParser().parseFromString(
          (assetMetadata as RasterAssetMetadata)._gdal ?? '',
          'text/xml'
        );
        const coefficients =
          xml
            .getElementsByTagName('GeoTransform')[0]
            .childNodes[0].nodeValue?.split(',')
            .map(x => Number(x)) ?? [];

        pixelToCRS = matrix([
          [
            coefficients[1] * scale,
            coefficients[2] * scale,
            0,
            coefficients[0]
          ],
          [
            coefficients[4] * scale,
            coefficients[5] * scale,
            0,
            coefficients[3]
          ],
          [0, 0, coefficients[1] * scale, 0],
          [0, 0, 0, 1]
        ] as MathArray);
      }
      break;
  }

  return pixelToCRS;
}
