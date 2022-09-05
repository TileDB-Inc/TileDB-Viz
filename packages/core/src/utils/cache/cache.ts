import { openDB } from 'idb';

const DB_NAME = 'TILEDB_VIZ_CACHE';
const DB_VERSION = 1;
const QUERIES_STORE = 'queryData';

const getCacheDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(QUERIES_STORE, { autoIncrement: true });
    }
  });
};

export const getQueryDataFromCache = async (key: string) => {
  const db = await getCacheDB();
  const value = await db.get(QUERIES_STORE, key);

  return value;
};

export const writeToCache = async (key: string, data: any) => {
  const db = await getCacheDB();

  await db.put(QUERIES_STORE, data, key);
};

export const clearCache = async () => {
  const db = await getCacheDB();

  await db.clear(QUERIES_STORE);
};
