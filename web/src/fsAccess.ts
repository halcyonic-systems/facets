// Folder-based save/load over the File System Access API — the native-file
// bridge the download/import fallbacks stand in for on unsupported browsers.
// The API isn't in this project's TS lib, so the handles are typed structurally
// here (minimal shapes, no dependency) rather than pulling `any` through App.
//
// Every call needs a live user gesture + a permission grant, so this can only
// run interactively (no headless drive).

import { modelIdentity } from "./kernel";
import type { ArchiveText } from "./kernel";

interface FileHandleLike {
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
  getFile(): Promise<{ text(): Promise<string> }>;
}
export interface DirHandleLike {
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileHandleLike>;
  values(): AsyncIterable<{ kind: string; name: string }>;
}

/** The directory picker needs the File System Access API — present in Chrome/Edge,
 *  but Brave disables it by default (fingerprinting surface), so Chromium-ness
 *  alone isn't enough; feature-detect the actual method. */
export function isFolderSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

const ext = (name: string): string => (name.endsWith(".json") ? name : `${name}.json`);

/** Prompt for a working folder. Returns null when the user cancels the picker
 *  (AbortError); any other failure rethrows. */
export async function pickDirectory(): Promise<DirHandleLike | null> {
  try {
    return await (window as unknown as {
      showDirectoryPicker(): Promise<DirHandleLike>;
    }).showDirectoryPicker();
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null;
    throw e;
  }
}

/** Write `text` to `<filename>.json` in the folder, creating/truncating it.
 *  `ArchiveText` for the same reason as `saveModel` (#140, ADR 0004). */
export async function writeModel(
  dir: DirHandleLike,
  filename: string,
  text: ArchiveText,
): Promise<void> {
  const handle = await dir.getFileHandle(ext(filename), { create: true });
  const w = await handle.createWritable();
  await w.write(text);
  await w.close();
}

/** The folder's `.json` entries, sorted — the reopen panel's contents. */
export async function listModelFiles(dir: DirHandleLike): Promise<string[]> {
  const names: string[] = [];
  for await (const entry of dir.values()) {
    if (entry.kind === "file" && entry.name.endsWith(".json")) names.push(entry.name);
  }
  return names.sort();
}

/** Read one model file's text back for `toCanvas`. */
export async function readModelFile(dir: DirHandleLike, name: string): Promise<string> {
  const handle = await dir.getFileHandle(name);
  const file = await handle.getFile();
  return file.text();
}

/** The text of the folder's model whose stable base58 id is `id`, or null.
 *  Filenames are display labels, never keys: every `.json` is read and its
 *  identity decoded by the kernel (no per-folder index to go stale — the
 *  folder's contents can change outside this app between calls). A file that
 *  is not a model simply never matches. */
export async function readModelFileByRef(dir: DirHandleLike, id: string): Promise<string | null> {
  for (const name of await listModelFiles(dir)) {
    const text = await readModelFile(dir, name);
    let fileId: string | null;
    try {
      fileId = modelIdentity(text);
    } catch {
      fileId = null;
    }
    if (fileId === id) return text;
  }
  return null;
}
