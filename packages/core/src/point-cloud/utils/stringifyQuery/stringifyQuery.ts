import { Layout } from '@tiledb-inc/tiledb-cloud/lib/v1';

export interface Query {
  layout: Layout;
  ranges: number[][];
  bufferSize: number;
  attributes: string[];
}

const stringifyQuery = (query: Query, namespace: string, arrayName: string) => {
  return `${namespace}/${arrayName}/${query.ranges}`;
};

export default stringifyQuery;
