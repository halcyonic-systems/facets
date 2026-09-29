// What the 3D view dims. Filtering never removes: a filtered body or flow
// stays in the scene at low opacity so the whole is always in view. Pure, so
// the menu's semantics are testable without a renderer.

import type { Kind } from "../kernel/types";
import type { Scene3D } from "./scene";

export interface ViewFilter {
  /** The selected body: it and its neighbours stay lit. */
  selected: number | null;
  /** Substance kinds to keep, or null for all. */
  kinds: Set<Kind> | null;
  /** Environment things to keep: only flows touching one of them stay lit. */
  envIds: Set<number> | null;
  /** Ports to keep, by `component:env` key: only flows through one stay lit. */
  portKeys: Set<string> | null;
}

export const NO_FILTER: ViewFilter = { selected: null, kinds: null, envIds: null, portKeys: null };

export function filterActive(f: ViewFilter): boolean {
  return f.selected !== null || f.kinds !== null || f.envIds !== null || f.portKeys !== null;
}

export interface Lit {
  entities: Set<number>;
  flows: Set<number>;
}

/** Which bodies and flows stay lit under the filter. With nothing active,
 *  everything. */
export function litUnder(scene: Scene3D, f: ViewFilter): Lit {
  const allE = new Set(scene.entities.map((e) => e.id));
  const allF = new Set(scene.flows.map((x) => x.id));
  if (!filterActive(f)) return { entities: allE, flows: allF };

  const envIds = new Set(scene.entities.filter((e) => e.kind === "source" || e.kind === "sink" || e.kind === "neutral").map((e) => e.id));
  const portOf = new Map<string, string>();
  for (const p of scene.ports) {
    portOf.set(`${p.component}:${p.env}`, p.key);
  }
  const portKeyForFlow = (a: number, b: number): string | undefined =>
    envIds.has(a) && !envIds.has(b) ? portOf.get(`${b}:${a}`) : envIds.has(b) && !envIds.has(a) ? portOf.get(`${a}:${b}`) : undefined;

  const flows = new Set<number>();
  for (const x of scene.flows) {
    if (f.kinds && !f.kinds.has(x.kind)) continue;
    if (f.envIds && !(f.envIds.has(x.a) || f.envIds.has(x.b))) continue;
    if (f.portKeys) {
      const k = portKeyForFlow(x.a, x.b);
      if (!k || !f.portKeys.has(k)) continue;
    }
    if (f.selected !== null && x.a !== f.selected && x.b !== f.selected) continue;
    flows.add(x.id);
  }

  const entities = new Set<number>();
  const touched = new Set<number>();
  for (const x of scene.flows) {
    if (!flows.has(x.id)) continue;
    touched.add(x.a);
    touched.add(x.b);
  }
  const structural = f.kinds !== null || f.envIds !== null || f.portKeys !== null;
  for (const e of scene.entities) {
    if (f.selected !== null) {
      if (e.id === f.selected || touched.has(e.id)) entities.add(e.id);
      continue;
    }
    if (structural) {
      if (touched.has(e.id)) entities.add(e.id);
      continue;
    }
    entities.add(e.id);
  }
  if (f.selected !== null) entities.add(f.selected);
  return { entities, flows };
}
