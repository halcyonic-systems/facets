// The bottom bar (#409 M1): standing status, the same in every mode. What the
// kernel says under the current lens, how big the model is, where the text
// stands, the Focus toggle, and what this build is. Nothing here is a layout
// choice except Focus, which is the one such choice the frame keeps.
import { Pill } from "./ui";
import { MODE_BY_LENS } from "./review";
import type { CanvasModel, ValidationResult } from "./kernel/types";

/** docs/language/spec.md's title line carries the language version. */
export const SL_VERSION = "1.6";

export function StatusBar({
  model,
  verdict,
  faults,
  previewing,
  focus,
  onToggleFocus,
  onVerdict,
  kernelLoaded,
}: {
  model: CanvasModel | null;
  verdict: ValidationResult | null;
  /** Parse faults in the SL text as of its last compile. */
  faults: number;
  previewing: boolean;
  focus: boolean;
  onToggleFocus: () => void;
  /** The verdict chip opens Read, where the review lives. */
  onVerdict: () => void;
  kernelLoaded: boolean;
}) {
  const clean = verdict !== null && verdict.issues.length === 0;
  const compileState =
    faults > 0 ? `${faults} SL fault${faults === 1 ? "" : "s"}` : previewing ? "previewing a draft" : "compiled";
  return (
    <div
      className="flex shrink-0 items-center gap-3 border-t px-3 py-1 text-[11px]"
      style={{ borderColor: "var(--hairline)", background: "var(--bg-secondary)", color: "var(--text-muted)" }}
      data-testid="status-bar"
    >
      {model && (
        <>
          <button
            onClick={onVerdict}
            title={`The kernel's verdict at ${MODE_BY_LENS[model.lens]} mode under ${model.lens}. Opens Read.`}
            data-testid="verdict-chip"
          >
            <Pill tone={verdict === null ? "neutral" : clean ? "ok" : "warning"}>
              {verdict === null
                ? "…"
                : clean
                  ? "✓ clean"
                  : `${verdict.issues.length} issue${verdict.issues.length === 1 ? "" : "s"}`}
            </Pill>
          </button>
          <span>
            {model.things.length} thing{model.things.length === 1 ? "" : "s"} · {model.relations.length} relation
            {model.relations.length === 1 ? "" : "s"}
          </span>
          <span style={{ color: faults > 0 ? "var(--verdict-error)" : undefined }}>{compileState}</span>
        </>
      )}
      <span className="ml-auto flex items-center gap-3">
        <button
          onClick={onToggleFocus}
          aria-pressed={focus}
          title={focus ? "Exit Focus (Esc)" : "Focus: the primary surface fills the window (⌃⌥F)"}
          className="rounded-full px-2 py-0.5"
          style={{
            border: "1px solid var(--hairline)",
            background: focus ? "var(--accent)" : "transparent",
            color: focus ? "var(--text-on-accent)" : "var(--text-secondary)",
          }}
        >
          Focus
        </button>
        <span
          className="inline-flex items-center gap-1.5"
          style={{ fontFamily: "var(--font-mono)" }}
          title="crates/ = truth · web/ = face"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: kernelLoaded ? "var(--accent)" : "var(--text-muted)" }}
          />
          {kernelLoaded ? "kernel · wasm" : "loading…"} · SL v{SL_VERSION}
        </span>
      </span>
    </div>
  );
}
