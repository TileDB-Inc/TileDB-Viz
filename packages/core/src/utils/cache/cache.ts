import { openDB } from 'idb/with-async-ittr';

const DB_NAME = 'TILEDB_VIZ_CACHE';
const DB_VERSION = 1;
const QUERIES_STORE = 'queryData';
const INDEX_NAME = 'timestamp';

const getCacheDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(QUERIES_STORE, {
        autoIncrement: true
      });
      store.createIndex(INDEX_NAME, '__timestamp');
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

  await db.put(
    QUERIES_STORE,
    Object.assign(data, { __timestamp: Date.now() }),
    key
  );
};

export const clearCache = async () => {
  const db = await getCacheDB();

  await db.clear(QUERIES_STORE);
};

export const cacheInvalidation = async (ms: number) => {
  const db = await getCacheDB();
  setInterval(async () => {
    const index = db
      .transaction(QUERIES_STORE, 'readwrite')
      .store.index(INDEX_NAME);
    const now = Date.now();
    for await (const cursor of index.iterate(
      IDBKeyRange.upperBound(now - ms)
    )) {
      await cursor.delete();
    }
  }, Math.min(ms, 60000));
};
