// Minimal IndexedDB key/value store. Only ciphertext + KDF params (salt, iterations) are written here.
const DB = "vaultbudget", STORE = "kv";
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE);
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const tx = async (mode, fn) => {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); res(req?.result); };
    t.onerror = t.onabort = () => { db.close(); rej(t.error); };
  });
};
export const kvGet = (k) => tx("readonly", (s) => s.get(k));
export const kvPut = (k, v) => tx("readwrite", (s) => s.put(v, k));
export const kvDel = (k) => tx("readwrite", (s) => s.delete(k));
