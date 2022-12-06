//import TileDBClient, { TileDBQuery, QueryData } from '@tiledb-inc/tiledb-cloud';
import { Layout } from '@tiledb-inc/tiledb-cloud/lib/v1';
//import { getQueryDataFromCache, writeToCache } from '../utils/cache';
import getTileDBClient from '../utils/getTileDBClient';
import { TileDBImageVisualizationOptions } from './image';

export async function fetchImageData(
  options: TileDBImageVisualizationOptions,
  dataType: string
) {
  const data = await loadImage(options);

  return data;
}

export async function loadImage(options: TileDBImageVisualizationOptions) {
  const config: Record<string, any> = {};
  //console.log(options);
  config.apiKey = options.token;

  if (options.tiledbEnv) {
    config.basePath = options.tiledbEnv;
  }

  const tiledbClient = getTileDBClient(config);

  const nonEmptyDomain = tiledbClient.ArrayApi.getArrayNonEmptyDomain(
    options.namespace as string,
    options.arrayName as string,
    'content'
  );
  console.log('nonempty domain: ' + nonEmptyDomain);

  const query = {
    layout: Layout.RowMajor,
    //ranges: [[1], [9500, 14000], [9500, 14000]],
    ranges: [
      [1, 1],
      [11000, 12000],
      [11000, 12000]
    ],
    bufferSize: options.bufferSize || 150000000000,
    attributes: ['TDB_VALUES']
    //attributes: ['BANDS', 'X', 'Y', 'TDB_VALUES'] //this gives 1D arrays for all dimensions and attribute
  };
  //console.log(query);

  // Concatenate all results in case of incomplete queries
  const concatenatedResults: Record<string, any> = {};

  for await (const results of tiledbClient.query.ReadQuery(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    options.namespace!,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    options.arrayName!,
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

// Concatenate all results in case of incomplete queries
//const concatenatedResults: Record<string, any> = {};

// const results = tiledbClient.query
//   .ReadQuery(options.namespace as string, options.arrayName as string, query)
// )).then((results) => {return results});

// for await (const results of tiledbClient.query.ReadQuery(
//   options.namespace as string,
//   options.arrayName as string,
//   query
// )) {
//   return results;
// }

// for await (const results of tiledbClient.query.ReadQuery(
//   // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//   options.namespace!,
//   // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//   options.arrayName!,
//   query
// )) {
//   for (const [attributeKey, attributeValues] of Object.entries(results)) {
//     // If attribute key aready exists push attributes to the array
//     if (concatenatedResults[attributeKey]) {
//       concatenatedResults[attributeKey].push(attributeValues);
//     } else {
//       // If object key doesn't exist just assign it to the result
//       concatenatedResults[attributeKey] = attributeValues;
//     }
//   }
// }

//console.log(concatenatedResults);
//return concatenatedResults;

// export async function fetchImageData(options: TileDBImageVisualizationOptions) {
//   const config: Record<string, any> = {};

//   config.apiKey = options.token;

//   if (options.tiledbEnv) {
//     config.basePath = options.tiledbEnv;
//   }
//   const tiledbClient = getTileDBClient(config);
//   console.log(tiledbClient);

//   //let ranges: any = [];
//   //if (options.bbox) {
//   //  ranges = [options.band, options.bbox.X, options.bbox.Y];
//   //}
//   //const ranges = [
//   //  [0, 1],
//   //  [9500, 14000],
//   //  [9500, 14000]
//   //];
//   const query = {
//     layout: Layout.Unordered,
//     bufferSize: options.bufferSize || 150000000000,
//     attributes: ['BANDS', 'X', 'Y', 'TDB_VALUES']
//   };

//   console.log(query);

//   // Concatenate all results in case of incomplete queries
//   const concatenatedResults: Record<string, any> = {};

//   //const queryCacheKey = query.ranges.toString();

//   //const storeName = `${options.namespace}:${options.arrayName}`;

//   //const dataFromCache = await getQueryDataFromCache(storeName, queryCacheKey);

//   //if (dataFromCache) {
//   //  return dataFromCache;
//   //}

//   for await (const results of tiledbClient.query.ReadQuery(
//     // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//     options.namespace!,
//     // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//     options.arrayName!,
//     query
//   )) {
//     for (const [attributeKey, attributeValues] of Object.entries(results)) {
//       // If attribute key aready exists push attributes to the array
//       if (concatenatedResults[attributeKey]) {
//         concatenatedResults[attributeKey].push(attributeValues);
//       } else {
//         // If object key doesn't exist just assign it to the result
//         concatenatedResults[attributeKey] = attributeValues;
//       }
//     }
//   }

//   //await writeToCache(storeName, queryCacheKey, concatenatedResults);

//   return concatenatedResults;
// }
