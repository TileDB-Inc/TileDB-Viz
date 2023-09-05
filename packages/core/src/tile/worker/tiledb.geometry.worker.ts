import client from '@tiledb-inc/tiledb-cloud';
import { Layout } from '@tiledb-inc/tiledb-cloud/lib/v2';
import { GeometryMessage } from '../types';
import proj4 from 'proj4';
import { Buffer as NodeBuffer } from 'node-buffer';
import wkx from '@syncpoint/wkx';
import earcut from 'earcut';
import { getQueryDataFromCache, writeToCache } from '../../utils/cache';

self.onmessage = async function (event: MessageEvent<GeometryMessage>) {
  const [x, y] = event.data.index;
  const tileSize = event.data.tileSize;

  const cachedPositions = await getQueryDataFromCache(
    `${event.data.geometryID}_${tileSize}`,
    `${'position'}_${x}_${y}`
  );
  if (cachedPositions) {
    const cachedIndices = await getQueryDataFromCache(
      `${event.data.geometryID}_${tileSize}`,
      `${'indices'}_${x}_${y}`
    );
    self.postMessage(
      {
        positions: cachedPositions,
        indices: cachedIndices
      },
      [cachedPositions.buffer, cachedIndices.buffer] as any
    );

    return;
  }

  const config = {
    apiKey: event.data.token
    //basePath: event.data.basePath
  };

  const queryClient = new client(config);
  const converter = proj4(
    'PROJCS["NZGD2000 / New Zealand Transverse Mercator 2000",GEOGCS["NZGD2000",DATUM["New_Zealand_Geodetic_Datum_2000",SPHEROID["GRS 1980",6378137,298.257222101]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4167"]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",173],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",1600000],PARAMETER["false_northing",10000000],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AUTHORITY["EPSG","2193"]]',
    event.data.imageCRS
  );
  const geotransformCoefficients = event.data.geotransformCoefficients;

  const xPixelLimits = [x * tileSize, (x + 1) * tileSize];
  const yPixelLimits = [y * tileSize, (y + 1) * tileSize];

  const geoXMin =
    geotransformCoefficients[0] +
    geotransformCoefficients[1] * xPixelLimits[0] +
    geotransformCoefficients[2] * yPixelLimits[0];
  const geoYMin =
    geotransformCoefficients[3] +
    geotransformCoefficients[4] * xPixelLimits[0] +
    geotransformCoefficients[5] * yPixelLimits[0];
  const geoXMax =
    geotransformCoefficients[0] +
    geotransformCoefficients[1] * xPixelLimits[1] +
    geotransformCoefficients[2] * yPixelLimits[1];
  const geoYMax =
    geotransformCoefficients[3] +
    geotransformCoefficients[4] * xPixelLimits[1] +
    geotransformCoefficients[5] * yPixelLimits[1];

  const minLimit = converter.inverse([geoXMin, geoYMin]);
  const maxLimit = converter.inverse([geoXMax, geoYMax]);

  const query = {
    layout: Layout.Unordered,
    ranges: [
      [minLimit[0], maxLimit[0]].sort(),
      [minLimit[1], maxLimit[1]].sort()
    ],
    bufferSize: 5_000_000,
    attributes: [event.data.attribute],
    returnRawBuffers: true,
    ignoreOffsets: true,
    returnOffsets: true
  };

  const generator = queryClient.query.ReadQuery(
    event.data.namespace,
    event.data.geometryID,
    query
  );

  const wkbs: ArrayBuffer[] = [];
  const offsets: BigUint64Array[] = [];

  for await (const result of generator) {
    if ((result as any)['__offsets'][event.data.attribute]) {
      wkbs.push((result as any)[event.data.attribute]);
      offsets.push((result as any)['__offsets'][event.data.attribute]);
    }
  }

  if (wkbs.length === 0) {
    await writeToCache(
      `${event.data.geometryID}_${tileSize}`,
      `${'position'}_${x}_${y}`,
      new Float32Array()
    );
    await writeToCache(
      `${event.data.geometryID}_${tileSize}`,
      `${'indices'}_${x}_${y}`,
      new Int32Array()
    );

    self.postMessage({
      positions: [],
      indices: []
    });

    return;
  }

  const positions: number[] = [];
  const indices: number[] = [];
  const faceMapping: number[] = [];

  switch (event.data.type) {
    case 'LineString':
      parseLine(
        wkbs,
        positions,
        indices,
        converter,
        event.data.geotransformCoefficients
      );
      break;
    case 'Polygon':
      for (let index = 0; index < wkbs.length; ++index) {
        parsePolygon(
          wkbs[index],
          offsets[index],
          positions,
          indices,
          faceMapping,
          converter,
          event.data.geotransformCoefficients
        );
      }
      break;
    default:
      console.warn(`Unknown geometry type "${event.data.type}"`);
      self.close();
      return;
  }

  const rawPositions = Float32Array.from(positions);
  const rawIndices = Int32Array.from(indices);

  await writeToCache(
    `${event.data.geometryID}_${tileSize}`,
    `${'position'}_${x}_${y}`,
    rawPositions
  );
  await writeToCache(
    `${event.data.geometryID}_${tileSize}`,
    `${'indices'}_${x}_${y}`,
    rawIndices
  );

  self.postMessage(
    {
      positions: rawPositions,
      indices: rawIndices
    },
    [rawPositions.buffer, rawIndices.buffer] as any
  );
};

