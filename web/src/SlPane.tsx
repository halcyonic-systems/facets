// The SL text pane — the textual authoring surface beside the canvas.
//
// Write SL, compile, and the diagram renders: the pane hands the raw text to
// the kernel's `compile_sl` (a deterministic parser in Rust — never an LLM,
// never a systemhood judge) and receives either a CanvasModel or a line-
// anchored fault list. The compiled model flows into the SAME `setCanvasModel`
// channel the canvas gestures use, so the existing analyze/verdict path fires
// unchanged. Parse faults (syntax, unknown names) render here; systemhood
// verdicts stay where they always were — the kernel, via the verdict pill and
// the audit panel.

import { useState } from "react";
import { compileSl, emitSl } from "./kernel";
import type { CanvasModel, SlError } from "./kernel/types";

interface SlPaneProps {
  text: string;
  errors: SlError[];
  onTextChange: (text: string) => void;
  onErrors: (errors: SlError[]) => void;
  /** Receives the compiled model; the parent owns lens preservation + resets.
   *  `lensExplicit` = the text pinned a lens via `@lens`. */
  onCompiled: (model: CanvasModel, lensExplicit: boolean) => void;
  onClose: () => void;
  /** The current canvas model, for the text←canvas direction (null = none). */
  canvasModel: CanvasModel | null;
  /** #10 Rung 1: draft SL from a description (GSR /author-sl). Undefined =
   *  authoring off (the pane stays a pure human/kernel surface). Window-on-
   *  demand: the affordance is a deliberate reveal, never ambient. */
  onRequestDraft?: (description: string) => Promise<string>;
}

export function SlPane({ text, errors, onTextChange, onErrors, onCompiled, onClose, canvasModel, onRequestDraft }: SlPaneProps) {
  // #10 Rung 1 authoring state — the draft box is revealed on demand.
  const [drafting, setDrafting] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  // Canvas → text: serialize the live model into the pane (kernel emit_sl —
  // canonical, round-trip-golden-tested). Replaces the pane text; the author
  // asked for it by pressing the button, so no confirm.
  function fromCanvas() {
    if (!canvasModel) return;
    try {
      onTextChange(emitSl(canvasModel));
      onErrors([]);
    } catch (e) {
      onErrors([{ line: 0, message: e instanceof Error ? e.message : String(e) }]);
    }
  }

  function compile(src: string = text) {
    const outcome = compileSl(src);
    if ("errors" in outcome) {
      onErrors(outcome.errors);
    } else {
      onErrors([]);
      onCompiled(outcome.ok, outcome.lens_explicit);
    }
  }

  // #10 Rung 1: description → SL (GSR) → pane → compile → Rung-0 preview. The
  // LLM proposes; compile_sl disposes legality; the author accepts. A failed
  // draft still lands in the textarea with its faults shown — nothing hidden.
  async function draft() {
    if (!onRequestDraft || !description.trim() || drafting) return;
    setDrafting(true);
    setDraftError(null);
    try {
      const sl = await onRequestDraft(description.trim());
      onTextChange(sl);
      compile(sl);
      setDraftOpen(false);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : String(e));
    } finally {
      setDrafting(false);
    }
  }

  return (
    <aside
      className="flex w-96 min-w-0 flex-col border-r"
      style={{ borderColor: "var(--hairline)", background: "var(--bg-secondary)" }}
    >
      <div
        className="flex items-center justify-between border-b px-3 py-2"
        style={{ borderColor: "var(--hairline)" }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          SL — system language
        </span>
        <button
          onClick={onClose}
          className="px-1 text-sm"
          style={{ color: "var(--text-muted)" }}
          title="Close the SL pane"
        >
          ✕
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            compile();
          }
        }}
        spellCheck={false}
        className="min-h-0 flex-1 resize-none p-3 font-mono text-xs leading-relaxed outline-none"
        style={{ background: "var(--bg-primary)", color: "var(--text-secondary)" }}
        placeholder={'component Furnace interface\nsource "Iron Vendor"\nflow "Iron Vendor" -> Furnace : matter "iron"'}
      />
      {errors.length > 0 && (
        <div
          className="max-h-40 overflow-y-auto border-t px-3 py-2 text-xs"
          style={{ borderColor: "var(--hairline)", color: "var(--verdict-error)" }}
        >
          {errors.map((e, i) => (
            <div key={i} className="py-0.5 font-mono">
              line {e.line}: {e.message}
            </div>
          ))}
        </div>
      )}
      {onRequestDraft && draftOpen && (
        <div className="border-t px-3 py-2" style={{ borderColor: "var(--hairline)" }}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                draft();
              }
            }}
            disabled={drafting}
            spellCheck
            rows={3}
            className="w-full resize-none rounded p-2 text-xs outline-none"
            style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--hairline)" }}
            placeholder="Describe a system in plain language — the drafter writes the SL, you compile it to a preview and accept or discard."
          />
          {draftError && (
            <div className="mt-1 text-xs" style={{ color: "var(--verdict-error)" }}>
              {draftError}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={draft}
              disabled={drafting || !description.trim()}
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: "var(--accent)", color: "var(--text-on-accent)",
                opacity: drafting || !description.trim() ? 0.5 : 1,
                cursor: drafting || !description.trim() ? "not-allowed" : "pointer",
              }}
              title="Draft SL from the description (⌘⏎)"
            >
              {drafting ? "Drafting…" : "Draft SL"}
            </button>
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              LLM proposes · kernel checks · you accept
            </span>
          </div>
        </div>
      )}
      <div
        className="flex items-center gap-2 border-t px-3 py-2"
        style={{ borderColor: "var(--hairline)" }}
      >
        <button
          onClick={() => compile()}
          className="rounded-full px-4 py-1.5 text-sm font-semibold"
          style={{ background: "var(--accent)", color: "var(--text-on-accent)" }}
          title="Compile SL → model (⌘⏎)"
        >
          Compile
        </button>
        <button
          onClick={fromCanvas}
          disabled={!canvasModel}
          className="rounded-full px-3 py-1.5 text-sm"
          style={{
            border: "1px solid var(--hairline)",
            color: "var(--text-secondary)",
            opacity: canvasModel ? 1 : 0.45,
            cursor: canvasModel ? "pointer" : "not-allowed",
          }}
          title={canvasModel ? "Replace the text with the current canvas model, serialized" : "No model on the canvas yet"}
        >
          ← From canvas
        </button>
        {onRequestDraft && (
          <button
            onClick={() => { setDraftOpen((o) => !o); setDraftError(null); }}
            className="rounded-full px-3 py-1.5 text-sm"
            style={{
              border: "1px solid var(--hairline)",
              color: draftOpen ? "var(--accent)" : "var(--text-secondary)",
            }}
            title="Draft SL from a plain-language description"
          >
            ✨ Draft
          </button>
        )}
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          ⌘⏎ · deterministic compile, kernel verdicts
        </span>
      </div>
    </aside>
  );
}
