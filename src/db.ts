import type { StateStorage } from 'zustand/middleware';

let connection: Promise<IDBDatabase> | undefined;
function database() {
  return connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('pocket', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('settings');
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); connection = undefined; };
      resolve(db);
    };
    request.onerror = () => { connection = undefined; reject(request.error); };
  });
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', mode);
    const request = action(tx.objectStore('settings'));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error ?? request.error);
    tx.onabort = () => reject(tx.error ?? new Error('Storage transaction aborted'));
  });
}

export const indexedDBStorage: StateStorage = {
  getItem: async (name) => (await transaction('readonly', store => store.get(name))) ?? null,
  setItem: async (name, value) => {
    try { await transaction('readwrite', store => store.put(value, name)); }
    catch { window.dispatchEvent(new Event('pocket-storage-error')); }
  },
  removeItem: async (name) => { await transaction('readwrite', store => store.delete(name)); },
};
