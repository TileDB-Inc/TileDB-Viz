import Client from '@tiledb-inc/tiledb-cloud';

const getTileDBClient = () => {
  let client: Client | undefined;

  return (config?: Client['config']) => {
    // If there is a client already instatiated with an api key return it
    if (client?.config.apiKey) {
      return client;
    }

    if (config) {
      client = new Client(config);
    }

    return new Client();
  };
};

export default getTileDBClient();
