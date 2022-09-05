import Client from '@tiledb-inc/tiledb-cloud';
import { Layout } from '@tiledb-inc/tiledb-cloud/lib/v1';
import { PointCloudBBox } from '../../point-cloud';
import { getQueryDataFromCache, writeToCache } from '../../../utils/cache';
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

async function loadPointCloud(values: LoadPointCloudOptions) {
  const config: Record<string, any> = {};

  config.apiKey = values.token;

  if (values.tiledbEnv) {
    config.basePath = values.tiledbEnv;
  }

  const query: Query = {
    layout: Layout.RowMajor,
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

  const queryCacheKey = stringifyQuery(
    query,
    values.namespace,
    values.arrayName
  );

  const dataFromCache = await getQueryDataFromCache(queryCacheKey);

  if (dataFromCache) {
    /**
     * Don't wait for results, instead return data from cache
     */
    setTimeout(() => {
      getResultsFromQuery(query, {
        namespace: values.namespace,
        arrayName: values.arrayName,
        config
      });
    }, 0);

    return dataFromCache;
  }

  const results = await getResultsFromQuery(query, {
    namespace: values.namespace,
    arrayName: values.arrayName,
    config
  });

  return results;
}

const getResultsFromQuery = async (
  query: Query,
  options: {
    namespace: string;
    arrayName: string;
    config: Record<string, unknown>;
  }
) => {
  const { namespace, arrayName, config } = options;
  const tiledbClient = new Client(config);
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
