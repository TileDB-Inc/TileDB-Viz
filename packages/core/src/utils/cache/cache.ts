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

export const getQueryDataFromCache = async (
  storeName: string,
  key: number | string
) => {
  try {
    const db = await getCacheDB(storeName);
    const value = await db.get(storeName + '_' + DATA_MODEL_VERSION, key);
    return value;
  } catch (e) {
    return undefined;
  }
};

export const writeToCache = async (
  storeName: string,
  key: number | string,
  data: any
) => {
  try {
    const db = await getCacheDB(storeName);
    const now = Date.now();
    await db.put(
      storeName + '_' + DATA_MODEL_VERSION,
      Object.assign(data, { __timestamp: now }),
      key
    );
  } catch (e) {
    console.error(e);
  }
};

export const clearCache = async (storeName: string) => {
  const db = await getCacheDB(storeName);

  await db.clear(storeName + '_' + DATA_MODEL_VERSION);
};

// export const clearCache = async (storeNames: string[]) => {
//   const db = await openDB(DB_NAME);
//   const filterObjectStores = storeNames.map(x => `${x}_${DATA_MODEL_VERSION}`);
//   await Promise.all(
//     Array.from(db.objectStoreNames)
//       .filter(x => filterObjectStores.includes(x))
//       .map(x => db.clear(x))
//   );

//   db.close();
// };

export const getTileCount = async (storeNames: string[]) => {
  const db = await openDB(DB_NAME);
  const filterObjectStores = storeNames.map(x => `${x}_${DATA_MODEL_VERSION}`);
  const counts = await Promise.all(
    Array.from(db.objectStoreNames)
      .filter(x => filterObjectStores.includes(x))
      .map(x => db.count(x))
  );

  db.close();

  return counts.reduce((partialSum, a) => partialSum + a, 0);
};
