// The source corpus: author-grounded models a user opens from the gallery.
// Mirrors demos.ts structurally and drops everything run-shaped from it —
// a corpus entry ships no CSV and no manifest, because it does not run.
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
}));

/** The first sentence of `teaches`, for the gallery card's muted line. */
export function firstSentence(s: string): string {
  const cut = s.search(/[.!?](\s|$)/);
  return cut === -1 ? s : s.slice(0, cut + 1);
}
