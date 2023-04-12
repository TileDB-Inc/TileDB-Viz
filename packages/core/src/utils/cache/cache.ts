import { openDB } from 'idb/with-async-ittr';

const DB_NAME = 'TILEDB_VIZ_CACHE';
let DB_VERSION = 3;
const INDEX_NAME = 'timestamp';

const getCacheDB = async (storeName: string) => {
  /**
   * Get current version of IndexedDB,
   * If objectStore doesn't exist we close the DB
   * and upgrade DB to create the store.
   */
  const db = await openDB(DB_NAME);

  if (db.objectStoreNames.contains(storeName)) {
    return db;
  }
  db.close();

  DB_VERSION = db.version + 1;

  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(storeName, {
        autoIncrement: true
      });
      store.createIndex(INDEX_NAME, '__timestamp');
    }
  });
};

export const getQueryDataFromCache = async (storeName: string, key: number) => {
  const db = await getCacheDB(storeName);

  const value = await db.get(storeName, key);
  return value;
};

export const invalidateKeys = async (storeName: string, bound: number) => {
  const db = await getCacheDB(storeName);
  const tx = db.transaction(storeName, 'readwrite');
  const index = tx.store.index(INDEX_NAME);
  for await (const cursor of index.iterate(
    IDBKeyRange.upperBound(bound, true)
  )) {
    await cursor.delete();
  }
};
// invalidateKeys('TileDB-Inc:autzen-classified', 1681293670742);
export const writeToCache = async (
  storeName: string,
  key: number,
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
