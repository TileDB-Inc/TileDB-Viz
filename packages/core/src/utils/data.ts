// Copyright 2022 TileDB Inc.
// Licensed under the MIT License.

import { Color4 } from '@babylonjs/core';
import Client from '@tiledb-inc/tiledb-cloud';
import { Layout } from '@tiledb-inc/tiledb-cloud/lib/v1';

export function setPointCloudSwitches(mode: string) {
  let isTime = false;
  let isClass = false;
  let isTopo = false;
  let isGltf = false;

  if (mode === 'time') {
    isTime = true;
  } else if (mode === 'classes') {
    isClass = true;
  } else if (mode === 'topo') {
    isTopo = true;
  } else if (mode === 'gltf') {
    isGltf = true;
  }
  return { isTime, isClass, isTopo, isGltf };
}

export function setSceneColors(colorScheme: string) {
  let backgroundColor: Color4;
  let accentColor: string;
  let secondColor: string;
  let textColor: string;

  backgroundColor = new Color4(0, 24 / 255, 92 / 255, 1);
  accentColor = '#CC0055';
  secondColor = '#C7C7C7';
  textColor = '#F5F7FA';
  if (colorScheme === 'dark') {
    backgroundColor = new Color4(28 / 255, 28 / 255, 28 / 255, 1);
    accentColor = '#C7C7C7';
    secondColor = '#F5F7FA';
    textColor = '#F5F7FA';
  }
  if (colorScheme === 'light') {
    backgroundColor = new Color4(245 / 255, 247 / 255, 250 / 255, 1);
    accentColor = '#352F4D';
    secondColor = '#C7C7C7';
    textColor = '#352F4D';
  }
  return { backgroundColor, accentColor, secondColor, textColor };
}

export async function getPointCloud(values: any) {
  let dataIn: any;
  let data: any;

  if (values.source === 'cloud') {
    const dataUnsorted = await loadPointCloud(values);
    if (values.mode === 'time') {
      dataIn = sortDataArrays(dataUnsorted);
    } else {
      dataIn = dataUnsorted;
    }
  } else {
    dataIn = values.data;
  }

  if (values.show_fraction) {
    data = reduceDataArrays(dataIn, values.show_fraction);
  } else {
    data = dataIn;
  }

  let { xmin, xmax, ymin, ymax, zmin, zmax, rgbMax } = getPointCloudLimits(
    values,
    data
  );

  // shift points to new origin of [0,0,0] with [xmin,ymin,zmin]
  data.X = data.X.map((n: any) => n - xmin);
  data.Y = data.Y.map((n: any) => n - ymin);
  data.Z = data.Z.map((n: any) => n - zmin);
  xmax = xmax - xmin;
  xmin = 0;
  ymax = ymax - ymin;
  ymin = 0;
  zmax = zmax - zmin;
  zmin = 0;

  // shift points with user defined values (optional)
  if (values.point_shift[0]) {
    data.X = data.X.map((n: any) => n + values.point_shift[0]);
    data.Y = data.Y.map((n: any) => n + values.point_shift[1]);
    data.Z = data.Z.map((n: any) => n + values.point_shift[2]);
    xmin = xmin + values.point_shift[0];
    xmax = xmax + values.point_shift[0];
    ymin = ymin + values.point_shift[1];
    ymax = ymax + values.point_shift[1];
    zmin = zmin + values.point_shift[2];
    zmax = zmax + values.point_shift[2];
  }

  return { data, xmin, xmax, ymin, ymax, zmin, zmax, rgbMax };
}

function getPointCloudLimits(values: any, data: any) {
  let xmin: number;
  let xmax: number;
  let ymin: number;
  let ymax: number;
  let zmin: number;
  let zmax: number;
  let rgbMax: number;

  if (values.bbox) {
    if (values.point_shift[0]) {
      xmin = values.bbox.X[0] + values.point_shift[0];
      xmax = values.bbox.X[1] + values.point_shift[0];
      ymin = values.bbox.Y[0] + values.point_shift[1];
      ymax = values.bbox.Y[1] + values.point_shift[1];
      zmin = values.bbox.Z[0] + values.point_shift[2];
      zmax = values.bbox.Z[1] + values.point_shift[2];
    } else {
      xmin = values.bbox.X[0];
      xmax = values.bbox.X[1];
      ymin = values.bbox.Y[0];
      ymax = values.bbox.Y[1];
      zmin = values.bbox.Z[0];
      zmax = values.bbox.Z[1];
    }
  } else {
    xmin = data.X.reduce((accum: number, currentNumber: number) =>
      Math.min(accum, currentNumber)
    );
    xmax = data.X.reduce((accum: number, currentNumber: number) =>
      Math.max(accum, currentNumber)
    );
    ymin = data.Y.reduce((accum: number, currentNumber: number) =>
      Math.min(accum, currentNumber)
    );
    ymax = data.Y.reduce((accum: number, currentNumber: number) =>
      Math.max(accum, currentNumber)
    );
    zmin = data.Z.reduce((accum: number, currentNumber: number) =>
      Math.min(accum, currentNumber)
    );
    zmax = data.Z.reduce((accum: number, currentNumber: number) =>
      Math.max(accum, currentNumber)
    );
  }

  if (values.rgb_max) {
    rgbMax = values.rgb_max;
  } else {
    const redmax = data.Red.reduce((accum: number, currentNumber: number) =>
      Math.max(accum, currentNumber)
    );
    const greenmax = data.Green.reduce((accum: number, currentNumber: number) =>
      Math.max(accum, currentNumber)
    );
    const bluemax = data.Blue.reduce((accum: number, currentNumber: number) =>
      Math.max(accum, currentNumber)
    );
    rgbMax = Math.max(redmax, greenmax, bluemax);
  }
  return { xmin, xmax, ymin, ymax, zmin, zmax, rgbMax };
}

