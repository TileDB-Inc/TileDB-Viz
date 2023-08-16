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

  console.log('weird');

  const config = {
    apiKey: event.data.token
    //basePath: event.data.basePath
  };

  const queryClient = new client(config);
  const converter = proj4(event.data.geometryCRS, event.data.imageCRS);
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
    bufferSize: 40_000_000,
    attributes: [event.data.attribute]
  };

  const generator = queryClient.query.ReadQuery(
    event.data.namespace,
    event.data.geometryID,
    query
  );

  const wkbs: ArrayBuffer[] = [];

  for await (const result of generator) {
    wkbs.push(...(result as any)[event.data.attribute]);
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

  let positionOffset = 0;

  const positions: number[] = [];
  const indices: number[] = [];

  for (const wkb of wkbs) {
    const entry = wkx.Geometry.parse(NodeBuffer.from(wkb as ArrayBuffer));
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

    positionOffset += (shape.length / 2) * 3;
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
