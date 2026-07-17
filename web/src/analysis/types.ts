// The five-part analysis response — a TS mirror of germen's dispatch Response
// (crates/germen-core/src/dispatch.rs), adopted as a type rather than reused as
// code (germen is Rust, coupled to its own engine). GSR's /analyze returns this
// shape; the panel narrates it. No systems logic here — a data contract only.

export type AnalysisCitation = { thing?: number; relation?: number; issue?: number };

export type AnalysisResponse = {
  answer: string; // 1 — direct critique/answer, facts-only register
  trace: string[]; // 2 — which kernel facts/verdicts ground each claim
  evidence: string[]; // 3 — specific claims carrying citation tokens
  visual: string | null; // 4 — reserved (germen renders trees; we have the canvas)
  next: string[]; // 5 — up to 3 suggested follow-ups
};
