// facets#384: the boundary flows a walked-in child is still waiting on. Pure
// reads over the canvas model, shared by the drawing (Canvas), the inspector
// (ModelAbout) and the interior drafter (interior.ts) so all three count the
// same thing — and mirrors `Crossing::taken_by` in canvas.rs, which is the
// rule `project` applies when it writes a crossing back onto the root.
import type { CanvasModel, Crossing } from "../kernel/types";

/** The crossings no interface has taken: no bond on the same environment
 *  thing, in the same direction, of the same kind, reaching a component. */
export function pendingCrossings(model: CanvasModel): Crossing[] {
  const all = model.crossings ?? [];
  if (all.length === 0) return [];
  const comps = new Set(model.things.filter((t) => t.role === "Component").map((t) => t.id));
  return all.filter(
    (c) =>
      !model.relations.some(
        (r) =>
          r.is_bond &&
          r.kind === c.kind &&
          (c.inbound ? r.a === c.env && comps.has(r.b) : r.b === c.env && comps.has(r.a)),
      ),
  );
}

/** "3 boundary flows landing on this system until an interface takes them" —
 *  the inspector's line, empty when there is nothing pending. */
export function pendingCrossingsPhrase(model: CanvasModel): string {
  const n = pendingCrossings(model).length;
  if (n === 0) return "";
  return `${n} boundary flow${n === 1 ? "" : "s"} landing on this system until an interface takes ${n === 1 ? "it" : "them"}`;
}
