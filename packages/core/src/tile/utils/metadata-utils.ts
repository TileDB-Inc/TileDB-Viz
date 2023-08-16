import {
  LevelFallback,
  Channel,
  AxesMetadata,
  BiomedicalAssetMetadata,
  RasterAssetMetadata,
  LevelRecord,
  ImageMetadata
} from '../types';

import { Attribute, Dimension } from '../../types';

const rgb = [
  [255, 0, 0, 255],
  [0, 255, 0, 255],
  [0, 0, 255, 255]
];

export function getBiomedicalMetadata(
  biomedicalMetadata: BiomedicalAssetMetadata,
  attributes: Attribute[],
  uris: string[]
): [ImageMetadata, Attribute[], Dimension[], LevelRecord[]] {
  let imageMetadata = {} as ImageMetadata;

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

    imageMetadata = JSON.parse(biomedicalMetadata.metadata) as ImageMetadata;

    imageMetadata.channels = new Map(Object.entries(imageMetadata.channels));
    for (const axis of imageMetadata.axes) {
      axis.axesMapping = new Map(Object.entries(axis.axesMapping));
    }
  }

  imageMetadata.dataset_type = biomedicalMetadata.dataset_type;

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

  imageMetadata.channels.forEach((value: Channel[]) => {
    value.map((item: Channel) => {
      item.intensity = item.max;
      item.color = Object.values(item.color);
      item.visible = true;

      return item;
    });
  });

  return [imageMetadata, attributes, dimensions, levelRecords];
}

export function getRasterMetadata(
  rasterMetadata: RasterAssetMetadata,
  attributes: Attribute[],
  uris: string[]
): [ImageMetadata, Attribute[], Dimension[], LevelRecord[]] {
  if (!rasterMetadata.metadata) {
    throw new Error(
      "Missing required field from asset's metadata. Missing field name: 'metadata'"
    );
  }

  let imageMetadata = JSON.parse(rasterMetadata.metadata) as ImageMetadata;
  for (const axesMetadata of imageMetadata.axes) {
    if ('axesTranslation' in axesMetadata) {
      for (const [key, value] of new Map(
        Object.entries(axesMetadata.axesTranslation ?? {})
      )) {
        rasterMetadata.metadata = rasterMetadata.metadata.replaceAll(
          key,
          value
        );
      }

      imageMetadata = JSON.parse(rasterMetadata.metadata) as ImageMetadata;
    }
  }

  imageMetadata.channels = new Map(Object.entries(imageMetadata.channels));
  for (const axis of imageMetadata.axes) {
    axis.axesMapping = new Map(Object.entries(axis.axesMapping));
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

  imageMetadata.channels.forEach((value: Channel[]) => {
    value.map((item: Channel) => {
      item.intensity = item.max;
      item.color = Object.values(item.color);
      item.visible = true;

      return item;
    });
  });

  const xml = parseXML(rasterMetadata._gdal ?? '');

  imageMetadata.crs =
    xml.getElementsByTagName('SRS')[0].childNodes[0].nodeValue ?? undefined;
  imageMetadata.transformationCoefficients =
    xml
      .getElementsByTagName('GeoTransform')[0]
      .childNodes[0].nodeValue?.split(',')
      .map(x => Number(x)) ?? undefined;

  return [imageMetadata, attributes, dimensions, levelRecords];
}

function parseXML(xmlText: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  return doc;
}
