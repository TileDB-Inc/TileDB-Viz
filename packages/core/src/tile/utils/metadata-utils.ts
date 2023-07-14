import getTileDBClient from '../../utils/getTileDBClient';
import {
  TileDBTileImageOptions,
  Metadata,
  LevelFallback,
  Channel,
  AxesMetadata,
  Attribute,
  AssetMetadata,
  BiomedicalAssetMetadata,
  RasterAssetMetadata,
  LevelRecord,
  Dimension
} from '../types';

const rgb = [
  [255, 0, 0, 255],
  [0, 255, 0, 255],
  [0, 0, 255, 255]
];

export async function getAssetMetadata(
  options: TileDBTileImageOptions
): Promise<[Metadata, Attribute[], Dimension[], LevelRecord[]]> {
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

  const attributes = arraySchemaResponse.data.attributes.map(
    (value: Attribute, index: number) => {
      return {
        name: value.name,
        type: value.type as string,
        visible: false
      } as Attribute;
    }
  );

  switch (assetMetadata.dataset_type) {
    case 'BIOIMG':
      return getBiomedicalMetadata(
        assetMetadata as BiomedicalAssetMetadata,
        attributes,
        uris
      );
    case 'RASTER':
      getRasterMetadata(assetMetadata as RasterAssetMetadata, attributes);
      break;
    default:
      throw new Error(`Unknown dataset type '${assetMetadata.dataset_type}'`);
  }

  return [] as any;
}

async function getArrayMetadata(
  options: TileDBTileImageOptions
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
  options: TileDBTileImageOptions
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

function getBiomedicalMetadata(
  biomedicalMetadata: BiomedicalAssetMetadata,
  attributes: Attribute[],
  uris: string[]
): [Metadata, Attribute[], Dimension[], LevelRecord[]] {
  let imageMetadata = {} as Metadata;

  if (biomedicalMetadata.fmt_version === 1 && !biomedicalMetadata.metadata) {
    // legacy image support
    if (!biomedicalMetadata.levels || !biomedicalMetadata.pixel_depth) {
      throw new Error('Asset is missing required metadata fields');
    }

    const levels = JSON.parse(
      biomedicalMetadata.levels
    ) as Array<LevelFallback>;

    imageMetadata.axes = [];
    imageMetadata.channels = new Map();

    for (const level of levels) {
      const axes = [...level.axes];

      const generated_metadata = {} as AxesMetadata;

      generated_metadata.originalAxes = axes;
      generated_metadata.originalShape = level.shape;
      generated_metadata.storedAxes = axes;
      generated_metadata.storedShape = level.shape;
      generated_metadata.axesMapping = new Map(
        axes.map(axis => [axis, [axis]])
      );

      if (biomedicalMetadata.pixel_depth !== 1) {
        generated_metadata.originalAxes.push('C');
        generated_metadata.originalShape.push(biomedicalMetadata.pixel_depth);
        generated_metadata.storedShape[
          generated_metadata.storedShape.length - 1
        ] *= biomedicalMetadata.pixel_depth;
        generated_metadata.axesMapping.get('X')?.push('C');
      }

      imageMetadata.axes.push(generated_metadata);
    }

    const channel_index = imageMetadata.axes[0].originalAxes.indexOf('C');
    const channel_count = imageMetadata.axes[0].originalShape[channel_index];

    for (const attribute of attributes) {
      imageMetadata.channels.set(attribute.name, []);

      for (let i = 0; i < channel_count && i < 3; ++i) {
        imageMetadata.channels.get(attribute.name)?.push({
          id: `Channel ${i}`,
          name: `Channel ${i}`,
          intensity: 0,
          color: rgb[i],
          visible: true,
          min: 0,
          max: 255
        } as Channel);
      }
    }
  } else {
    if (!biomedicalMetadata.metadata) {
      throw new Error(
        "Missing required field from asset's metadata. Missing field name: 'metadata'"
      );
    }

    imageMetadata = JSON.parse(biomedicalMetadata.metadata) as Metadata;

    imageMetadata.channels = new Map(Object.entries(imageMetadata.channels));
    for (const axis of imageMetadata.axes) {
      axis.axesMapping = new Map(Object.entries(axis.axesMapping));
    }
  }

  for (const axesMetadata of imageMetadata.axes) {
    if (!('axesOffset' in axesMetadata)) {
      axesMetadata.axesOffset = new Array(axesMetadata.storedAxes.length).fill(
        0
      );
    }
  }

  const levelRecords: LevelRecord[] = [];

  // Calculate LevelRecords to determine the right array and downsample level for each zoom level
  let previousLevelWidth = 0;
  let currentZoomLevel = 0;

  for (const axesMetadata of imageMetadata.axes.reverse()) {
    // We check if the 'Axes' field contains the necessary 'X', 'Y' dimensions.
    if (
      !axesMetadata.originalAxes.includes('X') ||
      !axesMetadata.originalAxes.includes('Y')
    ) {
      console.error('The requested group is missing the canonical axes order.');
    }

    const widthIndex = axesMetadata.originalAxes.indexOf('X');

    const width = axesMetadata.originalShape[widthIndex];

    const zoomFactor =
      previousLevelWidth > 0 ? Math.round(width / previousLevelWidth) : 2;
    previousLevelWidth = width;

    const n = Math.log2(zoomFactor);
    if (n !== Math.round(n)) {
      throw new Error('Only power of two zoom factors are supported');
    }

    const levelUri = uris.shift();

    for (const downsample of Array.from({ length: n }, (_, i) =>
      Math.pow(2, i)
    ).reverse()) {
      levelRecords.push({
        id: levelUri,
        zoomLevel: currentZoomLevel,
        downsample: downsample,
        dimensions: axesMetadata.originalShape,
        axes: axesMetadata.originalAxes,
        arrayExtends: axesMetadata.storedShape,
        arrayAxes: axesMetadata.storedAxes,
        arrayOffset: axesMetadata.axesOffset,
        axesMapping: axesMetadata.axesMapping
      } as LevelRecord);

      ++currentZoomLevel;
    }
  }

  const dimensions: Dimension[] = [];
  for (
    let index = 0;
    index < imageMetadata.axes[0].originalAxes.length;
    ++index
  ) {
    if (!['X', 'Y', 'C'].includes(imageMetadata.axes[0].originalAxes[index])) {
      dimensions.push({
        name: imageMetadata.axes[0].originalAxes[index],
        value: 0,
        min: 0,
        max: imageMetadata.axes[0].originalShape[index] - 1
      } as Dimension);
    }
  }

  return [imageMetadata, attributes, dimensions, levelRecords];
}

function getRasterMetadata(
  rasterMetadata: RasterAssetMetadata,
  attributes: Attribute[]
) {
  // TODO
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
