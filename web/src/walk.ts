// A walk authored outside the app arrives in one gesture (#412).
//
// One `.sl` file may hold several `system` paragraphs, joined by reference.
// Each paragraph is a flat model in its own right (Option B, #89: the
// hierarchy is a relation over flat models, never nested text), and a
// `decomposes "Name"` in one paragraph may omit the `@id` when a paragraph
// named "Name" sits in the same file. Identity never lives in the text: this
// module is the "later tooling" the spec names — it finds the referent by
// name, asks the kernel for an id, stamps both ends, and hands back stamped
// paragraphs the ordinary compile path can take. The store's copy rule
// (save-as clears the id) is untouched, because nothing pasteable carries one.
//
// Pure: no I/O, no store. The App saves the children and opens the root.

/** One `system` paragraph of a walk file, as text. */
export interface Paragraph {
  /** The `system "Name"` the paragraph declares, unquoted. */
  name: string;
  /** Its full text, from its `system` line to the line before the next. */
  text: string;
}

/** A reference one paragraph makes to another by name, with no `@id`. */
interface Unstamped {
  /** Index of the referring paragraph. */
  from: number;
  /** The quoted label after `decomposes`. */
  label: string;
  /** Index of the paragraph the label names, or -1. */
  to: number;
}

export interface SplitWalk {
  paragraphs: Paragraph[];
  /** Index of the paragraph nothing references: the root. */
  root: number;
  unstamped: Unstamped[];
}

const SYSTEM_LINE = /^system\s+"((?:[^"\\]|\\.)*)"/;
const BARE_DECOMPOSES = /\bdecomposes\s+"((?:[^"\\]|\\.)*)"(?!\s*@)/g;
const STAMPED_DECOMPOSES = /\bdecomposes\s+"((?:[^"\\]|\\.)*)"\s*@[1-9A-HJ-NP-Za-km-z]+/g;

/** Is this text a walk — more than one unindented `system` line? A single
 *  paragraph is an ordinary model and takes the ordinary path. */
export function isWalk(text: string): boolean {
  return text.split("\n").filter((l) => SYSTEM_LINE.test(l)).length > 1;
}

/** Split a walk file into paragraphs and find its root and its unstamped
 *  references. Text before the first `system` line (a file comment) belongs
 *  to the first paragraph, so nothing is dropped. */
export function splitWalk(text: string): SplitWalk {
  const lines = text.split("\n");
  const starts: number[] = [];
  lines.forEach((l, i) => {
    if (SYSTEM_LINE.test(l)) starts.push(i);
  });
  const paragraphs: Paragraph[] = starts.map((start, k) => {
    const from = k === 0 ? 0 : start;
    const to = k + 1 < starts.length ? starts[k + 1] : lines.length;
    const name = SYSTEM_LINE.exec(lines[start])![1].replace(/\\(.)/g, "$1");
    return { name, text: lines.slice(from, to).join("\n").replace(/\n*$/, "\n") };
  });
  const referenced = new Set<number>();
  const unstamped: Unstamped[] = [];
  paragraphs.forEach((p, from) => {
    for (const m of p.text.matchAll(BARE_DECOMPOSES)) {
      const label = m[1].replace(/\\(.)/g, "$1");
      const to = resolveByName(paragraphs, from, label);
      if (to >= 0) referenced.add(to);
      unstamped.push({ from, label, to });
    }
    // A reference stamped by hand still marks its target as not-the-root
    // when the target is present by name.
    for (const m of p.text.matchAll(STAMPED_DECOMPOSES)) {
      const to = resolveByName(paragraphs, from, m[1].replace(/\\(.)/g, "$1"));
      if (to >= 0) referenced.add(to);
    }
  });
  const roots = paragraphs.map((_, i) => i).filter((i) => !referenced.has(i));
  // One root by construction of a walk; if several, the first is the root
  // and the others are orphans the caller reports.
  return { paragraphs, root: roots[0] ?? 0, unstamped };
}

export interface StampedWalk {
  /** Every paragraph, text rewritten so each bare reference carries the id
   *  minted for its target. Same order as the split. */
  paragraphs: Paragraph[];
  /** Minted id per paragraph index (absent for the root and for any
   *  paragraph nothing references). */
  ids: Map<number, string>;
  root: number;
  /** Bare references whose label names no paragraph in the file. */
  unresolved: { from: string; label: string }[];
  /** Paragraphs neither root nor referenced: present but unreachable. */
  orphans: string[];
}

/** The paragraph a label names, seen from the referring paragraph. The seam
 *  contract makes a child's system name EQUAL its parent component's name,
 *  so a parent named "Venice" whose component "Venice" decomposes would find
 *  itself by name alone. Never itself, then: the nearest paragraph AFTER the
 *  referrer (a walk reads parent then child), else the nearest before. */
function resolveByName(paragraphs: Paragraph[], from: number, label: string): number {
  for (let i = from + 1; i < paragraphs.length; i++) if (paragraphs[i].name === label) return i;
  for (let i = from - 1; i >= 0; i--) if (paragraphs[i].name === label) return i;
  return -1;
}

/** Stamp a walk: mint one id per referenced paragraph and rewrite every bare
 *  `decomposes "Name"` to `decomposes "Name" @id`. `mint` is the kernel's
 *  minter, injected so this stays pure and testable. */
export function stampWalk(split: SplitWalk, mint: () => string): StampedWalk {
  const ids = new Map<number, string>();
  const unresolved: { from: string; label: string }[] = [];
  for (const u of split.unstamped) {
    if (u.to < 0) {
      unresolved.push({ from: split.paragraphs[u.from].name, label: u.label });
      continue;
    }
    if (!ids.has(u.to)) ids.set(u.to, mint());
  }
  const paragraphs = split.paragraphs.map((p, from) => ({
    name: p.name,
    text: p.text.replace(BARE_DECOMPOSES, (whole, raw: string) => {
      const to = resolveByName(split.paragraphs, from, raw.replace(/\\(.)/g, "$1"));
      const id = to < 0 ? undefined : ids.get(to);
      return id ? `${whole} @${id}` : whole;
    }),
  }));
  const reachable = new Set<number>([split.root, ...ids.keys()]);
  split.paragraphs.forEach((p, from) => {
    for (const m of p.text.matchAll(STAMPED_DECOMPOSES)) {
      const to = resolveByName(split.paragraphs, from, m[1].replace(/\\(.)/g, "$1"));
      if (to >= 0) reachable.add(to);
    }
  });
  const orphans = split.paragraphs.map((p, i) => (reachable.has(i) ? null : p.name)).filter((n): n is string => n !== null);
  return { paragraphs, ids, root: split.root, unresolved, orphans };
}

/** Write a walk out as one file: the root first, then each child, in the
 *  order they were opened; bare references, so the text stays copy-safe
 *  (the inverse of `stampWalk`). `texts` are per-level emits. */
export function joinWalk(texts: string[]): string {
  return texts
    .map((t) => t.replace(STAMPED_DECOMPOSES, (whole) => whole.replace(/\s*@[1-9A-HJ-NP-Za-km-z]+$/, "")))
    .map((t) => t.replace(/\n*$/, "\n"))
    .join("\n");
}
