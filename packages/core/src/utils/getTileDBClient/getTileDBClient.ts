import Client from '@tiledb-inc/tiledb-cloud';
import axios from 'axios';

const getTileDBClient = () => {
  let client: Client | undefined;

  return (config?: Client['config']) => {
    if (config) {
      client = new Client(config, axios.create({
        ...axios.defaults,
        // We are using a token to authenticate so we do not need to enable credentials
        withCredentials: false
      }));
    }

    // If there is a client already instatiated with an api key return it
    if (client?.config.apiKey) {
      return client;
    }

    return new Client();
  };
};

export default getTileDBClient();
