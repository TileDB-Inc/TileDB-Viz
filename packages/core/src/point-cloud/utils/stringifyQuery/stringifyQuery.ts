const stringifyQuery = (code: any, namespace: string, arrayName: string) => {
  return `${namespace}/${arrayName}/${code}`;
};

export default stringifyQuery;
