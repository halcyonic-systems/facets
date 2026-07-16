// A browser-local model library over IndexedDB — the flag-free counterpart to
// the folder save/load (fsAccess.ts). The File System Access API those helpers
// need is off by default in Brave and absent in Firefox/Safari; IndexedDB is
// everywhere, so this path works in every browser with no feature-gate.
//
// One database, one store keyed by model name (put overwrites same name). Each
// request is wrapped in a Promise so App.tsx sees the same async shape the
// folder helpers expose.

const DB_NAME = "bert-lenses";
const STORE = "models";

export interface ModelRecord {
  name: string;
  json: string;
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "name" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Wrap a single store operation in a Promise resolving to the request result.
async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

/** Store `json` under `name`, overwriting any model already saved there. */
export async function saveModel(name: string, json: string): Promise<void> {
  const record: ModelRecord = { name, json, savedAt: Date.now() };
  await withStore("readwrite", (store) => store.put(record));
}

/** Every saved model's name + timestamp, newest first (for the library list). */
export async function listModels(): Promise<{ name: string; savedAt: number }[]> {
  const records = await withStore<ModelRecord[]>("readonly", (store) => store.getAll());
  return records
    .map((r) => ({ name: r.name, savedAt: r.savedAt }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

/** The stored JSON for one model, for `toCanvas`. */
export async function loadModel(name: string): Promise<string> {
  const record = await withStore<ModelRecord | undefined>("readonly", (store) => store.get(name));
  if (!record) throw new Error(`no saved model named "${name}"`);
  return record.json;
}

/** Remove one model from the library. */
export async function deleteModel(name: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(name));
}
