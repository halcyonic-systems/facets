// A browser-local model library over IndexedDB — the flag-free counterpart to
// the folder save/load (fsAccess.ts). The File System Access API those helpers
// need is off by default in Brave and absent in Firefox/Safari; IndexedDB is
// everywhere, so this path works in every browser with no feature-gate.
//
// One database, one store keyed by model name (put overwrites same name). Each
// request is wrapped in a Promise so App.tsx sees the same async shape the
// folder helpers expose. Records also carry the model's stable base58 id (read
// via the kernel decoder, #89) so a `decomposes @id` reference resolves by
// identity while the name stays a display label.

import { modelIdentity } from "./kernel";

const DB_NAME = "bert-lenses";
const STORE = "models";

export interface ModelRecord {
  name: string;
  json: string;
  savedAt: number;
  /** The model's stable base58 id, read from the JSON via the kernel decoder at
   *  save time. Absent on records saved before ids existed and on models that
   *  never minted one — `loadModelByRef` decodes those on the fly, and the next
   *  save of the slot backfills this field (put overwrites the whole record). */
  modelId?: string;
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
  const id = identityOf(json);
  if (id) record.modelId = id;
  await withStore("readwrite", (store) => store.put(record));
}

/** Every saved record in full, newest first. The library list parses each
 *  record's JSON at list time to group children under their decomposing
 *  parents (libraryTree.ts) — records number in the tens, so parse-on-list
 *  needs no cache and the store keeps no derived grouping state. */
export async function listModelRecords(): Promise<ModelRecord[]> {
  const records = await withStore<ModelRecord[]>("readonly", (store) => store.getAll());
  return records.sort((a, b) => b.savedAt - a.savedAt);
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

/** Rename a library slot (#116 candidate 3): the SAME record — json, savedAt,
 *  and above all `modelId` — moves under a new key. The store is keyed by name,
 *  so a rename is put-under-new-name + delete-old, issued in ONE readwrite
 *  transaction so they commit or fail together; the record's content is copied
 *  verbatim, which is exactly what save-as deliberately cannot do (save-as
 *  clears the id BY DESIGN — the copy rule). Because `decomposes @id`
 *  references resolve by identity (loadModelByRef), a parent's stamp survives
 *  this rename by construction.
 *
 *  A taken target name is REFUSED, not suffixed: mintLibraryName's collision
 *  suffix is for machine-minted names at door time, but a rename is the user's
 *  explicit choice — silently storing a different name would be a clobber of
 *  intent. The refusal names the conflict so the user can pick again. */
export async function renameModel(from: string, to: string): Promise<void> {
  if (from === to) return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      const clash = store.get(to);
      clash.onsuccess = () => {
        if (clash.result !== undefined) {
          reject(new Error(`a model named "${to}" is already saved — pick another name`));
          tx.abort();
          return;
        }
        const src = store.get(from);
        src.onsuccess = () => {
          const record = src.result as ModelRecord | undefined;
          if (!record) {
            reject(new Error(`no saved model named "${from}"`));
            tx.abort();
            return;
          }
          store.put({ ...record, name: to });
          store.delete(from);
        };
      };
    });
  } finally {
    db.close();
  }
}

/** The stored JSON of the model whose stable id is `id` (base58), or null.
 *  Lookup is by identity — the name is only the display label. Legacy records
 *  without a stamped `modelId` are decoded on the fly. */
export async function loadModelByRef(id: string): Promise<string | null> {
  const records = await withStore<ModelRecord[]>("readonly", (store) => store.getAll());
  for (const r of records) {
    if ((r.modelId ?? identityOf(r.json)) === id) return r.json;
  }
  return null;
}

// A hand-imported or corrupt record must not make every save/resolution throw.
function identityOf(json: string): string | null {
  try {
    return modelIdentity(json);
  } catch {
    return null;
  }
}
