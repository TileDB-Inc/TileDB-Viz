import { Query } from '../loadPointCloud';

const stringifyQuery = (query: Query, namespace: string, arrayName: string) => {
  return `${namespace}/${arrayName}/${query.ranges}`;
};

export default stringifyQuery;
