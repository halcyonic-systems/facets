// The process-primitive glyph family — a bert-lenses stroke vocabulary IN THE
// SPIRIT of Mobus's atomic processes (Fig. 4.5) and derived work processes
// (Fig. 4.12/4.13), NOT his printed iconography (the #100 honesty note: the
// book's actual glyph artwork isn't reproduced here — these are our drawings;
// only the Fig. 4.17 orange regulator triangle is his convention directly).
// One stroke family in a normalized ±6 box so any caller can scale them to
// any spec. Substance topology only (merge / fork / gate / push / drum); the
// substance TYPE stays on the flow (KIND_COLOR), never in the glyph. Modulating
// is the regulator/decision monitor — the one glyph the house draws filled and
// warm (Fig. 4.17's orange triangle). Stroke color is the caller's `color`.
import type { ProcessPrimitive } from "../../kernel/types";
import type { ReactNode } from "react";

/** Regulator/decision hue (Fig. 4.17) — a control mark, not a substance KIND. */
const REGULATOR = "var(--verdict-warning)";

/** The glyph body for a primitive, in a ±6 box. Filled marks set their own fill
 *  and stroke="none"; everything else inherits the wrapper's stroke. */
export function primitiveGlyph(primitive: ProcessPrimitive): ReactNode {
  switch (primitive) {
    case "Combining": // two inputs merge to one output
      return (
        <>
          <path d="M-6-3.4 L-1 0 M-6 3.4 L-1 0 M-1 0 H6" />
          <circle cx={-1} cy={0} r={1} fill="currentColor" stroke="none" />
        </>
      );
    case "Splitting": // one input forks to two outputs
      return (
        <>
          <path d="M-6 0 H1 M1 0 L6-3.4 M1 0 L6 3.4" />
          <circle cx={1} cy={0} r={1} fill="currentColor" stroke="none" />
        </>
      );
    case "Impeding": // a bowtie valve constricts the flow (Fig. 4.10 aperture)
      return (
        <>
          <path d="M-6 0 H-3.2 M3.2 0 H6" />
          <path d="M-3.2-3.4 L-3.2 3.4 L0 0 Z M3.2-3.4 L3.2 3.4 L0 0 Z" fill="none" />
        </>
      );
    case "Propelling": // a pump drives the flow onward
      return (
        <>
          <path d="M-6 0 H-4" />
          <path d="M-4-3.6 L-0.4 0 L-4 3.6 M0.2-3.6 L3.8 0 L0.2 3.6" fill="none" />
        </>
      );
    case "Buffering": // a raw stock — the Mobus drum (Fig. 4.5)
      return (
        <>
          <path d="M-6 0 H-4 M4 0 H6" />
          <ellipse cx={0} cy={-3.2} rx={4} ry={1.5} fill="none" />
          <path d="M-4-3.2 V3.2 A4 1.5 0 0 0 4 3.2 V-3.2" fill="none" />
        </>
      );
    case "Modulating": // the regulator/decision monitor (Fig. 4.17)
      return <path d="M0-5 L4.6 3.6 L-4.6 3.6 Z" fill={REGULATOR} stroke="none" />;
    case "Sensing": // a probe emitting/detecting — dot with radiating waves
      return (
        <>
          <circle cx={-3} cy={0} r={1.4} fill="currentColor" stroke="none" />
          <path d="M0.5-2.6 A3.3 3.3 0 0 1 0.5 2.6" fill="none" />
          <path d="M3-4.4 A5.6 5.6 0 0 1 3 4.4" fill="none" />
        </>
      );
    case "Amplifying": // gain — ascending bars
      return <path d="M-4 4 V0 M0 4 V-2 M4 4 V-4.4" />;
    case "Inverting": // reversal — two antiparallel arrows
      return (
        <>
          <path d="M-3-4.4 V4.4 M-3-4.4 L-4.6-2.4 M-3-4.4 L-1.4-2.4" fill="none" />
          <path d="M3 4.4 V-4.4 M3 4.4 L1.4 2.4 M3 4.4 L4.6 2.4" fill="none" />
        </>
      );
    case "Copying": // duplication — two offset cards, the front one opaque
      return (
        <>
          <rect x={-4.6} y={-1.4} width={6} height={6} rx={1} fill="none" />
          <rect x={-1.4} y={-4.6} width={6} height={6} rx={1} fill="var(--bg-secondary)" />
        </>
      );
  }
}
