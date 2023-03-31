const deserializeQueryFromKey = (key: string) => {
  const [namespace, arrayName, query] = key.split('/');
  return {
    namespace,
    arrayName,
    query
  };
};

export default deserializeQueryFromKey;
