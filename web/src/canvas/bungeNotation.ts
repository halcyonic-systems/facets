// Pure helpers behind the Bunge coupling-matrix register (#100 phase 2):
// row/col ordering, cell membership, and cell glyphs for Bunge's M — his own
// second notation (the coupling matrix, M₀ᵣ / Mₛ₀ / Mᵣₛ). Presentation
// arithmetic only — no systems verdict lives here (the action's channel and
// bond/mere reading are kernel facts; legality stays validate_connection's).
// Klir's sibling helpers live in klirNotation.ts — same file grammar, each
// lens reading its OWN semantics off the shared model.
import type { CanvasModel, Kind, Relation, Thing } from "../kernel/types";

/** Row/col order for M: composition first, then environment — one flat
 *  ontology (env things are the same shape), with the cut visible as the
 *  matrix's own ordering; the M₀ᵣ (input) and Mₛ₀ (output) blocks fall out
 *  of it. Order within each side is authoring order, same as the model. */
export function matrixThings(model: CanvasModel): Thing[] {
  return [
    ...model.things.filter((t) => t.role === "Component"),
    ...model.things.filter((t) => t.role === "Environment"),
  ];
}

/** A row/column of M. Either one thing, or the environment taken EN BLOC —
 *  Bunge's own device for an open system (1979 §2.1, pp. 18–19): instead of an
 *  m×m over the composition he forms an (m+1)×(m+1) "letting 0 stand for the
 *  environment en bloc", so the input row M₀ᵣ and the output column Mₛ₀ are
 *  literally row 0 and column 0. Def 1.2's worked example lumps the same way
 *  in prose ("an environment lumped into a single thing c"). The itemized
 *  alternative — one row per named environment thing — is ours, not his: more
 *  information, less his notation, so it is the toggle's other half. */
export type MatrixSlot = { kind: "thing"; thing: Thing } | { kind: "env" };

/** The rows/cols of M under either environment reading. En bloc puts 0 FIRST,
 *  as Bunge prints it, so row 0 = inputs and column 0 = outputs; itemized
 *  keeps composition-then-environment, the cut visible as the ordering. */
export function matrixSlots(model: CanvasModel, enBloc: boolean): MatrixSlot[] {
  const components = model.things.filter((t) => t.role === "Component");
  if (!enBloc) return matrixThings(model).map((thing) => ({ kind: "thing", thing }));
  const slots: MatrixSlot[] = components.map((thing) => ({ kind: "thing", thing }));
  return model.things.some((t) => t.role === "Environment") ? [{ kind: "env" }, ...slots] : slots;
}

/** Whether a slot stands for a thing on the environment side — the env slot
 *  itself, or (itemized) a thing whose role is Environment. Used only to place
 *  the cut rule; the role fact is the model's, the channel facts are the
 *  kernel's. */
export function slotIsEnv(slot: MatrixSlot): boolean {
  return slot.kind === "env" || slot.thing.role === "Environment";
}

/** The relations occupying cell (row slot, col slot). Delegates to the
 *  thing-level reading below; an env slot stands for EVERY environment thing at
 *  once, so its cells collect what any of them acts on (or is acted on by) —
 *  the same relations, gathered under Bunge's index 0. */
export function slotCellRelations(model: CanvasModel, row: MatrixSlot, col: MatrixSlot): Relation[] {
  // M₀₀ = 0 in Bunge's own printed matrix: the environment's couplings to
  // itself are not in 𝒮 (neither relatum is a component), so index 0 has no
  // self-cell to fill.
  if (row.kind === "env" && col.kind === "env") return [];
  const ids = (slot: MatrixSlot): number[] =>
    slot.kind === "thing"
      ? [slot.thing.id]
      : model.things.filter((t) => t.role === "Environment").map((t) => t.id);
  const rows = ids(row);
  const cols = ids(col);
  const seen = new Set<number>();
  const out: Relation[] = [];
  for (const r of rows)
    for (const c of cols)
      for (const rel of bungeCellRelations(model, r, c))
        if (!seen.has(rel.id)) {
          seen.add(rel.id);
          out.push(rel);
        }
  return out;
}

/** The relations occupying cell (row, col), read as "row acts on col": a bond
 *  is directed action, so it marks its own order only; a mere relation holds
 *  but does not act, so it marks both orders (no channel to orient it). */
export function bungeCellRelations(model: CanvasModel, row: number, col: number): Relation[] {
  return model.relations.filter((r) =>
    r.is_bond
      ? r.a === row && r.b === col
      : (r.a === row && r.b === col) || (r.a === col && r.b === row),
  );
}

/** The KIND of action, in Bunge's own four-kind enum (his vocabulary, F3/F7):
 *  e = energy, m = matter, f = field, i = informational; · = a bond whose kind
 *  is not yet stated (the residue register counts it). */
export function kindGlyph(kind: Kind): string {
  switch (kind) {
    case "Energy":
      return "e";
    case "Matter":
      return "m";
    case "Field":
      return "f";
    case "Informational":
      return "i";
    default:
      return "·";
  }
}

/** What a coupling cell shows: the kind glyph of the acting bond (what makes a
 *  bond a bond IS the kind of action — F7), ∼ for a mere relation that holds
 *  without acting, ↺ on the diagonal, with a ×N stack count. Pure typesetting
 *  over bungeCellRelations' reading — no verdict. */
export function bungeCellGlyph(row: number, col: number, rs: Relation[]): string {
  return cellGlyph(row === col, rs);
}

/** The same typesetting, slot-addressed: a self-cell is the diagonal (one thing
 *  acting on itself). Index 0 has no self-cell, so en bloc never lands here
 *  with both slots environmental. */
export function slotCellGlyph(row: MatrixSlot, col: MatrixSlot, rs: Relation[]): string {
  const self = row.kind === "thing" && col.kind === "thing" && row.thing.id === col.thing.id;
  return cellGlyph(self, rs);
}

function cellGlyph(self: boolean, rs: Relation[]): string {
  if (rs.length === 0) return "";
  const bond = rs.find((r) => r.is_bond);
  const head = self ? "↺" : bond ? kindGlyph(bond.kind) : "∼";
  return rs.length > 1 ? `${head}×${rs.length}` : head;
}
