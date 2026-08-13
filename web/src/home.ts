// The library's contents — ONE FLAT LIST, derived, never a written-down list.
//
// The library used to be a browsing hierarchy: examples by genus, corpus by
// author, each bucket a page of its own. Genus and tradition are still true of
// every model, but they are FACTS ABOUT A MODEL, not places a model lives —
// so they are carried as tags on the row and offered as a filter, and the page
// opens on the models themselves.
//
// Everything here comes from the same two groupings the gallery has always
// read (groupedExamples / groupedCorpus), so a new `.sl` dropped in
// assets/examples/ or a new corpus tradition landing in assets/corpus/ shows up
// as a row AND lights up its facet with no code change here.
//
// The two areas are different KINDS of thing and the row says so: an example is
// ours, a corpus entry is an author's and carries a citation. The CITATION LINE
// is the separator, and it survives the flattening intact.

import { groupedExamples } from "./examples";
import { groupedCorpus, firstSentence, TRADITIONS, type CorpusEntry } from "./corpus";
import { isRunnable, type Demo } from "./demos";

export const EXAMPLES_NOTE =
  "Models we wrote to show what the language can express.";
export const CORPUS_NOTE =
  "Models transcribed from the founding texts, each carrying its citation.";

/** A fact about a model that used to be a shelf. `genus` is Bunge's kingdom of
 *  concrete systems; `tradition` is the author whose reading a corpus entry
 *  transcribes. Both are derived from the model's own file. */
export interface Tag {
  kind: "genus" | "tradition";
  /** Filter key — the genus name ("Social") or the tradition key ("klir"). */
  id: string;
  label: string;
  /** The author's reading of systems, on a tradition tag. Empty on a genus. */
  note: string;
}

/** One model that ships with the app: an example of ours or a corpus entry of
 *  an author's. The row the library renders. */
export interface ShippedModel {
  key: string;
  name: string;
  description: string;
  tags: Tag[];
  /** Corpus only — the author's source. Absent on an example, and that absence
   *  is what tells the two apart on the page. */
  citation?: string;
  /** #148 sibling-set: models that teach by diff over one fixed composition. */
  set?: string;
  /** The tradition key, for the world hue. Absent on an example — an example is
   *  ours and belongs to no tradition, and the absence is the fact. */
  tradition?: CorpusEntry["tradition"];
  /** Carries dynamics as well as structure. The EXCEPTION, never the rule. */
  runs: boolean;
  /** What opening this row means. The caller picks the seam; nothing here
   *  knows how a model is loaded. */
  open: { kind: "example"; demo: Demo } | { kind: "corpus"; entry: CorpusEntry };
}

function genusTag(genus: string): Tag {
  return { kind: "genus", id: genus, label: genus, note: "" };
}

function traditionTag(key: CorpusEntry["tradition"]): Tag {
  const meta = TRADITIONS.find((t) => t.key === key);
  return { kind: "tradition", id: key, label: meta?.label ?? key, note: meta?.author ?? "" };
}

/** Every model on the standard library's shelves, flattened into one list in
 *  the canonical reading order: examples by genus (Bunge's order), then the
 *  corpus by tradition (the K≅2 ladder), sibling-sets before loose entries. */
export function shippedModels(): ShippedModel[] {
  const rows: ShippedModel[] = [];
  for (const g of groupedExamples()) {
    for (const d of g.entries) {
      rows.push({
        key: d.key,
        name: d.title,
        description: d.blurb,
        tags: [genusTag(g.genus)],
        runs: isRunnable(d),
        open: { kind: "example", demo: d },
      });
    }
  }
  for (const g of groupedCorpus()) {
    const tag = traditionTag(g.tradition);
    const entries = [...g.sets.flatMap((s) => s.entries), ...g.loose];
    for (const e of entries) {
      rows.push({
        key: e.file,
        name: e.title,
        description: firstSentence(e.teaches),
        tags: [tag],
        citation: e.citation,
        set: e.set,
        tradition: e.tradition,
        // A corpus entry ships no run bundle by construction (corpus.ts); a
        // Klir-pinned entry still runs as a DTMC from the canvas (#216), which
        // is a lens fact and not this row's to claim.
        runs: false,
        open: { kind: "corpus", entry: e },
      });
    }
  }
  return rows;
}

/** A tag with how many models carry it — the filter control's contents. Counted
 *  off the same list the page renders, so a facet's number cannot drift from
 *  the rows it narrows to. */
export interface Facet extends Tag {
  count: number;
}

export function facets(rows: ShippedModel[] = shippedModels()): Facet[] {
  const out: Facet[] = [];
  for (const row of rows) {
    for (const tag of row.tags) {
      const seen = out.find((f) => f.kind === tag.kind && f.id === tag.id);
      if (seen) seen.count += 1;
      else out.push({ ...tag, count: 1 });
    }
  }
  return out;
}

/** Does this model carry the selected tag? A null filter selects everything. */
export function matchesFacet(row: ShippedModel, facet: Tag | null): boolean {
  if (!facet) return true;
  return row.tags.some((t) => t.kind === facet.kind && t.id === facet.id);
}

/** Every model on every standard-library shelf. Derived from the list itself. */
export function standardLibraryCount(): number {
  return shippedModels().length;
}
