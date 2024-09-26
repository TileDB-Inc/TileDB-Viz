import { ArraySchema } from '@tiledb-inc/tiledb-cloud/lib/v1';
import {
  Channel,
  ImageLoaderMetadata,
  ImageMetadata,
  SOMAMultiscaleImageAssetMetadata
} from '../../tile';
import { getQueryDataFromCache, writeToCache } from '../cache';
import { AssetOptions, Dimension, Domain } from '../../types';
import getTileDBClient from '../getTileDBClient';
import {
  constructImageTileset,
  getColor,
  getDomain,
  getImageDomain,
  getNumericLimits
} from './metadata-utils';
import { Attribute, ImageConfig } from '@tiledb-inc/viz-common';
import { MathArray, matrix, Matrix } from 'mathjs';

export async function getSOMAMultiscaleImageMetadata(
  options: AssetOptions,
  metadata: SOMAMultiscaleImageAssetMetadata,
  uris: string[],
  config?: ImageConfig
): Promise<ImageMetadata> {
  const client = getTileDBClient({
    ...(options.token ? { apiKey: options.token } : {}),
    ...(options.tiledbEnv ? { basePath: options.tiledbEnv } : {})
  });

  if (!options.groupID) {
    throw new Error('SOMAMUltiscaleImage should be a group');
  }

  let schemas: ArraySchema[] | undefined = await getQueryDataFromCache(
    options.groupID,
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

    await writeToCache(options.groupID, 'schemas', schemas);
  }

  const aliases: string[] = [
    schemas[0].domain.dimensions[
      metadata.soma_multiscale_image_schema.image_type.indexOf('X')
    ].name ?? '',
    schemas[0].domain.dimensions[
      metadata.soma_multiscale_image_schema.image_type.indexOf('Y')
    ].name ?? '',
    schemas[0].domain.dimensions[
      metadata.soma_multiscale_image_schema.image_type.indexOf('C')
    ].name ?? ''
  ];

  const loaderMetadata: Map<string, ImageLoaderMetadata> = new Map(
    schemas.map(x => {
      return [
        x.uri ?? '',
        {
          schema: x,
          domain: x.domain.dimensions
            .filter(dim => {
              return (
                dim.name === aliases[0] ||
                dim.name === aliases[1] ||
                dim.name === aliases[2]
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
          implicitChannel: !x.domain.dimensions.some(
            dim => dim.name === aliases[2]
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
        (x.name ?? '') !== aliases[0] &&
        (x.name ?? '') !== aliases[1] &&
        (x.name ?? '') !== aliases[2]
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
      return getImageDomain(x, aliases);
    })
    .sort(
      (
        a: { width: [number, number]; height: [number, number] },
        b: { width: [number, number]; height: [number, number] }
      ) => {
        return a.width[1] - a.width[0] + 1 - (b.width[1] - b.width[0] + 1);
      }
    );

  const tilesetRoot = constructImageTileset(extents, schemas, aliases, config);

  // Scale the transformation matrix to express the conversion
  // from level 0 instead of max level
  const scale = Math.round(
    (extents.at(-1)!.width[1] - extents.at(-1)!.width[0] + 1) /
      (extents[0].width[1] - extents[0].width[0] + 1)
  );

  const channelCount =
    metadata.soma_multiscale_image_schema.shape[
      metadata.soma_multiscale_image_schema.image_type.indexOf('C')
    ];

  const channels = new Map(
    schemas[0].attributes.map(attribute => {
      return [
        attribute.name,
        new Array(channelCount).fill(undefined).map<Channel>((_, index) => {
          const { min, max } = getNumericLimits(attribute.type);
          return {
            name: `Channel ${index}`,
            color: getColor(index),
            id: `Channel_${index}`,
            min: min,
            max: max,
            visible: true,
            intensity: max
          };
        })
      ];
    })
  );

  return {
    id: options.groupID,
    namespace: options.namespace,
    name: metadata.soma_multiscale_image_schema.name,
    root: tilesetRoot,
    uris: uris,
    channels: channels,
    attributes: attributes,
    extraDimensions: dimensions,
    crs: undefined,
    pixelToCRS: getTransformationMatrix(metadata, scale),
    loaderMetadata: loaderMetadata
  } as ImageMetadata;
}

function getTransformationMatrix(
  metadata: SOMAMultiscaleImageAssetMetadata,
  scale: number
): Matrix | undefined {
  const defaultScale =
    metadata.soma_coordinate_space.find(x => x.name.toLowerCase() === 'x')
      ?.scale ?? 1;

  return matrix([
    [
      (metadata.soma_coordinate_space.find(x => x.name.toLowerCase() === 'x')
        ?.scale ?? defaultScale) * scale,
      0,
      0,
      0
    ],
    [
      0,
      (metadata.soma_coordinate_space.find(x => x.name.toLowerCase() === 'y')
        ?.scale ?? defaultScale) * scale,
      0,
      0
    ],
    [
      0,
      0,
      (metadata.soma_coordinate_space.find(x => x.name.toLowerCase() === 'z')
        ?.scale ?? defaultScale) * scale,
      0
    ],
    [0, 0, 0, 1]
  ] as MathArray);
}
