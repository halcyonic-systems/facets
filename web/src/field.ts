// The field shelf: models drawn with someone, shipped so they can keep going
// (assets/field/README.md). Data-driven like the examples — a `.sl` file in
// assets/field/ is a card, no code change — and parsed by the same reader, so
// title, genus and blurb come from the file's own `system` and `domain` lines.
// The one thing a field model carries that an example does not is its
// provenance line, `# field · with <who> · <date>`, which the card shows.
import { parseExample } from "./examples";
import type { Demo } from "./demos";

const files = import.meta.glob("../../assets/field/*.sl", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

export interface FieldModel {
  demo: Demo;
  with: string;
  date: string;
}

const PROVENANCE_RE = /^\s*#\s*field\s*·\s*with\s+(.+?)\s*·\s*(\d{4}-\d{2}-\d{2})\s*$/;

/** The provenance line, or null when the file carries none. Exported for tests. */
export function parseProvenance(text: string): { with: string; date: string } | null {
  for (const line of text.split("\n")) {
    const m = PROVENANCE_RE.exec(line);
    if (m) return { with: m[1], date: m[2] };
    if (!line.trim().startsWith("#")) break;
  }
  return null;
}

/** Build the shelf from one file's text; null when it carries no provenance. */
export function parseFieldModel(path: string, text: string): FieldModel | null {
  const prov = parseProvenance(text);
  if (!prov) return null;
  const demo = parseExample(path, text);
  return { demo: { ...demo, key: demo.key.replace(/^example:/, "field:") }, ...prov };
}

export const FIELD: FieldModel[] = Object.entries(files)
  .map(([path, text]) => parseFieldModel(path, text))
  .filter((m): m is FieldModel => m !== null)
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.demo.title.localeCompare(b.demo.title)));
