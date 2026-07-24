// A library entry — an example a user opens from the gallery. Two shapes share
// one type (#148): a DYNAMIC entry carries a run bundle (model + CSV + mapping)
// and runs in one click; a STRUCTURAL entry carries only SL text and opens as a
// diagram that does not run. The run bundle is therefore optional. Every entry
// carries a `genus` (Bunge's kingdom-of-genus) so the gallery can group by it.
import type { Manifest } from "./kernel/types";

export interface Demo {
  key: string;
  title: string;
  blurb: string;
  genus: string;
  // Run bundle — present on a dynamic entry, absent on a structural one.
  modelJson?: string;
  csv?: string;
  manifest?: Manifest;
  t?: number;
  // SL text — present on a structural entry, compiled to a diagram on open.
  sl?: string;
}

/** A dynamic entry ships the full run bundle; a structural one does not. */
export function isRunnable(d: Demo): boolean {
  return d.modelJson != null && d.csv != null && d.manifest != null && d.t != null;
}

const bundles = import.meta.glob("../../assets/demos/*.json", { eager: true }) as Record<
  string,
  { default?: unknown } & Record<string, unknown>
>;
const models = import.meta.glob("../../assets/models/demos/*.json", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function modelByName(name: string): string {
  const key = Object.keys(models).find((k) => k.endsWith(`/${name}.json`));
  if (!key) throw new Error(`demo model not found: ${name}`);
  return models[key];
}

export const DEMOS: Demo[] = Object.values(bundles)
  .map((mod) => (mod.default ?? mod) as Record<string, unknown>)
  .map((b) => ({
    key: b.model as string,
    title: b.title as string,
    blurb: b.blurb as string,
    genus: b.genus as string,
    modelJson: modelByName(b.model as string),
    csv: b.csv as string,
    manifest: b.mapping as Manifest,
    t: b.t as number,
  }));
