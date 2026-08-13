// The compile chain — what the SL text in this pane becomes, named step by
// step, live.
//
// The pane already held one half of the story (text in, faults out) and the
// dock's Formal tab held the other (the formal object). Nothing said they were
// the same pipeline. This strip is the seam made legible: text → the compiled
// CanvasModel → the active lens's formal object → the kernel's verdict at that
// lens's mode. Editing SL moves every line of it.
//
// Presentation only, and deliberately so. Every VALUE here arrives from the
// kernel — `describe` (the formal object), `validate_mode` (the verdict and
// its `doc` anchor, #129) — or is a plain fact about the text and the compiled
// artifact (line count, array lengths, the JSON itself), the same standing
// `review.ts`'s `reviewCounts` already has. Nothing in this file decides
// anything about systemhood.
//
// The per-lens formal-object signature below is the one presentation constant:
// the same typesetting `FormalPanel` already carries, restated compactly so the
// strip can name the target without pulling KaTeX into a 4-line block. If those
// two ever disagree, FormalPanel is right.
import { useState } from "react";
import type { CanvasModel, Lens, LensDescription, ValidationResult } from "./kernel/types";
import { MODE_BY_LENS } from "./review";
import { openExternal } from "./desktop";

const REPO_BASE = "https://github.com/halcyonic-systems/bert-lenses/blob/main/";
const GRAMMAR_URL = `${REPO_BASE}docs/language/spec.md#4-grammar`;
const PROVENANCE_URL = `${REPO_BASE}docs/lean-provenance.md`;

/** The formal object each lens compiles TO, in its own notation — the compact
 *  twin of FormalPanel's KaTeX headers. Presentation, not judgment. */
const SIGNATURE: Record<Lens, string> = {
  Klir: "S = (T, R)",
  Bunge: "µ(σ) = ⟨C, E, S, M⟩",
  Mobus: "S = ⟨C, N, E, G, B, T, H, Δt⟩",
};

/** The bond/mere split of the compiled relations (#320). A reader who counts
 *  fourteen lines on the canvas and reads "12 bond · 2 mere" is handed the
 *  discrepancy BEFORE any refusal exists — which is the whole failure of
 *  2026-08-12, where two `mere` relations were pointed at as evidence that a
 *  correct verdict was wrong. Counting, not judging: `is_bond` is the kernel's.
 *  Klir gets the plain count, because `(T, R)` has no bond/non-bond split and a
 *  split reported under that lens would be a construct it does not own. */
function bondSplit(model: CanvasModel): string {
  const total = model.relations.length;
  if (model.lens === "Klir") return `all in R`;
  const bonds = model.relations.filter((r) => r.is_bond).length;
  const mere = total - bonds;
  return mere === 0 ? "all bonds" : `${bonds} bond · ${mere} mere`;
}

/** "docs/glossary.md#precondition" → "glossary § precondition" (same reduction
 *  ReviewPanel makes; the anchor itself is the kernel's). */
function docLabel(doc: string): string {
  const [path, anchor] = doc.split("#");
  const file = path.split("/").pop()?.replace(/\.md$/, "") ?? path;
  return anchor ? `${file} § ${anchor}` : file;
}

function DocLink({ href, children, title }: { href: string; children: string; title: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={openExternal}
      title={title}
      style={{ color: "var(--lens-accent)", textDecoration: "underline", textDecorationStyle: "dotted" }}
    >
      {children}
    </a>
  );
}

function Step({
  n,
  call,
  children,
  aside,
}: {
  n: number;
  call: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2 py-0.5 text-[11px]">
      <span className="w-3 shrink-0 tabular" style={{ color: "var(--text-muted)" }}>
        {n}
      </span>
      <span
        className="w-24 shrink-0 truncate"
        style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
        title={call}
      >
        {call}
      </span>
      <span className="min-w-0 flex-1" style={{ color: "var(--text-secondary)" }}>
        {children}
      </span>
      {aside && <span className="shrink-0">{aside}</span>}
    </div>
  );
}

export interface SlChainProps {
  /** The text in the pane — its line count is step 1's only fact. */
  text: string;
  /** The compiled artifact. Null before the first successful compile. */
  model: CanvasModel | null;
  /** The kernel's formal object for `model` under its active lens (`describe`). */
  desc: LensDescription | null;
  /** The kernel's verdict at that lens's mode (`validate_mode`), decomposition
   *  seam issues merged in — the same list the review panel reads. */
  verdict: ValidationResult | null;
  /** Raise the dock's Formal tab, so step 3's object is actually on screen. */
  onShowFormal: () => void;
}

