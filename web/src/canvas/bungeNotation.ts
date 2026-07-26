// Presentation helpers behind the Bunge coupling-matrix register (#100 phase 2):
// glyphs for Bunge's M — his own second notation (M₀ᵣ / Mₛ₀ / Mᵣₛ).
//
// TOMBSTONE (#233). The matrix's semantics used to live here: the row/column
// ordering, the en-bloc environment device (1979 §2.1), the bond-vs-mere
// directionality of a cell's occupants, and the rule M₀₀ = 0. Those are readings
// of Bunge, and the register is a write surface — a cell that silently cannot be
// authored is a refusal, so it owes a reason in the kernel's voice. They moved:
//
//   crates/bert-canvas/src/notation.rs :: bunge_coupling_cells
//   crates/bert-lenses-kernel/src/api.rs :: bunge_coupling_cells (wasm export)
//   web/src/kernel/index.ts :: bungeCouplingCells (the forwarder)
//
// What remains below is typography: Bunge's four-kind glyph alphabet and the
// character a kernel-decided mark prints as. Klir's sibling helpers live in
// klirNotation.ts — same file grammar.
import type { BungeCell, BungeCoupling, BungeMark, CouplingSlot, Kind } from "../kernel/types";

/** The kernel's coupling cells, addressable by (row, col) slot index. */
export function couplingIndex(coupling: BungeCoupling): Map<string, BungeCell> {
  return new Map(coupling.cells.map((c) => [`${c.row},${c.col}`, c]));
}

/** Whether a slot stands on the environment side of the cut — a read of the
 *  kernel's own slot tagging, used only to place the rule and mute the label. */
export function slotIsEnv(slot: CouplingSlot): boolean {
  return slot.kind === "env" || slot.env;
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
 *  over the kernel's mark. */
export function bungeGlyph(mark: BungeMark, count: number): string {
  if (mark.mark === "empty" || count === 0) return "";
  const head = mark.mark === "self_loop" ? "↺" : mark.mark === "bond" ? kindGlyph(mark.kind) : "∼";
  return count > 1 ? `${head}×${count}` : head;
}
