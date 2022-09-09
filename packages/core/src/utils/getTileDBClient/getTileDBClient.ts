import Client from '@tiledb-inc/tiledb-cloud';

const getTileDBClient = () => {
  let client: Client | undefined;

  return (config?: Client['config']) => {
    if (client) {
      return client;
    }

    client = new Client(config);

    return client;
  };
};

export default getTileDBClient();
