import { openDB } from 'idb/with-async-ittr';

const DB_NAME = 'TILEDB_VIZ_CACHE';
let DB_VERSION = 3;
const DATA_MODEL_VERSION = 2;
const INDEX_NAME = 'timestamp';

const getCacheDB = async (storeName: string) => {
  /**
   * Get current version of IndexedDB,
   * If objectStore doesn't exist we close the DB
   * and upgrade DB to create the store.
   */
  const db = await openDB(DB_NAME);

  if (db.objectStoreNames.contains(storeName + '_' + DATA_MODEL_VERSION)) {
    return db;
  }
  db.close();

  DB_VERSION = db.version + 1;

  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      for (let i = 0; i < DATA_MODEL_VERSION; ++i) {
        if (db.objectStoreNames.contains(storeName + '_' + i)) {
          db.deleteObjectStore(storeName + '_' + i);
        }
      }

      const store = db.createObjectStore(storeName + '_' + DATA_MODEL_VERSION, {
        autoIncrement: true
      });
      store.createIndex(INDEX_NAME, '__timestamp');
    }
  });
};

export const initializeCacheDB = async (storeNames: string[]) => {
  let db = await openDB(DB_NAME);
  const missingStoreNames: string[] = [];

  for (const storeName of storeNames) {
    if (!db.objectStoreNames.contains(storeName + '_' + DATA_MODEL_VERSION)) {
      missingStoreNames.push(storeName);
    }
  }

  db.close();

  if (missingStoreNames.length === 0) {
    return;
  }

  DB_VERSION = db.version + 1;

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      for (const storeName of missingStoreNames) {
        for (let i = 0; i < DATA_MODEL_VERSION; ++i) {
          if (db.objectStoreNames.contains(storeName + '_' + i)) {
            db.deleteObjectStore(storeName + '_' + i);
          }
        }

        const store = db.createObjectStore(
          storeName + '_' + DATA_MODEL_VERSION,
          {
            autoIncrement: true
          }
        );
        store.createIndex(INDEX_NAME, '__timestamp');
      }
    }
  });

  db.close();
};

export async function getQueryDataFromCache<T>(
  storeName: string,
  key: string | number
): Promise<T | undefined> {
  return getCacheDB(storeName)
    .then(db => db.get(storeName + '_' + DATA_MODEL_VERSION, key))
    .catch(() => undefined);
}

export async function writeToCache(
  storeName: string,
  key: number | string,
  data: any
) {
  if (data === undefined || data === null) {
    return true;
  }

  return getCacheDB(storeName)
    .then(db => {
      return db.put(
        storeName + '_' + DATA_MODEL_VERSION,
        Object.assign(data, { __timestamp: Date.now() }),
        key
      );
    })
    .then(_ => true)
    .catch(e => {
      console.log(e);
      return false;
    });
}

export const clearCache = async (storeName: string) => {
  const db = await getCacheDB(storeName);

  await db.clear(storeName + '_' + DATA_MODEL_VERSION);
};

export const clearMultiCache = async (storeNames: string[]) => {
  const db = await openDB(DB_NAME);
  const filterObjectStores = storeNames.map(x => `${x}_${DATA_MODEL_VERSION}`);
  await Promise.all(
    Array.from(db.objectStoreNames)
      .filter(x => filterObjectStores.includes(x))
      .map(x => db.clear(x))
  );

  db.close();
};

export const getTileCount = async (storeNames: string[]) => {
  const db = await openDB(DB_NAME);
  const filterObjectStores = storeNames.map(x => `${x}_${DATA_MODEL_VERSION}`);
  const counts = await Promise.all(
    Array.from(db.objectStoreNames)
      .filter(x => filterObjectStores.includes(x))
      .map(x => db.count(x))
  );

  db.close();

  return counts.reduce((partialSum: number, a: number) => partialSum + a, 0);
};
