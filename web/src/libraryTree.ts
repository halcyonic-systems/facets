// Library grouping (#105, near-term slice): read the decomposition reference
// graph out of the saved records and derive the tree the home screen renders —
// roots are the models referenced by nobody, children nest under the model
// whose `decomposes` reference reaches them. SOI-ness is a READING, not a
// stored property: nothing is stamped, and the grouping derives fresh on every
// list, so a child promoted to its own model of interest simply reads as a
// root the moment nothing references it (deleting a parent has the same
// effect on its children). Pure and storage-free so the reading is testable
// without IndexedDB; the only fields read are the store's own encoding —
// `model_id` and `systems[].child_model`, both canonical base58 strings. No
// systems judgment happens here: seam verdicts stay the kernel's
// (`check_decompositions`); this file only says which saved model currently
// sits under which.

export interface LibraryRecordLike {
  name: string;
  savedAt: number;
  json: string;
  /** The stamped base58 id; absent on legacy records, whose identity is read
   *  from the JSON's own `model_id` field instead (same encoding). */
  modelId?: string;
}

export interface LibraryNode {
  name: string;
  savedAt: number;
  /** How many of this model's `decomposes` references resolve to no saved
   *  record — the library-level echo of the kernel's missing-referent issue. */
  missingReferents: number;
  children: LibraryNode[];
}

/** A node flattened for menu-shaped lists: depth 0 = root. */
export interface LibraryListEntry {
  name: string;
  savedAt: number;
  depth: number;
}

interface ParsedRefs {
  id: string | null;
  refs: string[];
}

// A hand-imported or corrupt record must not break the listing — it reads as a
// plain root with no identity and no references.
function readRefs(json: string): ParsedRefs {
  try {
    const parsed = JSON.parse(json) as {
      model_id?: unknown;
      // The neutral archive keys its elements `things` and carries the child
      // reference as an object (label + id); the legacy WorldModel keys them
      // `systems` and carries the bare id string (#140). Both generations sit
      // in one library, so the listing reads both — a record whose format it
      // could not read would silently flatten its children to roots.
      things?: { child_model?: unknown }[];
      systems?: { child_model?: unknown }[];
    };
    const archived = (Array.isArray(parsed.things) ? parsed.things : []).flatMap((t) => {
      const ref = t?.child_model as { id?: unknown } | undefined;
      return typeof ref?.id === "string" ? [ref.id] : [];
    });
    const legacy = (Array.isArray(parsed.systems) ? parsed.systems : []).flatMap((s) =>
      typeof s?.child_model === "string" ? [s.child_model] : [],
    );
    return {
      id: typeof parsed.model_id === "string" ? parsed.model_id : null,
      refs: [...archived, ...legacy],
    };
  } catch {
    return { id: null, refs: [] };
  }
}

/** The library reading: records → tree of roots, newest first at every level.
 *  A child referenced by two parents appears once, under the newest-saved
 *  referencing parent (reuse rendering is the epic's, not this slice's). A
 *  reference cycle has no root; each member still lists exactly once. */
export function buildLibraryTree(records: LibraryRecordLike[]): LibraryNode[] {
  const ordered = [...records].sort((a, b) => b.savedAt - a.savedAt);

  const byId = new Map<string, string>(); // model id → record name (first wins)
  const parsed = new Map<string, ParsedRefs>(); // record name → its refs
  for (const r of ordered) {
    const p = readRefs(r.json);
    const id = r.modelId ?? p.id;
    parsed.set(r.name, p);
    if (id !== null && id !== undefined && !byId.has(id)) byId.set(id, r.name);
  }

  const parentOf = new Map<string, string>(); // child name → parent name
  const missing = new Map<string, number>(); // parent name → dangling ref count
  for (const r of ordered) {
    for (const ref of parsed.get(r.name)?.refs ?? []) {
      const target = byId.get(ref);
      if (target === undefined) {
        missing.set(r.name, (missing.get(r.name) ?? 0) + 1);
      } else if (target !== r.name && !parentOf.has(target)) {
        parentOf.set(target, r.name);
      }
    }
  }

  const emitted = new Set<string>();
  const node = (r: LibraryRecordLike): LibraryNode => {
    emitted.add(r.name);
    return {
      name: r.name,
      savedAt: r.savedAt,
      missingReferents: missing.get(r.name) ?? 0,
      children: ordered
        .filter((c) => parentOf.get(c.name) === r.name && !emitted.has(c.name))
        .map(node),
    };
  };

  const roots = ordered.filter((r) => !parentOf.has(r.name)).map(node);
  for (const r of ordered) {
    if (!emitted.has(r.name)) roots.push(node(r));
  }
  return roots;
}

/** The tree in list order with depth, for the Switch menu's indented rows. */
export function flattenLibraryTree(roots: LibraryNode[]): LibraryListEntry[] {
  const out: LibraryListEntry[] = [];
  const walk = (n: LibraryNode, depth: number) => {
    out.push({ name: n.name, savedAt: n.savedAt, depth });
    for (const c of n.children) walk(c, depth + 1);
  };
  for (const r of roots) walk(r, 0);
  return out;
}
