import { Layout } from '@tiledb-inc/tiledb-cloud/lib/v1';
import { PointCloudBBox } from '../../point-cloud';
import { getQueryDataFromCache, writeToCache } from '../../../utils/cache';
import getTileDBClient from '../../../utils/getTileDBClient';
import stringifyQuery from '../stringifyQuery';

export interface Query {
  layout: Layout;
  ranges: number[][];
  bufferSize: number;
  attributes: string[];
}
export interface LoadPointCloudOptions {
  namespace: string;
  arrayName: string;
  bbox: PointCloudBBox;
  token: string;
  tiledbEnv?: string;
}

export interface PointCloudData {
  X: number[];
  Y: number[];
  Z: number[];
  Red: number[];
  Green: number[];
  Blue: number[];
  Classification?: number[];
  GpsTime?: number[];
}

async function loadPointCloud(
  config: LoadPointCloudOptions
): Promise<PointCloudData> {
  const tiledbClientConfig: Record<string, any> = {};

  tiledbClientConfig.apiKey = config.token;

  if (config.tiledbEnv) {
    tiledbClientConfig.basePath = config.tiledbEnv;
  }

  const query: Query = {
    layout: Layout.RowMajor,
    ranges: [config.bbox.X, config.bbox.Y, config.bbox.Z],
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

  const queryCacheKey = stringifyQuery(
    query,
    config.namespace,
    config.arrayName
  );
  const tiledbClient = getTileDBClient(tiledbClientConfig);
  const dataFromCache = await getQueryDataFromCache(queryCacheKey);

  if (dataFromCache) {
    return dataFromCache;
  }

  const results = await getResultsFromQuery(query, {
    namespace: config.namespace,
    arrayName: config.arrayName,
    tiledbClient
  });

  return results as PointCloudData;
}

const getResultsFromQuery = async (
  query: Query,
  options: {
    namespace: string;
    arrayName: string;
    tiledbClient: ReturnType<typeof getTileDBClient>;
  }
) => {
  const { namespace, arrayName, tiledbClient } = options;
  // Concatenate all results in case of incomplete queries
  const concatenatedResults: Record<string, any> = {};

  for await (const results of tiledbClient.query.ReadQuery(
    namespace,
    arrayName,
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
  const queryCacheKey = stringifyQuery(query, namespace, arrayName);

  await writeToCache(queryCacheKey, concatenatedResults);

  return concatenatedResults;
};

export default loadPointCloud;
