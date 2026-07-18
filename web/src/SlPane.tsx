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

import { compileSl } from "./kernel";
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
}

export function SlPane({ text, errors, onTextChange, onErrors, onCompiled, onClose }: SlPaneProps) {
  function compile() {
    const outcome = compileSl(text);
    if ("errors" in outcome) {
      onErrors(outcome.errors);
    } else {
      onErrors([]);
      onCompiled(outcome.ok, outcome.lens_explicit);
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
      <div
        className="flex items-center gap-2 border-t px-3 py-2"
        style={{ borderColor: "var(--hairline)" }}
      >
        <button
          onClick={compile}
          className="rounded-full px-4 py-1.5 text-sm font-semibold"
          style={{ background: "var(--accent)", color: "#fff" }}
          title="Compile SL → model (⌘⏎)"
        >
          Compile
        </button>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          ⌘⏎ · deterministic compile, kernel verdicts
        </span>
      </div>
    </aside>
  );
}
