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

import { useEffect, useRef, useState } from "react";
import { compileSl, emitSl, splicePositions } from "./kernel";
import { Button } from "./ui";
import { Icon } from "./icons";
import { SlEditor } from "./sl/SlEditor";
import type { CanvasModel, SlError } from "./kernel/types";
import { CoAuthorMode } from "./CoAuthorMode";
import { GrammarLink, SlChain, SlStatusLine } from "./SlChain";
import { SL_ARRANGEMENTS, previewGateInPane, type SlArrangement } from "./slArrangement";
import type { SlChainProps } from "./SlChain";
import type { CoauthorSeed, CoauthorTurn, DraftOutcome, DraftStage } from "./coauthor";

type Mode = "sl" | "coauthor";

interface SlPaneProps {
  text: string;
  errors: SlError[];
  onTextChange: (text: string) => void;
  onErrors: (errors: SlError[]) => void;
  /** Receives the compiled model; the parent owns lens preservation + resets.
   *  `lensExplicit` = the text pinned a lens via `@lens`. */
  onCompiled: (model: CanvasModel, lensExplicit: boolean) => void;
  /** Absent when the mode decides whether the pane shows (#409). */
  onClose?: () => void;
  /** How the pane and the diagram share the width. The parent owns it, since
   *  the parent is what hides the diagram. Absent = side by side, no control. */
  arrangement?: SlArrangement;
  onArrangement?: (next: SlArrangement) => void;
  /** Set while a compiled draft waits on Accept/Discard. The canvas banner is
   *  that gate; with the diagram hidden the pane shows it instead. */
  preview?: { onAccept: () => void; onDiscard: () => void };
  /** The current canvas model, for the text←canvas direction (null = none). */
  canvasModel: CanvasModel | null;
  /** #10: the co-author mode. Undefined = authoring off (the pane stays a
   *  pure human/kernel surface, no mode switch shown) — window-on-demand,
   *  never ambient. The parent owns the whole draft->compile->preview->record
   *  sequence (onDraft); this pane only switches back to the SL view once it
   *  resolves, so the compiled/faulty text is visible either way. */
  /** The compile chain strip (text → model → formal object → verdict). The
   *  parent owns the analysis, so it hands the kernel's `describe`/verdict down
   *  rather than this pane re-asking. Optional: the pane is usable without it,
   *  and a pane with no model to analyze has no chain to show. `text` and
   *  `model` come from the props above — only the kernel outputs are passed. */
  chain?: Omit<SlChainProps, "text" | "model">;
  /** Tier 4 (#353): shared selection over names. The parent owns both maps
   *  (name↔id from the compiled model, name↔line from the text); this pane
   *  only forwards the editor's cursor line up and a focus request down. */
  selection?: {
    onCursorLine: (line: number) => void;
    focusLine: { line: number; nonce: number } | null;
  };
  /** #409 M2: in Write the drafting box sits beneath the editor, so the
   *  text stays in view while drafting and the SL / Co-author switch is not
   *  shown. Without it the co-author is a mode of the pane, as before. */
  drafterDocked?: boolean;
  /** #418 item 3: in Focus the docked box folds to a strip until reached for. */
  drafterFolded?: boolean;
  /** Something for the header's right end, beside the title (Build's drawer
   *  puts its way to Write there). */
  header?: React.ReactNode;
  coauthor?: {
    turns: CoauthorTurn[];
    /** `onStage` is #218's progress feed — the parent's draft call reports
     *  which phase it is in (asking / compiling / retrying) as it happens. */
    onDraft: (description: string, onStage?: (stage: DraftStage) => void) => Promise<DraftOutcome>;
    /** #314: correct a past turn's draft in plain language. Same seam as
     *  `onDraft` — the parent asks the drafter, compiles the result, and
     *  previews it; this pane only returns to the SL view afterwards. */
    onCorrect: (turnId: string, correction: string, onStage?: (stage: DraftStage) => void) => Promise<DraftOutcome>;
    /** A description from the start surface: the pane opens on the co-author
     *  tab with it, and the tab reports back once it has taken it. */
    seed?: CoauthorSeed | null;
    onSeedTaken?: () => void;
  };
}

const PANE_WIDTH_KEY = "sl-pane-width";
const PANE_WIDTH_DEFAULT = 480;
const PANE_WIDTH_MIN = 320;
const PANE_WIDTH_MAX = 960;

