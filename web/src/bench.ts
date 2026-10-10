// The bench shelf (#472, 2026-10-10): models that exist to test the
// instrument — each exercises one engine word or behaviour with round numbers,
// and each is AFTER a named model in the simulation or applied literature
// (assets/bench/README.md carries the admission test). Data-driven like the
// field shelf: a `.sl` in assets/bench/ is a card, parsed by the examples
// reader; the one line it carries that an example does not is its provenance,
// `# bench · after <source>`, which the card shows.
import { parseExample } from "./examples";
import type { Demo } from "./demos";

const files = import.meta.glob("../../assets/bench/*.sl", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

export interface BenchModel {
  demo: Demo;
  /** The literature model this one is after. */
  after: string;
}

const PROVENANCE_RE = /^\s*#\s*bench\s*·\s*after\s+(.+?)\s*$/;

/** The provenance line, or null when the file carries none. Exported for tests. */
export function parseBenchProvenance(text: string): string | null {
  for (const line of text.split("\n")) {
    const m = PROVENANCE_RE.exec(line);
    if (m) return m[1];
    if (!line.trim().startsWith("#")) break;
  }
  return null;
}

export function parseBenchModel(path: string, text: string): BenchModel | null {
  const after = parseBenchProvenance(text);
  if (!after) return null;
  const demo = parseExample(path, text);
  return { demo: { ...demo, key: demo.key.replace(/^example:/, "bench:") }, after };
}

export const BENCH: BenchModel[] = Object.entries(files)
  .map(([path, text]) => parseBenchModel(path, text))
  .filter((m): m is BenchModel => m !== null)
  .sort((a, b) => a.demo.title.localeCompare(b.demo.title));
