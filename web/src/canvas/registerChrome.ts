// Shared chrome for the lens registers (#131). The Klir incidence matrix and
// the Bunge coupling matrix are siblings by design — same cell geometry, same
// header treatment, same propose-then-confirm strip — while the semantics stay
// each lens's own. That siblinghood used to live in review memory; now it lives
// here, and check-tokens.mjs fails any *Register.tsx that re-derives these
// instead of importing them.

/** Matrix cell edge, px — one number so the sibling matrices stay congruent. */
export const CELL = 30;

/** Header cells: mono, quiet, hairline-ruled — identical in every register. */
export const headerCellStyle = {
  fontFamily: "var(--font-mono)",
  background: "var(--bg-secondary)",
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--hairline)",
  borderRight: "1px solid var(--hairline)",
} as const;

/** The confirm strip: a proposal is visible, revocable, and only becomes part
 *  of the model on an explicit second act. Chrome shared; copy per lens. */
export const confirmStripClass = "mt-2 flex w-fit items-center gap-2 rounded-md border px-2 py-1 text-xs";
export const confirmStripStyle = {
  borderColor: "var(--lens-accent)",
  background: "var(--bg-secondary)",
} as const;
