/**
 * Offline-first data layer using IndexedDB.
 * Stores jobs, electricians, and a sync queue for pending writes.
 * When offline, writes go to the sync queue. A background cron
 * flushes the queue when the network comes back.
 */

const DB_NAME = 'wirezrus_offline';
const DB_VERSION = 1;

// Store names
const JOBS_STORE = 'jobs';
const ELECTRICIANS_STORE = 'electricians';
const SYNC_QUEUE_STORE = 'syncQueue';
const META_STORE = 'meta';

export interface SyncQueueItem {
  id: string;
  collection: string;
  docId: string;
  operation: 'set' | 'update' | 'delete';
  data?: Record<string, any>;
  timestamp: number;
  retries: number;
}

// ─── Open / Upgrade DB ─────────────────────────────────────────
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(JOBS_STORE)) {
        db.createObjectStore(JOBS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(ELECTRICIANS_STORE)) {
        db.createObjectStore(ELECTRICIANS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id' });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Generic helpers ────────────────────────────────────────────
async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function put<T>(storeName: string, item: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function putAll<T>(storeName: string, items: T[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    items.forEach(item => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteItem(storeName: string, key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Jobs ───────────────────────────────────────────────────────
export const offlineJobs = {
  getAll: () => getAll<any>(JOBS_STORE),
  put: (job: any) => put(JOBS_STORE, job),
  putAll: (jobs: any[]) => putAll(JOBS_STORE, jobs),
  delete: (id: string) => deleteItem(JOBS_STORE, id),
  clear: () => clearStore(JOBS_STORE),
};

// ─── Electricians ───────────────────────────────────────────────
export const offlineElectricians = {
  getAll: () => getAll<any>(ELECTRICIANS_STORE),
  put: (elec: any) => put(ELECTRICIANS_STORE, elec),
  putAll: (elecs: any[]) => putAll(ELECTRICIANS_STORE, elecs),
  clear: () => clearStore(ELECTRICIANS_STORE),
};

// ─── Sync Queue ─────────────────────────────────────────────────
export const syncQueue = {
  getAll: () => getAll<SyncQueueItem>(SYNC_QUEUE_STORE),

  add: (item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>) =>
    put(SYNC_QUEUE_STORE, {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      retries: 0,
    }),

  remove: (id: string) => deleteItem(SYNC_QUEUE_STORE, id),

  updateRetries: async (id: string, retries: number) => {
    const all = await getAll<SyncQueueItem>(SYNC_QUEUE_STORE);
    const item = all.find(i => i.id === id);
    if (item) {
      await put(SYNC_QUEUE_STORE, { ...item, retries });
    }
  },

  clear: () => clearStore(SYNC_QUEUE_STORE),
};

// ─── Meta (last sync time etc.) ─────────────────────────────────
export const offlineMeta = {
  get: async (key: string): Promise<any> => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = () => reject(request.error);
    });
  },
  set: (key: string, value: any) => put(META_STORE, { key, value }),
};
