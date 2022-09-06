import { openDB } from 'idb/with-async-ittr';

const DB_NAME = 'TILEDB_VIZ_CACHE';
const DB_VERSION = 1;
const QUERIES_STORE = 'queryData';

const getCacheDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(QUERIES_STORE, {
        autoIncrement: true
      });
    }
  });
};

export const getQueryDataFromCache = async (key: string) => {
  const db = await getCacheDB();
  const value = await db.get(QUERIES_STORE, key);

  return value;
};

export const writeToCache = async (
  key: string,
  data: any,
  cacheInvalidation?: number
) => {
  const db = await getCacheDB();
  const now = Date.now();

  await db.put(QUERIES_STORE, Object.assign(data, { lastUpdated: now }), key);

  if (cacheInvalidation) {
    setTimeout(() => {
      deleteEntry(key, now);
    }, cacheInvalidation);
  }
};

const deleteEntry = async (key: string, timestamp: number) => {
  const db = await getCacheDB();
  const value = await db.get(QUERIES_STORE, key);
  // Make sure that the object was not updated in the meantime
  if (value.lastUpdated === timestamp) {
    await db.delete(QUERIES_STORE, key);
  }
};

export const clearCache = async () => {
  const db = await getCacheDB();

  await db.clear(QUERIES_STORE);
};
