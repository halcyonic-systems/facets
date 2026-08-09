// The bundled walkthrough shelf: child models that SHIP with the app so a
// gallery example can carry a walkable `decomposes` hierarchy with no setup.
// The steel-plant walkthrough (Mobus ch. 4, Figs. 4.14–4.17) is the first
// resident: its level-0 parent lives in the examples gallery, and the two
// deeper levels sit here as pinned archives (assets/walkthroughs/, each the
// projection of its own `.sl` — held by the kernel's steel_walkthrough gate).
//
// This is the store layer's THIRD backend, and deliberately the last: the
// library and the working folder both outrank it in `resolveModelRefs`, so a
// user who saves an edited child under the same identity shadows the shipped
// copy. Resolution is by stable id, matching the other backends' contract;
// the id is read off each archive's own `model_id` field (the store's own
// encoding, the libraryTree.ts precedent), and a file without one simply
// never resolves. No systems judgment here — seam verdicts stay the kernel's.

const files = import.meta.glob("../../assets/walkthroughs/**/*.json", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

/** id → archive text for a set of bundled files. Exported for tests. */
export function shelfByRef(texts: Iterable<string>): Map<string, string> {
  const byRef = new Map<string, string>();
  for (const text of texts) {
    try {
      const id = (JSON.parse(text) as { model_id?: unknown }).model_id;
      if (typeof id === "string" && !byRef.has(id)) byRef.set(id, text);
    } catch {
      // A malformed bundled file resolves nothing — the kernel's
      // missing-referent issue stays the single, defined failure mode.
    }
  }
  return byRef;
}

const shelf = shelfByRef(Object.values(files));

/** The bundled model whose stable id is `id`, or null. */
export function bundledModelByRef(id: string): string | null {
  return shelf.get(id) ?? null;
}
