// The home screen's shelf index — DERIVED, never a written-down list.
//
// A shelf is one door into the standard library: a genus of examples or an
// author of the source corpus. Both counts come from the same grouping the
// shelf page itself renders (groupedExamples / groupedCorpus), so a new `.sl`
// dropped in assets/examples/ or a new corpus tradition landing in
// assets/corpus/ lights up its button with no code change here.
//
// The two areas are different KINDS of thing and the UI says so: an example is
// ours, a corpus entry is an author's and carries a citation. These notes are
// the sentence each shelf leads with.

import { groupedExamples } from "./examples";
import { groupedCorpus, TRADITIONS, type CorpusEntry } from "./corpus";
import type { Demo } from "./demos";

export const EXAMPLES_NOTE =
  "Models we wrote to show what the language can express.";
export const CORPUS_NOTE =
  "Models transcribed from the founding texts, each carrying its citation.";

export interface Shelf {
  area: "examples" | "corpus";
  /** Genus name ("Social") or tradition key ("klir") — the shelf's route id. */
  id: string;
  label: string;
  /** The author's reading of systems, for corpus shelves. Empty on examples. */
  note: string;
  count: number;
}

export function exampleShelves(): Shelf[] {
  return groupedExamples().map((g) => ({
    area: "examples",
    id: g.genus,
    label: g.genus,
    note: "",
    count: g.entries.length,
  }));
}

export function corpusShelves(): Shelf[] {
  return groupedCorpus().map((g) => {
    const meta = TRADITIONS.find((t) => t.key === g.tradition);
    return {
      area: "corpus",
      id: g.tradition,
      label: meta?.label ?? g.tradition,
      note: meta?.author ?? "",
      count: g.sets.reduce((n, s) => n + s.entries.length, 0) + g.loose.length,
    };
  });
}

/** Every model on every standard-library shelf. Derived from the shelves, so it
 *  cannot drift from what the shelf pages list. */
export function standardLibraryCount(): number {
  return [...exampleShelves(), ...corpusShelves()].reduce((n, s) => n + s.count, 0);
}

/** The entries on one example shelf, in the gallery's order. */
export function exampleShelfEntries(genus: string): Demo[] {
  return groupedExamples().find((g) => g.genus === genus)?.entries ?? [];
}

/** One corpus shelf's contents, sibling-sets preserved (#148). */
export function corpusShelfEntries(tradition: string): {
  sets: { name: string; entries: CorpusEntry[] }[];
  loose: CorpusEntry[];
} {
  const group = groupedCorpus().find((g) => g.tradition === tradition);
  return { sets: group?.sets ?? [], loose: group?.loose ?? [] };
}