function parseLine(
  wkbs: ArrayBuffer[],
  positions: number[],
  indices: number[],
  converter: proj4.Converter,
  geotransformCoefficients: number[]
) {
  const vertexIndex = -1;

  // for (const wkb of wkbs) {
  //   const entry = wkx.Geometry.parse(NodeBuffer.from(wkb as ArrayBuffer));

  //   for (let index = 0; index < entry.points.length; ++index) {
  //     const point = entry.points[index];
  //     // [point.x, point.y] = converter.forward([point.x, point.y]);
  //     [point.x, point.y] = [(point.x - geotransformCoefficients[0]) / geotransformCoefficients[1], (point.y - geotransformCoefficients[3]) / geotransformCoefficients[5]];

  //     positions.push(point.x, 0, point.y);

  //     if (index !== 0)
  //     {
  //       indices.push(vertexIndex, ++vertexIndex);
  //     }
  //     else {
  //       ++vertexIndex;
  //     }
  //   }
  // }
}

function parsePolygon(
  wkbs: ArrayBuffer,
  offsets: BigUint64Array,
  positions: number[],
  indices: number[],
  faceMapping: number[],
  converter: proj4.Converter,
  geotransformCoefficients: number[]
) {
  let positionOffset = positions.length;

  for (const [geometryIndex, offset] of offsets.entries()) {
    const entry = wkx.Geometry.parse(
      NodeBuffer.from(
        wkbs,
        Number(offset),
        geometryIndex === offsets.length - 1
          ? undefined
          : Number(offsets[geometryIndex + 1] - offset)
      )
    );
    const shape: number[] = [];

    for (let index = 0; index < entry.exteriorRing.length; ++index) {
      const point = entry.exteriorRing[index];
      [point.x, point.y] = converter.forward([point.x, point.y]);
      [point.x, point.y] = [
        (point.x - geotransformCoefficients[0]) / geotransformCoefficients[1],
        (point.y - geotransformCoefficients[3]) / geotransformCoefficients[5]
      ];
      shape.push(point.x, point.y);
      positions.push(point.x, 0, point.y);
    }

    const trianglulation = earcut(shape, null, 2);

    indices.push(...trianglulation.map((x: number) => x + positionOffset / 3));
    faceMapping.push(
      ...new Array(trianglulation.length / 3).fill(geometryIndex)
    );

    positionOffset += (shape.length / 2) * 3;
  }
}
