import Client from '@tiledb-inc/tiledb-cloud';
import { Layout } from '@tiledb-inc/tiledb-cloud/lib/v1';

export interface LoadPointCloudOptions {
  namespace: string;
  arrayName: string;
  bbox: { X: number[]; Y: number[]; Z: number[] };
  token: string;
  tiledbEnv?: string;
}

async function loadPointCloud(values: LoadPointCloudOptions) {
  const config: Record<string, any> = {};

  config.apiKey = values.token;

  if (values.tiledbEnv) {
    config.basePath = values.tiledbEnv;
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
    values.namespace,
    values.arrayName,
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

export default loadPointCloud;
