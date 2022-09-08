import { openDB } from 'idb/with-async-ittr';
import deserializeQueryFromKey from '../../point-cloud/utils/deserializeQueryFromKey';
import getTileDBClient from '../getTileDBClient';

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
  const { namespace, arrayName } = deserializeQueryFromKey(key);

  checkActivityAndInvalidate(namespace, arrayName);
  return value;
};

export const writeToCache = async (key: string, data: any) => {
  const db = await getCacheDB();
  const now = Date.now();

  await db.put(QUERIES_STORE, Object.assign(data, { __timestamp: now }), key);
};

const checkActivityAndInvalidate = async (
  namespace: string,
  arrayName: string
) => {
  const timestamp = await getLatestWriteActivity(namespace, arrayName);
  if (timestamp) {
    await invalidateCacheBeforeTimestamp(timestamp, namespace, arrayName);
  }
};

const getLatestWriteActivity = async (namespace: string, arrayName: string) => {
  const client = getTileDBClient();
  const response = await client.ArrayApi.arrayActivityLog(namespace, arrayName);
  const activities = response.data;
  const latestWriteActivity = activities.find(
    activity => activity.action === 'query_write'
  );
  if (latestWriteActivity) {
    const eventTimestamp = new Date(latestWriteActivity.event_at as string);
    return Number(eventTimestamp);
  }

  return undefined;
};

const invalidateCacheBeforeTimestamp = async (
  ms: number,
  namespace: string,
  arrayName: string
) => {
  const db = await getCacheDB();

  const index = db
    .transaction(QUERIES_STORE, 'readwrite')
    .store.index(INDEX_NAME);

  for await (const cursor of index.iterate(IDBKeyRange.upperBound(ms))) {
    const entry = deserializeQueryFromKey(cursor.primaryKey);

    if (entry.arrayName === arrayName && entry.namespace === namespace) {
      await cursor.delete();
    }
  }
};

export const clearCache = async () => {
  const db = await getCacheDB();

  await db.clear(QUERIES_STORE);
};
