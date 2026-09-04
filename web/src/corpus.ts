// The source corpus: author-grounded models a user opens from the gallery.
// Mirrors demos.ts structurally and drops everything run-shaped from it —
// a corpus entry ships no CSV and no manifest, so it has no forced conservation
// run. It does not follow that it does not run (#216): a Klir-pinned entry runs
// as a DTMC straight from the canvas, so all eight Klir entries here are
// runnable without a bundle.
//
// The text carries its own provenance header, which compile_sl discards
// (CanvasModel has no comment field). That is the point: a user who copies an
// entry out of the SL pane carries the citation with the model. The header is
// therefore not queryable from a compiled model, which is why the gallery reads
// this index rather than the models.
import index from "../../assets/corpus/corpus.json";

export interface CorpusEntry {
  file: string; // "klir/students-in-a-course.sl" — the key
  tradition: "klir" | "bunge" | "mobus";
  title: string;
  citation: string;
  teaches: string;
  sl: string; // raw text, header included
  /** #148 sibling-set: models that teach by diff over ONE fixed composition
   *  (Klir's goal-oriented paradigms, Bunge's two-thing structures). Absent =
   *  a standalone entry. The gallery renders a set as one labelled cluster. */
  set?: string;
  /** `false` keeps an entry in the corpus — cited, linted, part of the
   *  formalization's empirical arm — but off the gallery shelf, where another
   *  card already carries its figure. The steel-plant walk carries Fig. 4.14. */
  shelf?: boolean;
}

const files = import.meta.glob("../../assets/corpus/**/*.sl", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function slByFile(file: string): string {
  const key = Object.keys(files).find((k) => k.endsWith(`/${file}`));
  // A missing file is a build-time bug the ship gate should already have caught
  // (it asserts index/directory bijection), so throw rather than degrade.
  if (!key) throw new Error(`corpus entry not found: ${file}`);
  return files[key];
}

export const CORPUS: CorpusEntry[] = index.entries.map((e) => ({
  file: e.file,
  tradition: e.tradition as CorpusEntry["tradition"],
  title: e.title,
  citation: e.citation,
  teaches: e.teaches,
  sl: slByFile(e.file),
  set: (e as { set?: string }).set,
}));

/** Tradition display metadata for the gallery (#148). Order is the K≅2 ladder
 *  reading — Klir (epistemic) → Bunge (ontic) → Mobus (process). */
export const TRADITIONS: { key: CorpusEntry["tradition"]; label: string; author: string }[] = [
  { key: "klir", label: "Klir", author: "epistemic — systems as relations on a set" },
  { key: "bunge", label: "Bunge", author: "ontic — systems as composed, coupled things" },
  { key: "mobus", label: "Mobus", author: "process — systems as work over flows" },
];

/** Group the corpus by tradition, then by sibling-set within it, preserving the
 *  editorial `entries` order. Standalone entries (no `set`) list after the sets.
 *  The shape the gallery renders — flat grid → faceted tree (#148). */
export function groupedCorpus(): {
  tradition: CorpusEntry["tradition"];
  sets: { name: string; entries: CorpusEntry[] }[];
  loose: CorpusEntry[];
}[] {
  return TRADITIONS.map(({ key }) => {
    const inTradition = CORPUS.filter((e) => e.tradition === key);
    const sets: { name: string; entries: CorpusEntry[] }[] = [];
    const loose: CorpusEntry[] = [];
    for (const e of inTradition) {
      if (!e.set) { loose.push(e); continue; }
      const bucket = sets.find((s) => s.name === e.set);
      if (bucket) bucket.entries.push(e);
      else sets.push({ name: e.set, entries: [e] });
    }
    return { tradition: key, sets, loose };
  }).filter((g) => g.sets.length > 0 || g.loose.length > 0);
}

/** The first sentence of `teaches`, for the gallery card's muted line. */
export function firstSentence(s: string): string {
  const cut = s.search(/[.!?](\s|$)/);
  return cut === -1 ? s : s.slice(0, cut + 1);
}
