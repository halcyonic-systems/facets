// ModelRef resolution — the store layer's one answer to "which model is @id?".
// A `decomposes @id` reference names a model by its stable base58 identity;
// this resolves each id to the model's JSON text across BOTH storage backends
// (the IndexedDB library first, then the picked working folder), behind one
// narrow call. No storage detail and no systems knowledge leaks past here:
// identity is decoded by the kernel inside each backend, and judgment on the
// resolved text is the kernel's (`checkDecompositions`). An id that resolves
// nowhere is simply absent from the returned map — the kernel turns that
// absence into a defined, user-visible issue, never a silent drop.

import { type DirHandleLike, readModelFileByRef } from "./fsAccess";
import { loadModelByRef } from "./modelStore";

/** Resolve each referenced model id to its JSON text. `dir` is the session's
 *  working folder, if one is picked; without it only the library is searched. */
export async function resolveModelRefs(
  ids: string[],
  dir: DirHandleLike | null,
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  for (const id of new Set(ids)) {
    const json = (await loadModelByRef(id)) ?? (dir ? await readModelFileByRef(dir, id) : null);
    if (json !== null) resolved[id] = json;
  }
  return resolved;
}
