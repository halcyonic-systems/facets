// The whole library as one file, and back (#457).
//
// A saved model lives in one browser profile; the durable copy is a text file
// the person owns. "Export library" writes every root with its children as one
// multi-paragraph `.sl` — the form Open… already takes (#412, walk.ts) — so
// restoring is the ordinary open gesture in any browser. Two lines carry what
// a walk file does not: a header naming the file as a library export, so the
// importer saves every paragraph and opens nothing, and a `# saved as` comment
// under each `system` line, so a slot renamed away from its system name comes
// back under the name the person gave it. Both are comments to the compiler.
//
// Pure: the emitter is injected (the kernel's `emitSl` in the app), so the
// round trip is testable without wasm. Ids are stripped on the way out by
// `joinWalk`, exactly as Export walk does; Open… mints them again.

import { buildLibraryTree, type LibraryNode, type LibraryRecordLike } from "./libraryTree";
import { joinWalk } from "./walk";

export const LIBRARY_HEADER = "# facets library";
const SAVED_AS = /^# saved as "((?:[^"\\]|\\.)*)"$/m;

const EXPORTED_AT_KEY = "facets.library.exported-at";

function quote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Parent before child at every level, newest first among siblings — the walk
 *  order, which is also the order `resolveByName` reads a reference in. */
function inWalkOrder(roots: LibraryNode[]): LibraryNode[] {
  const out: LibraryNode[] = [];
  const visit = (n: LibraryNode) => {
    out.push(n);
    n.children.forEach(visit);
  };
  roots.forEach(visit);
  return out;
}

/** One paragraph per saved record, the slot name recorded under its `system`
 *  line, the whole joined as a walk under a dated header. A record whose text
 *  the emitter refuses is skipped and named in `skipped`, never silently. */
export function libraryWalk(
  records: LibraryRecordLike[],
  emit: (json: string) => string,
  exportedAt: Date,
): { text: string; count: number; skipped: string[] } {
  const skipped: string[] = [];
  const texts: string[] = [];
  for (const node of inWalkOrder(buildLibraryTree(records))) {
    if (node.json === undefined) {
      skipped.push(node.name);
      continue;
    }
    let sl: string;
    try {
      sl = emit(node.json);
    } catch {
      skipped.push(node.name);
      continue;
    }
    texts.push(sl.replace(/^(system\b[^\n]*\n)/, `$1# saved as ${quote(node.name)}\n`));
  }
  const header = `${LIBRARY_HEADER} · exported ${exportedAt.toISOString().slice(0, 10)} · ${texts.length} model${texts.length === 1 ? "" : "s"}\n\n`;
  return { text: header + joinWalk(texts), count: texts.length, skipped };
}

/** Is this file a library export? Read off its first non-blank line. */
export function isLibraryFile(text: string): boolean {
  const first = text.split("\n").find((l) => l.trim() !== "");
  return first !== undefined && first.startsWith(LIBRARY_HEADER);
}

/** The slot name a paragraph carries, or null for a paragraph without one. */
export function slotName(paragraph: string): string | null {
  const m = SAVED_AS.exec(paragraph);
  return m ? m[1].replace(/\\(.)/g, "$1") : null;
}

/** The filename a library export downloads as. */
export function libraryFilename(exportedAt: Date): string {
  return `facets-library-${exportedAt.toISOString().slice(0, 10)}.sl`;
}

/** When the library was last exported from this browser, or null. A
 *  localStorage stamp: it goes with the site data it describes, which is the
 *  point — a fresh profile has never exported anything. */
export function readExportedAt(): number | null {
  try {
    const raw = localStorage.getItem(EXPORTED_AT_KEY);
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function noteExported(now = Date.now()): void {
  try {
    localStorage.setItem(EXPORTED_AT_KEY, String(now));
  } catch {
    // storage refused: the date simply stays "never"
  }
}
