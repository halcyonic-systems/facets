// The bundled one-click demos: each is a single unit (model + CSV + mapping)
// loaded together, so a demo runs in one click — no three-file dance. The model
// JSON is imported raw (the kernel takes model text); the bundle carries the CSV
// and a manifest-shaped mapping.
import type { Manifest } from "./kernel/types";

export interface Demo {
  key: string;
  title: string;
  blurb: string;
  modelJson: string;
  csv: string;
  manifest: Manifest;
  t: number;
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
    modelJson: modelByName(b.model as string),
    csv: b.csv as string,
    manifest: b.mapping as Manifest,
    t: b.t as number,
  }));
