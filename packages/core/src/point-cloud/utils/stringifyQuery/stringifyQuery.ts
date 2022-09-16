import { QueryData } from '@tiledb-inc/tiledb-cloud';

const stringifyQuery = (
  query: QueryData,
  namespace: string,
  arrayName: string
) => {
  return `${namespace}/${arrayName}/${query.ranges}`;
};

export default stringifyQuery;