function clampPaneWidth(w: number): number {
  return Number.isFinite(w) ? Math.min(PANE_WIDTH_MAX, Math.max(PANE_WIDTH_MIN, w)) : PANE_WIDTH_DEFAULT;
}

function initialPaneWidth(): number {
  try {
    const stored = Number(localStorage.getItem(PANE_WIDTH_KEY));
    return stored ? clampPaneWidth(stored) : PANE_WIDTH_DEFAULT;
  } catch {
    return PANE_WIDTH_DEFAULT;
  }
}

function persistPaneWidth(w: number) {
  try {
    localStorage.setItem(PANE_WIDTH_KEY, String(w));
  } catch {
    // private mode etc. — the width just won't survive a reload
  }
}

const DETAILS_KEY = "sl-pane-details";

function initialDetailsOpen(): boolean {
  try {
    return localStorage.getItem(DETAILS_KEY) === "open";
  } catch {
    return false;
  }
}

export function SlPane({
  text,
  errors,
  onTextChange,
  onErrors,
  onCompiled,
  onClose,
  arrangement = "split",
  onArrangement,
  preview,
  drafterDocked = false,
  drafterFolded = false,
  header,
  canvasModel,
  chain,
  selection,
  coauthor,
}: SlPaneProps) {
  const [detailsOpen, setDetailsOpen] = useState(initialDetailsOpen);
  function toggleDetails() {
    setDetailsOpen((open) => {
      try {
        localStorage.setItem(DETAILS_KEY, open ? "closed" : "open");
      } catch {
        // private mode etc. — the choice just won't survive a reload
      }
      return !open;
    });
  }
  const [mode, setMode] = useState<Mode>(coauthor?.seed ? "coauthor" : "sl");
  const seedNonce = coauthor?.seed?.nonce;
  useEffect(() => {
    if (seedNonce !== undefined) setMode("coauthor");
  }, [seedNonce]);
  // Room to breathe: the pane is drag-resizable at its right edge (SL reads
  // best when flow lines don't fold), remembered across sessions.
  const [paneWidth, setPaneWidth] = useState(initialPaneWidth);
  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = paneWidth;
    const move = (ev: PointerEvent) => setPaneWidth(clampPaneWidth(startW + ev.clientX - startX));
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      persistPaneWidth(clampPaneWidth(startW + ev.clientX - startX));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  // Faults describe the text as of their compile; once the author types past
  // them they are history, not the present — dimmed and labeled, never
  // silently persisted as if still true. Cleared whenever a fresh fault list
  // arrives (any compile path: button, ⌘⏎, co-author).
  const [editedSinceCompile, setEditedSinceCompile] = useState(false);
  useEffect(() => setEditedSinceCompile(false), [errors]);
  // A fault row, pressed, asks the editor for its line through the same
  // focusLine channel the parent's selection uses (SlEditor scrolls and
  // flashes it). The parent's request, when one arrives, takes over again.
  const [faultFocus, setFaultFocus] = useState<{ line: number; nonce: number } | null>(null);
  const parentFocus = selection?.focusLine ?? null;
  useEffect(() => setFaultFocus(null), [parentFocus]);

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

  // Canvas → text, the NON-DESTRUCTIVE half (#327). `fromCanvas` above
  // replaces the pane with the model serialized, which is right when the
  // canvas is the source of truth and wrong when the text is: a documented
  // file has comments, blank lines and an authored order, none of which are in
  // the model, so a re-emit trades all of it for four position numbers (#262).
  // This asks the kernel to rewrite ONLY the `@pos` lines and hand back every
  // other byte untouched — the drag is saved, the prose survives.
  function layoutFromCanvas() {
    if (!canvasModel) return;
    try {
      onTextChange(splicePositions(text, canvasModel));
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
  // view once there is text to look at (compiled preview OR the faulty draft
  // + its errors). A drafter that could not be reached wrote nothing, so the
  // pane stays on the co-author tab, where the failure and the retry are.
  async function handleDraft(description: string, onStage?: (stage: DraftStage) => void): Promise<DraftOutcome> {
    if (!coauthor) return { produced: false };
    const outcome = await coauthor.onDraft(description, onStage);
    if (outcome.produced) setMode("sl");
    return outcome;
  }

  // The correction action, the same shape: the parent owns the ask, the
  // compile, and the preview; the pane returns to the SL view so the revised
  // text (or its faults) is where the author expects to look.
  async function handleCorrect(
    turnId: string,
    correction: string,
    onStage?: (stage: DraftStage) => void,
  ): Promise<DraftOutcome> {
    if (!coauthor) return { produced: false };
    const outcome = await coauthor.onCorrect(turnId, correction, onStage);
    if (outcome.produced) setMode("sl");
    return outcome;
  }

  function handleLoad(sl: string) {
    onTextChange(sl);
    setMode("sl");
  }

  // The two canvas-to-text actions. Which one sits beside Compile depends on
  // the moment: an empty page wants the whole model, a written one wants only
  // its positions refreshed. The other waits under details.
  const fromCanvasButton = (
    <Button
      variant="quiet"
      icon="back"
      onClick={fromCanvas}
      disabled={!canvasModel}
      title={canvasModel ? "Replace the text with the current canvas model, serialized" : "No model on the canvas yet"}
    >
      From canvas
    </Button>
  );
  const layoutOnlyButton = (
    <Button
      variant="quiet"
      icon="back"
      onClick={layoutFromCanvas}
      disabled={!canvasModel}
      title={
        canvasModel
          ? "Update only the @pos lines from the canvas — comments and everything else in this text are left untouched"
          : "No model on the canvas yet"
      }
    >
      Layout only
    </Button>
  );

  // Folded to a rail: the text is one click away, which is not the same as
  // closed. Same shape as the inspector's rail on the other edge.
  if (arrangement === "diagram") {
    return (
      <button
        onClick={() => onArrangement?.("split")}
        title="Show the SL text beside the diagram"
        aria-expanded={false}
        className="flex w-8 shrink-0 flex-col items-center gap-3 border-r py-2 transition-colors"
        style={{ borderColor: "var(--hairline)", background: "var(--bg-secondary)" }}
        data-testid="sl-rail"
      >
        <Icon name="chevron-right" size={16} style={{ color: "var(--text-muted)" }} />
        <span
          className="text-[11px] font-semibold uppercase"
          style={{ color: "var(--text-muted)", writingMode: "vertical-rl", letterSpacing: "var(--tracking-label)" }}
        >
          SL text
        </span>
      </button>
    );
  }

  const full = arrangement === "sl";

  return (
    <aside
      className={`relative flex min-w-0 flex-col border-r${full ? " flex-1" : ""}`}
      style={{ width: full ? undefined : paneWidth, borderColor: "var(--hairline)", background: "var(--bg-secondary)" }}
    >
      {!full && (
        <div
          className="sl-pane-resize absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize"
          title="Drag to resize · double-click to reset"
          onPointerDown={startResize}
          onDoubleClick={() => {
            setPaneWidth(PANE_WIDTH_DEFAULT);
            persistPaneWidth(PANE_WIDTH_DEFAULT);
          }}
        />
      )}
      <div
        className="flex flex-wrap items-center justify-between gap-y-1 border-b px-3 py-2"
        style={{ borderColor: "var(--hairline)" }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
          title="SL, the system language"
        >
          {full ? "SL — system language" : "SL"}
        </span>
        <div className="flex items-center gap-2">
          {header}
          {onArrangement && (
            <div
              className="flex overflow-hidden rounded-sm"
              style={{ border: "1px solid var(--rule-strong)" }}
              role="group"
              aria-label="Arrangement"
            >
              {SL_ARRANGEMENTS.map((a) => (
                <ModeButton
                  key={a.value}
                  label={a.label}
                  title={a.title}
                  active={arrangement === a.value}
                  onClick={() => onArrangement(a.value)}
                />
              ))}
            </div>
          )}
          {coauthor && !drafterDocked && (
            <div
              className="flex overflow-hidden rounded-sm"
              style={{ border: "1px solid var(--rule-strong)" }}
              role="group"
              aria-label="Way of filling the text"
            >
              <ModeButton label="SL" active={mode === "sl"} onClick={() => setMode("sl")} />
              <ModeButton label="Co-author" active={mode === "coauthor"} onClick={() => setMode("coauthor")} />
            </div>
          )}
          {onClose && (
            <Button
              size={28}
              variant="quiet"
              icon="close"
              onClick={onClose}
              aria-label="Close the SL pane"
              title="Close the SL pane"
            />
          )}
        </div>
      </div>

      {/* The human-checks-meaning gate, carried here when the canvas banner
          that normally holds it is out of sight. */}
      {preview && previewGateInPane(arrangement, true, true) && (
        <div
          className="flex flex-wrap items-center gap-3 border-b px-3 py-2 text-sm"
          style={{ borderColor: "var(--accent)", color: "var(--text-primary)" }}
          data-testid="sl-preview-gate"
        >
          <span>Previewing a draft. It is not kept until you accept it.</span>
          <Button size={28} onClick={preview.onAccept}>
            Accept
          </Button>
          <Button size={28} variant="quiet" onClick={preview.onDiscard}>
            Discard
          </Button>
          {onArrangement && (
            <Button size={28} variant="quiet" onClick={() => onArrangement("split")}>
              see the diagram
            </Button>
          )}
        </div>
      )}

      {mode === "coauthor" && coauthor && !drafterDocked ? (
        <CoAuthorMode
          turns={coauthor.turns}
          onDraft={handleDraft}
          onCorrect={handleCorrect}
          onLoad={handleLoad}
          seed={coauthor.seed}
          onSeedTaken={coauthor.onSeedTaken}
        />
      ) : (
        <>
          <SlEditor
            value={text}
            errors={errors}
            stale={editedSinceCompile}
            onChange={(t) => {
              onTextChange(t);
              // The editor also reports the fill it was just handed (a draft,
              // a loaded turn); only a change to the text is an edit.
              if (t !== text) setEditedSinceCompile(true);
            }}
            onCompile={() => compile()}
            onCursorLine={selection?.onCursorLine}
            focusLine={faultFocus ?? parentFocus}
          />
          {errors.length > 0 && (
            <SlFaults
              errors={errors}
              stale={editedSinceCompile}
              onPick={(line) => setFaultFocus({ line, nonce: Date.now() })}
              tight={Boolean(drafterDocked && coauthor)}
            />
          )}
          {/* One row while authoring: the act, the one canvas action that
              fits the moment, and where the text stands. The rest is folded
              under details, closed unless the author opened it. */}
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-3 py-2"
            style={{ borderColor: "var(--hairline)" }}
          >
            <Button onClick={() => compile()} title="Compile SL → model (⌘⏎) · deterministic compile, kernel verdicts">
              Compile
            </Button>
            {text.trim() === "" ? fromCanvasButton : layoutOnlyButton}
            <SlStatusLine
              model={canvasModel}
              verdict={chain?.verdict ?? null}
              faults={errors.length}
              edited={editedSinceCompile}
            />
            <span className="ml-auto flex items-center gap-3">
              <GrammarLink />
              <Button
                size={28}
                variant="quiet"
                icon={detailsOpen ? "chevron-up" : "chevron-down"}
                onClick={toggleDetails}
                aria-expanded={detailsOpen}
                data-testid="sl-details-toggle"
              >
                {detailsOpen ? "hide details" : "details"}
              </Button>
            </span>
          </div>
          {detailsOpen && (
            <div className="min-h-0 shrink overflow-y-auto" style={{ maxHeight: "45%" }}>
              <div
                className="flex flex-wrap items-center gap-2 border-t px-3 py-2"
                style={{ borderColor: "var(--hairline)" }}
              >
                {text.trim() === "" ? layoutOnlyButton : fromCanvasButton}
                <span className="inline-flex items-center gap-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  <Icon name="command" size={16} />
                  <Icon name="return" size={16} />
                  <span className="pl-1">compiles · deterministic compile, kernel verdicts</span>
                </span>
              </div>
              {/* What the compile produced, named step by step. It stays
                  visible with the dock's Formal tab, which is where step 3's
                  object is typeset in full. */}
              {chain && <SlChain text={text} model={canvasModel} {...chain} />}
            </div>
          )}
          {drafterDocked && coauthor && (
            <div
              // Yields to the editor's eight-line floor (sl audit #8) and
              // scrolls inside itself when it has to; 8px of foot so its last
              // row never sits flush on the pane's edge.
              className="min-h-0 shrink overflow-y-auto border-t pb-2"
              style={{ borderColor: "var(--hairline)", background: "var(--bg-primary)" }}
            >
              <CoAuthorMode
                docked
                folded={drafterFolded}
                turns={coauthor.turns}
                onDraft={handleDraft}
                onCorrect={handleCorrect}
                onLoad={handleLoad}
                seed={coauthor.seed}
                onSeedTaken={coauthor.onSeedTaken}
              />
            </div>
          )}
        </>
      )}
    </aside>
  );
}

/** The fault list (sl audit § 3, after GOV.UK's error summary): one row per
 *  fault, each a quiet button that takes the editor to its line; the line
 *  number is a mono numeral chip, a 2px bar in the verdict colour on the
 *  row's left edge, the message in 13px Inter. `role="alert"` so a failed
 *  compile is announced. Alt+ArrowDown / ArrowUp step between rows. Stale
 *  faults (the text has changed since) keep full ink and change their word.
 *  The words are the kernel's, untouched. */
function SlFaults({
  errors,
  stale,
  onPick,
  tight = false,
}: {
  errors: SlError[];
  stale: boolean;
  onPick: (line: number) => void;
  /** The drafter is docked below: the list holds three rows and scrolls, so
   *  the drafter's last row (the co-author's Turn on) stays in view. */
  tight?: boolean;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  function onKeyDown(e: React.KeyboardEvent) {
    if (!e.altKey || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    const rows = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    if (rows.length === 0) return;
    const at = rows.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === "ArrowDown" ? (at + 1) % rows.length : (at - 1 + rows.length) % rows.length;
    rows[next].focus();
    e.preventDefault();
  }
  const n = errors.length;
  return (
    <div
      role="alert"
      className={`${tight ? "max-h-28" : "max-h-40"} min-h-0 shrink overflow-y-auto border-t`}
      style={{ borderColor: "var(--hairline)" }}
      data-testid="sl-faults"
    >
      <p
        className="flex flex-wrap items-center gap-x-1 px-3 pt-2 pb-1 text-xs font-medium"
        style={{ color: stale ? "var(--text-secondary)" : "var(--verdict-error)" }}
      >
        {stale ? (
          <>
            {n} fault{n === 1 ? "" : "s"} from the last compile, the text has changed since
            <span className="inline-flex items-center gap-0.5 pl-1" style={{ color: "var(--text-muted)" }}>
              <Icon name="command" size={16} />
              <Icon name="return" size={16} />
              re-checks
            </span>
          </>
        ) : (
          <>
            {n} fault{n === 1 ? "" : "s"}
          </>
        )}
      </p>
      <ul ref={listRef} className="flex flex-col pb-1" onKeyDown={onKeyDown}>
        {errors.map((e, i) => (
          <li key={i}>
            <Button
              variant="quiet"
              onClick={() => onPick(e.line)}
              disabled={e.line < 1}
              title={e.line >= 1 ? `Go to line ${e.line}` : undefined}
              className="sl-fault-row h-auto w-full justify-start rounded-none px-3 py-1 text-left font-normal"
              style={{
                whiteSpace: "normal",
                border: "none",
                borderLeft: `2px solid ${stale ? "var(--text-muted)" : "var(--verdict-error)"}`,
                background: "transparent",
                color: "var(--text-primary)",
                fontSize: "var(--t-num)",
                lineHeight: "18px",
                cursor: e.line >= 1 ? "pointer" : "default",
              }}
            >
              <span className="sr-only">Fault{e.line >= 1 ? " on line" : ""} </span>
              {e.line >= 1 && (
                <span
                  className="tabular mr-2 inline-block shrink-0 rounded-sm px-1 align-baseline text-xs font-semibold"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: "var(--bg-surface)",
                    color: "var(--text-secondary)",
                    lineHeight: "18px",
                  }}
                >
                  {e.line}
                </span>
              )}
              <span className="min-w-0">{e.message}</span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModeButton({
  label,
  title,
  active,
  onClick,
}: {
  label: string;
  title?: string;
  active: boolean;
  onClick: () => void;
}) {
  // One segment of a group: the Button primitive at 28 with its own edge and
  // corners dropped, since the group carries them (rule 3: 4px on the group).
  return (
    <Button
      size={28}
      variant={active ? "primary" : "quiet"}
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className="rounded-none"
      style={{ border: "none" }}
    >
      {label}
    </Button>
  );
}
