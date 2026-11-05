// Minimal IndexedDB wrapper: one store for app JSON, one for uploaded media blobs.

const DB_NAME = 'lifesync';
const DB_VERSION = 1;
const STATE_STORE = 'state';
const MEDIA_STORE = 'media';
const STATE_KEY = 'app';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE);
        if (!db.objectStoreNames.contains(MEDIA_STORE)) db.createObjectStore(MEDIA_STORE);
      };
      req.onsuccess = () => {
        const db = req.result;
        // Let another tab upgrade or delete the database instead of blocking it forever.
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const loadState = () => run<unknown>(STATE_STORE, 'readonly', (s) => s.get(STATE_KEY));
export const saveState = <T>(value: T) => run(STATE_STORE, 'readwrite', (s) => s.put(value, STATE_KEY));

export const putMedia = (id: string, blob: Blob) => run(MEDIA_STORE, 'readwrite', (s) => s.put(blob, id));
export const getMedia = (id: string) => run<Blob | undefined>(MEDIA_STORE, 'readonly', (s) => s.get(id));
export const deleteMedia = (id: string) => run(MEDIA_STORE, 'readwrite', (s) => s.delete(id));