async function loadPointCloud(values: {
  name_space: string;
  array_name: string;
  bbox: { X: number[]; Y: number[]; Z: number[] };
  token: string;
  tiledb_env: string;
}) {
  const config: Record<string, any> = {};

  config.apiKey = values.token;

  if (values.tiledb_env) {
    config.basePath = values.tiledb_env;
  }

  const tiledbClient = new Client(config);

  const query: {
    layout: any;
    ranges: number[][];
    bufferSize: number;
    attributes: any;
  } = {
    layout: Layout.Unordered,
    ranges: [values.bbox.X, values.bbox.Y, values.bbox.Z],
    bufferSize: 150000000000,
    attributes: [
      'X',
      'Y',
      'Z',
      'Red',
      'Green',
      'Blue',
      'GpsTime',
      'Classification'
    ]
  };
  // Concatenate all results in case of incomplete queries
  const concatenatedResults: Record<string, any> = {};

  for await (const results of tiledbClient.query.ReadQuery(
    values.name_space,
    values.array_name,
    query
  )) {
    for (const [attributeKey, attributeValues] of Object.entries(results)) {
      // If attribute key aready exists push attributes to the array
      if (concatenatedResults[attributeKey]) {
        concatenatedResults[attributeKey].push(attributeValues);
      } else {
        // If object key doesn't exist just assign it to the result
        concatenatedResults[attributeKey] = attributeValues;
      }
    }
  }
  return concatenatedResults;
}

function sortDataArrays(data: any) {
  const GpsTime = data.GpsTime;
  const X = data.X;
  const Y = data.Y;
  const Z = data.Z;
  const Red = data.Red;
  const Green = data.Green;
  const Blue = data.Blue;

  const sortedData = sortArrays({ GpsTime, X, Y, Z, Red, Green, Blue });

  return sortedData;
}

function sortArrays(
  arrays: any,
  comparator = (a: number, b: number) => (a < b ? -1 : a > b ? 1 : 0)
) {
  const arrayKeys = Object.keys(arrays);
  const [sortableArray] = Object.values(arrays) as any[];
  const indexes = Object.keys(sortableArray);
  const sortedIndexes = indexes.sort((a, b) =>
    comparator(sortableArray[a], sortableArray[b])
  );

  const sortByIndexes = (array: { [x: string]: any }, sortedIndexes: any[]) =>
    sortedIndexes.map(sortedIndex => array[sortedIndex]);

  if (Array.isArray(arrays)) {
    return arrayKeys.map((arrayIndex: string) =>
      sortByIndexes(arrays[arrayIndex as any], sortedIndexes)
    );
  } else {
    const sortedArrays: any = {};
    arrayKeys.forEach(arrayKey => {
      sortedArrays[arrayKey] = sortByIndexes(
        arrays[arrayKey as any],
        sortedIndexes
      ) as any;
    });
    return sortedArrays;
  }
}

function reduceDataArrays(data: any, show_fraction: number) {
  const GpsTime = data.GpsTime;
  const X = data.X;
  const Y = data.Y;
  const Z = data.Z;
  const Red = data.Red;
  const Green = data.Green;
  const Blue = data.Blue;

  const reducedData = reduceArrays(
    { GpsTime, X, Y, Z, Red, Green, Blue },
    show_fraction
  );

  return reducedData;
}

function reduceArrays(arrays: any, show_fraction: number) {
  const arrayKeys = Object.keys(arrays);
  const reducedArrays: any = {};

  for (const arrayKey of arrayKeys) {
    if (Array.isArray(arrays[arrayKey])) {
      reducedArrays[arrayKey] = arrays[arrayKey].filter(
        (value: any, index: any, Arr: any) => {
          return index % show_fraction === 0;
        }
      );
    }
  }

  return reducedArrays;
}