export function SlChain({ text, model, desc, verdict, onShowFormal }: SlChainProps) {
  const [showJson, setShowJson] = useState(false);
  const lines = text.split("\n").length;
  const lens = model?.lens ?? null;
  const errors = verdict?.issues.filter((i) => i.severity === "Error") ?? [];
  const cite = verdict?.issues.find((i) => i.doc !== null)?.doc ?? null;

  return (
    <div className="border-t px-3 py-2" style={{ borderColor: "var(--hairline)" }}>
      <div className="flex items-baseline justify-between gap-2 pb-1">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
        >
          the compile chain
        </span>
        <DocLink href={GRAMMAR_URL} title="the normative SL v1.0 grammar (EBNF), in the spec">
          SL v1.0 grammar ↗
        </DocLink>
      </div>

      <Step n={1} call="SL text">
        {lines} line{lines === 1 ? "" : "s"}: a declarative notation, not a script
      </Step>

      <Step
        n={2}
        call="compile_sl"
        aside={
          model && (
            <button
              onClick={() => setShowJson((s) => !s)}
              className="px-1 text-[10px] underline"
              style={{ color: "var(--text-muted)" }}
              title="show the compiled model exactly as the kernel returned it"
            >
              {showJson ? "hide JSON" : "show JSON"}
            </button>
          )
        }
      >
        {model ? (
          <>
            CanvasModel: {model.things.length} thing{model.things.length === 1 ? "" : "s"},{" "}
            {model.relations.length} relation{model.relations.length === 1 ? "" : "s"} ({bondSplit(model)})
          </>
        ) : (
          "not compiled yet"
        )}
      </Step>

      {showJson && model && (
        <pre
          className="my-1 max-h-40 overflow-auto p-2 font-mono text-[9px] leading-snug"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-muted)",
          }}
        >
          {JSON.stringify(model, null, 2)}
        </pre>
      )}

      <Step
        n={3}
        call="describe"
        aside={
          desc && (
            <button
              onClick={onShowFormal}
              className="px-1 text-[10px] underline"
              style={{ color: "var(--text-muted)" }}
              title="open the Formal tab: the same object, typeset in full"
            >
              open Formal
            </button>
          )
        }
      >
        {desc ? (
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {desc.lens}: {SIGNATURE[desc.lens]}
          </span>
        ) : (
          "no formal object yet"
        )}
      </Step>

      <Step
        n={4}
        call="validate_mode"
        aside={
          cite && (
            <DocLink href={REPO_BASE + cite} title="read the precondition this verdict cites">
              {docLabel(cite)}
            </DocLink>
          )
        }
      >
        {lens && verdict ? (
          <>
            <span style={{ fontFamily: "var(--font-mono)" }}>{MODE_BY_LENS[lens]}</span> mode,{" "}
            <span style={{ color: errors.length ? "var(--verdict-error)" : "var(--verdict-ok)" }}>
              {verdict.issues.length === 0
                ? "clean"
                : `${verdict.issues.length} issue${verdict.issues.length === 1 ? "" : "s"}`}
            </span>
          </>
        ) : (
          "no verdict yet"
        )}
      </Step>

      {/* The claim, stated at the strength it is actually held at. Step 2 is a
          deterministic Rust compiler with no LLM in it (spec §1, C1). Step 4's
          MODE ENTRY gate — not every issue it can raise — is the part with a
          Lean binding: `crates/bert-core/tests/gates_truth_table.rs` asserts
          `validate_mode`'s entry gates agree with a Lean-emitted truth table on
          every (T,R) kernel over ≤ 2 things, both directions (19 rows). The
          verdicts themselves are Rust; nothing here is proved in Lean, and the
          copy below must never say otherwise. Provenance and its caveats:
          docs/lean-provenance.md. */}
      <p className="pt-1.5 text-[10px] leading-snug" style={{ color: "var(--text-muted)" }}>
        Steps 2 to 4 all run in the Rust kernel. The compiler is deterministic: same text, same model,
        no LLM between them. Step 4's mode-entry gate is checked against a Lean-emitted truth table
        over every kernel of ≤ 2 things, 19 rows, both directions:{" "}
        <DocLink href={PROVENANCE_URL} title="which Lean, at which commit, and what it does not establish">
          lean-provenance ↗
        </DocLink>
      </p>
    </div>
  );
}
