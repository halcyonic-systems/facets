// "My library" — the user's own saved models, behind ONE interface.
//
// Why this module exists: today a saved model is an IndexedDB record
// (modelStore.ts), because the app runs in a browser tab. bert-lenses is
// heading for a Tauri desktop shell, where a saved model should be a real file
// on disk. The storage backend WILL change. Everything above this module talks
// to `library.*` and never to modelStore directly, so that change is a backend
// swap — implement LibraryBackend over the Tauri fs plugin, call
// setLibraryBackend once at startup — instead of a refactor of every call site.
//
// The verbs are the storage verbs, chosen so a filesystem can serve them all:
// list / load / save / remove, plus rename (a move) and loadByRef (identity
// lookup — a scan today, an index later). Nothing systems-shaped lives here;
// grouping is libraryTree.ts's reading and verdicts are the kernel's.

import type { ArchiveText } from "./kernel";
import {
  saveModel,
  listModelRecords,
  loadModel,
  deleteModel,
  renameModel,
  loadModelByRef,
  type ModelRecord,
} from "./modelStore";

export type { ModelRecord };

export interface LibraryBackend {
  /** Every saved record in full, newest first. */
  list(): Promise<ModelRecord[]>;
  /** The stored archive text for one slot. Throws if the slot is empty. */
  load(name: string): Promise<string>;
  /** Write `json` to `name`, overwriting whatever was there. `from` names the
   *  shipped model the slot descends from, on the save that first makes the
   *  copy; a later save may omit it and the backend carries it forward. */
  save(name: string, json: ArchiveText, from?: string): Promise<void>;
  remove(name: string): Promise<void>;
  /** Move a slot. Refuses a taken target rather than clobbering it. */
  rename(from: string, to: string): Promise<void>;
  /** The archive whose stable base58 id is `id`, or null. */
  loadByRef(id: string): Promise<string | null>;
}

/** Today's backend: the browser-local IndexedDB store. */
export const indexedDbBackend: LibraryBackend = {
  list: listModelRecords,
  load: loadModel,
  save: saveModel,
  remove: deleteModel,
  rename: renameModel,
  loadByRef: loadModelByRef,
};

let backend: LibraryBackend = indexedDbBackend;

/** Swap the storage backend (the Tauri seam; also how tests get a pure one). */
export function setLibraryBackend(next: LibraryBackend): void {
  backend = next;
}

/** The library the app calls. Delegates on every call, so a backend swapped
 *  after mount takes effect immediately. */
export const library: LibraryBackend = {
  list: () => backend.list(),
  load: (name) => backend.load(name),
  save: (name, json, from) => backend.save(name, json, from),
  remove: (name) => backend.remove(name),
  rename: (from, to) => backend.rename(from, to),
  loadByRef: (id) => backend.loadByRef(id),
};

/** An in-memory backend with the same contract — a stand-in for tests and the
 *  shape a filesystem backend copies (same refusals, same ordering). */
export function memoryBackend(): LibraryBackend {
  const slots = new Map<string, ModelRecord>();
  const idOf = (json: string): string | null => {
    try {
      const id = (JSON.parse(json) as { model_id?: unknown }).model_id;
      return typeof id === "string" ? id : null;
    } catch {
      return null;
    }
  };
  return {
    async list() {
      return [...slots.values()].sort((a, b) => b.savedAt - a.savedAt);
    },
    async load(name) {
      const record = slots.get(name);
      if (!record) throw new Error(`no saved model named "${name}"`);
      return record.json;
    },
    async save(name, json, from) {
      const id = idOf(json);
      const lineage = from ?? slots.get(name)?.from;
      slots.set(name, {
        name,
        json,
        savedAt: Date.now(),
        ...(id ? { modelId: id } : {}),
        ...(lineage ? { from: lineage } : {}),
      });
    },
    async remove(name) {
      slots.delete(name);
    },
    async rename(from, to) {
      if (from === to) return;
      if (slots.has(to)) throw new Error(`a model named "${to}" is already saved — pick another name`);
      const record = slots.get(from);
      if (!record) throw new Error(`no saved model named "${from}"`);
      slots.set(to, { ...record, name: to });
      slots.delete(from);
    },
    async loadByRef(id) {
      for (const r of slots.values()) {
        if ((r.modelId ?? idOf(r.json)) === id) return r.json;
      }
      return null;
    },
  };
}
