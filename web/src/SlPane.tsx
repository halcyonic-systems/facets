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
//
// #10 (locked 2026-07-24): the resident co-author is a MODE of this pane, not
// a separate dock — two ways to fill the same SL text: hand-author it, or
// describe-and-draft it. The [ SL ] / [ Co-author ] switch below is the whole
// seam; manual authoring (textarea + Compile) is always present underneath and
// never gated on the drafter.

import { useEffect, useState } from "react";
import { compileSl, emitSl } from "./kernel";
import type { CanvasModel, SlError } from "./kernel/types";
import { CoAuthorMode } from "./CoAuthorMode";
import type { CoauthorTurn, DraftStage } from "./coauthor";

type Mode = "sl" | "coauthor";

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
  /** #10: the co-author mode. Undefined = authoring off (the pane stays a
   *  pure human/kernel surface, no mode switch shown) — window-on-demand,
   *  never ambient. The parent owns the whole draft->compile->preview->record
   *  sequence (onDraft); this pane only switches back to the SL view once it
   *  resolves, so the compiled/faulty text is visible either way. */
  coauthor?: {
    turns: CoauthorTurn[];
    /** `onStage` is #218's progress feed — the parent's draft call reports
     *  which phase it is in (asking / compiling / retrying) as it happens. */
    onDraft: (description: string, onStage?: (stage: DraftStage) => void) => Promise<void>;
  };
}

export function SlPane({ text, errors, onTextChange, onErrors, onCompiled, onClose, canvasModel, coauthor }: SlPaneProps) {
  const [mode, setMode] = useState<Mode>("sl");
  // Faults describe the text as of their compile; once the author types past
  // them they are history, not the present — dimmed and labeled, never
  // silently persisted as if still true. Cleared whenever a fresh fault list
  // arrives (any compile path: button, ⌘⏎, co-author).
  const [editedSinceCompile, setEditedSinceCompile] = useState(false);
  useEffect(() => setEditedSinceCompile(false), [errors]);

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

  // The co-author's Draft action: the parent (App.tsx's coauthorDraft) owns
  // drafting, compiling, and previewing — this pane just returns to the SL
  // view once it resolves, so the result (compiled preview OR the faulty
  // draft text + its errors) is where the author expects to look.
  async function handleDraft(description: string, onStage?: (stage: DraftStage) => void) {
    if (!coauthor) return;
    await coauthor.onDraft(description, onStage);
    setMode("sl");
  }

  function handleLoad(sl: string) {
    onTextChange(sl);
    setMode("sl");
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
        <div className="flex items-center gap-2">
          {coauthor && (
            <div
              className="flex overflow-hidden rounded-full"
              style={{ border: "1px solid var(--hairline)" }}
            >
              <ModeButton label="SL" active={mode === "sl"} onClick={() => setMode("sl")} />
              <ModeButton label="Co-author" active={mode === "coauthor"} onClick={() => setMode("coauthor")} />
            </div>
          )}
          <button
            onClick={onClose}
            className="px-1 text-sm"
            style={{ color: "var(--text-muted)" }}
            title="Close the SL pane"
          >
            ✕
          </button>
        </div>
      </div>

      {mode === "coauthor" && coauthor ? (
        <CoAuthorMode turns={coauthor.turns} onDraft={handleDraft} onLoad={handleLoad} />
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => {
              onTextChange(e.target.value);
              setEditedSinceCompile(true);
            }}
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
              style={{
                borderColor: "var(--hairline)",
                color: "var(--verdict-error)",
                opacity: editedSinceCompile ? 0.45 : 1,
              }}
            >
              {editedSinceCompile && (
                <div className="pb-1" style={{ color: "var(--text-muted)" }}>
                  edited since last compile — ⌘⏎ to re-check
                </div>
              )}
              {errors.map((e, i) => (
                <div key={i} className="py-0.5 font-mono">
                  line {e.line}: {e.message}
                </div>
              ))}
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
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              ⌘⏎ · deterministic compile, kernel verdicts
            </span>
          </div>
        </>
      )}
    </aside>
  );
}

function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 text-[11px] font-semibold"
      style={{
        background: active ? "var(--accent)" : "transparent",
        color: active ? "var(--text-on-accent)" : "var(--text-secondary)",
      }}
    >
      {label}
    </button>
  );
}
