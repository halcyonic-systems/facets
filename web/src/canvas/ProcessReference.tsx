// The periodic table of processes (#100 folded-in ask): the whole process-primitive
// vocabulary on one reference surface — each primitive's own glyph beside its name and
// a one-line reading. The glyphs are the same `primitiveGlyph` drawings the palette and
// the canvas stamp (#100 phase 4), so the reference and the authored thing never drift.
//
// The four atomic work processes (Combining, Splitting, Impeding, Propelling) are Mobus's
// own (Systems Science §4.3.3.1, Fig. 4.5); Buffering is his raw stock; the rest are
// BERT's extensions in the same register. Descriptors are terse by design — this is a
// lookup surface, not documentation.
import type { ProcessPrimitive } from "../kernel/types";
import { primitiveGlyph } from "./lenses/primitive-glyphs";
import { STYLE } from "./style";

// Canonical order = the `ProcessPrimitive` union order (kernel/types.ts).
// Exported so the element inspector can deliver the same one-liner in context.
export const PRIMITIVES: ReadonlyArray<readonly [ProcessPrimitive, string]> = [
  ["Combining", "two flows merge into one"],
  ["Splitting", "one flow forks into two"],
  ["Buffering", "a raw stock — holds, does not transform (Mobus's drum)"],
  ["Impeding", "a valve constricts the flow (Fig. 4.10 aperture)"],
  ["Propelling", "a pump drives the flow onward"],
  ["Copying", "a message duplicated — copyable, not conserved"],
  ["Sensing", "a probe detects / measures a flow"],
  ["Modulating", "a control signal gates the flow (regulator, Fig. 4.17)"],
  ["Amplifying", "gain — the output exceeds the signal"],
  ["Inverting", "reversal — the flow's sense is flipped"],
];

/** Each primitive's per-tick rule, stated as the engine actually computes it
 *  (bert-compose circuit.rs activity pass — transcribed from the source, not
 *  paraphrased; fresh-eyes pass 2026-08-18). One line each: what a click on a
 *  processor can honestly say is happening to the flow inside it. */
export const PRIMITIVE_LAWS: Readonly<Record<ProcessPrimitive, string>> = {
  Combining: "out = Σ inflows of its output kind — other kinds drive the work and dissipate (no limiting-factor coupling yet)",
  Splitting: "out = Σ matched inflows, divided across outwires by declared shares",
  Buffering: "stock += inflow − release · release = declared rate (or stock/τ) read from the step's opening stock, never more than it holds",
  Impeding: "out = matched inflow × agency (0–1)",
  Propelling: "out = matched inflow × agency (0–1)",
  Copying: "out = the message, duplicated — copyable, not conserved",
  Sensing: "signal out = physical inflow × agency — crosses substance, drains nothing",
  Modulating: "out = physical inflow × control gate (0–1) · no control wire = open valve",
  Amplifying: "out = min(signal × gain, metered energy in) — no free mass",
  Inverting: "out = max(setpoint − signal, 0) — the comparator",
};

function Glyph({ primitive }: { primitive: ProcessPrimitive }) {
  return (
    <svg width={22} height={22} viewBox="-8 -8 16 16" aria-hidden className="shrink-0">
      <g fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
        {primitiveGlyph(primitive)}
      </g>
    </svg>
  );
}

/** A read-only reference grid of the ten process primitives. Self-contained; the
 *  caller decides where to mount it (the palette mounts it as a toggled overlay). */
export function ProcessReference() {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {PRIMITIVES.map(([primitive, gloss]) => (
        <div
          key={primitive}
          className="flex items-start gap-2 p-2"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border)",
            borderRadius: STYLE.chipRx,
            color: "var(--text-primary)",
          }}
        >
          <Glyph primitive={primitive} />
          <div className="min-w-0">
            <div className="text-xs font-semibold">{primitive}</div>
            <div className="text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
              {gloss}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
