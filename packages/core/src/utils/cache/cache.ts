import { openDB } from 'idb/with-async-ittr';

const DB_NAME = 'TILEDB_VIZ_CACHE';
const DB_VERSION = 1;
const INDEX_NAME = 'timestamp';

const getCacheDB = async (storeName: string) => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(storeName, {
        autoIncrement: true
      });
      store.createIndex(INDEX_NAME, '__timestamp');
    }
  });
};

export const getQueryDataFromCache = async (storeName: string, key: string) => {
  const db = await getCacheDB(storeName);
  const value = await db.get(storeName, key);
  return value;
};

export const writeToCache = async (
  storeName: string,
  key: string,
  data: any
) => {
  const db = await getCacheDB(storeName);
  const now = Date.now();
  await db.put(storeName, Object.assign(data, { __timestamp: now }), key);
};

export const clearCache = async (storeName: string) => {
  const db = await getCacheDB(storeName);

  await db.clear(storeName);
};
