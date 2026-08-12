// The inspector dock — the workbench's right-edge instrument panel. The three
// analysis faces (Run / Formal / Review) share one docked column and show one at
// a time behind a tab strip, so the canvas keeps the viewport while the active
// reading sits beside it. Placement only: each tab hosts the existing panel
// unchanged (same props, same kernel-fed data). The dock decides nothing — it
// arranges. Frost chrome, lens-tinted active tab (rides the --lens-* seam).
import { useEffect, useState } from "react";
import type {
  CanvasModel,
  IssueTarget,
  Lens,
  LensDescription,
  Manifest,
  MarkovRunResult,
  Relation,
  RunResultRich,
  Thing,
  ValidationResult,
} from "./kernel/types";
import { RunInputs } from "./RunInputs";
import { ModelAbout } from "./ModelAbout";
import { NodeEditorRows, type DecomposeAffordance } from "./canvas/NodeEditor";
import { ElementMechanism } from "./ElementMechanism";
import { LensPalette, type RunKind } from "./canvas/lenses/registry";
import { DtmcPanel, RunPanel, weightProvenance } from "./RunPanel";
import { FormalPanel } from "./FormalPanel";
import { ReviewPanel } from "./ReviewPanel";
import { AnalystPanel } from "./AnalystPanel";
import { KernelErrorBoundary } from "./KernelErrorBoundary";
import { Card, Verdict } from "./ui";

/** The dock's faces, in strip order — the single source for both the rendered
 *  tab strip and the width gate in InspectorDock.test.tsx, so a tab cannot be
 *  added to one without the other seeing it. `element` shows only when the
 *  author has a selection; `review` is the one that carries an issue badge.
 *
 *  #312 move 1: `type` is gone from this list. The model's asserted kind is
 *  authoring metadata, not a live reading, and it now opens from the model's
 *  name in the menu bar. */
export const DOCK_TABS = [
  { id: "element", label: "Element" },
  { id: "run", label: "Run" },
  { id: "formal", label: "Formal" },
  { id: "review", label: "Review" },
  { id: "analyst", label: "Analyst" },
] as const;

type Tab = (typeof DOCK_TABS)[number]["id"];

/** The selected element's editing surface, as the shell hands it over (#122).
 *  Null thing = nothing selected; the face says so rather than vanishing. */
export interface ElementSelection {
  thing: Thing | null;
  lens: Lens;
  decompose: DecomposeAffordance | null;
  onUpdate: (t: Thing) => void;
  onDelete: () => void;
  onDeselect: () => void;
}

export function InspectorDock({
  result,
  markovRun,
  ranEdited,
  runManifest,
  onInputEdit,
  onResetInputs,
  blurb,
  time,
  runError,
  desc,
  verdict,
  issueTargets,
  analysisError,
  hostError,
  canvasModel,
  onNavigate,
  onAcceptUnit,
  element,
  selectionKey,
  resetKeys,
  focused,
  onToggleFocus,
  tick,
  reviewRequest,
  reviewedAt,
  onReview,
  formalRequest,
}: {
  result: RunResultRich | null;
  /** #282: the DTMC run (#67) — the Run tab's result when the active lens
   *  declares `run: "dtmc"`. App keeps result/markovRun mutually exclusive. */
  markovRun: MarkovRunResult | null;
  /** ADR run-seam-canvas-document: whether the last run executed the edited
   *  canvas's projection rather than the shipped calibration artifact. */
  ranEdited?: boolean;
  /** The active demo's manifest (null = no runnable bundle) — the inputs card
   *  reads it to mark data-driven flows as such. */
  runManifest?: Manifest | null;
  /** Walkthrough #11: an inputs-card edit — update the relation and re-run. */
  onInputEdit?: (next: Relation) => void;
  /** Restore the model's declared amounts (derived from the demo's .sl). */
  onResetInputs?: () => void;
  /** The run's time controls (Δt/T relocation): committed edits re-run over
   *  the new slice via the same grammar as an inputs edit. */
  time?: { dt: number; t: number; klir: boolean; onCommit: (dt: number, t: number) => void };
  /** The demo bundle's description, shown on the model-level about (#15). */
  blurb?: string;
  runError: string | null;
  desc: LensDescription | null;
  verdict: ValidationResult | null;
  issueTargets: IssueTarget[];
  analysisError: string | null;
  /** A failure of the HOST, not a verdict (#233 §4) — model resolution dying
   *  before the kernel judged anything. Rendered in its own region above the
   *  review, never as a row inside it. */
  hostError: string | null;
  canvasModel: CanvasModel | null;
  onNavigate: (target: IssueTarget) => void;
  /** #94: run panel's accept-derived-unit affordance — writes a derived stock
   *  unit into the authoring model as declared. Placement only; App owns it. */
  onAcceptUnit?: (name: string, unit: string) => void;
  /** #154 P1: SimScrubber tick, forwarded to RunPanel's state-space marker. */
  tick?: number;
  resetKeys: unknown[];
  /** #122: the canvas's element editor lives HERE, not in a popover at the
   *  pointer. Null in a surface that carries its own inline editor (the Klir
   *  and Bunge registers), which then owns the element face itself. */
  element: ElementSelection | null;
  /** An opaque key for "the author has something selected right now" — thing,
   *  relation, or interface capsule — or null for nothing. Ephemeral interaction
   *  state only: the dock reads it to decide whether to stand open, never to
   *  decide anything about the model. */
  selectionKey: string | null;
  // #57: focus mode. When on, the parent hides the palette + canvas and this
  // dock fills the whole work region so the active tab reads as a full screen.
  focused: boolean;
  onToggleFocus: () => void;
  /** #204: the author invoking a review. Bumped by the workbench's Review
   *  action; each bump raises the review tab (an invoked review must land
   *  somewhere visible). */
  reviewRequest: number;
  /** Wall-clock stamp of the last invoked review, null before the first. */
  reviewedAt: string | null;
  onReview: () => void;
  /** The SL pane's compile chain pointing at step 3 (`describe`). Same bump
   *  contract as `reviewRequest`: each increment raises the Formal tab, so the
   *  chain's "open Formal" lands somewhere visible instead of firing into a
   *  tab the author never opened. */
  formalRequest: number;
}) {
  // Whether the dock stands open follows the MODEL until the author says
  // otherwise. A blank model has nothing to inspect, so a full instrument column
  // standing over an empty canvas is noise and the dock starts as a rail; a
  // model that already carries content has plenty to read, so opening a worked
  // example lands ready. Null = follow the model. A boolean = the author's own
  // word, which stands until a different model loads.
  const [tab, setTab] = useState<Tab>("run");
  const [collapseChoice, setCollapseChoice] = useState<boolean | null>(null);
  const modelIsEmpty =
    !canvasModel || (canvasModel.things.length === 0 && canvasModel.relations.length === 0);
  const collapsed = collapseChoice ?? modelIsEmpty;
  const setCollapsed = setCollapseChoice;
  const issueCount = verdict?.issues.length ?? 0;

  // A different model is a fresh start: the author's collapse choice was about
  // the last one, so it lapses and the dock follows the new model again. Model
  // IDENTITY, not the model object — an edit must never re-open a dock the
  // author just shut.
  const modelKey = canvasModel?.model_id ?? canvasModel?.name ?? null;
  useEffect(() => {
    setCollapseChoice(null);
  }, [modelKey]);

  // Selecting a thing on the canvas raises its editor here — the docked
  // replacement for the popover that used to mount under the pointer. An
  // arriving selection also un-collapses the dock: a click that produced no
  // visible response would read as a dead click.
  const selectedId = element?.thing?.id ?? null;
  useEffect(() => {
    if (selectedId === null) return;
    setTab("element");
    setCollapsed(false);
  }, [selectedId]);

  // Any selection at all opens the dock, not just a thing: an edge or an
  // interface capsule is equally something to inspect, and a click that
  // produced no visible response reads as a dead click. Only the element
  // selection above claims the tab; this one just opens the column.
  useEffect(() => {
    if (selectionKey === null) return;
    setCollapsed(false);
  }, [selectionKey]);

  // An invoked review raises its own report — otherwise the action fires into a
  // tab the author never opens.
  useEffect(() => {
    if (reviewRequest === 0) return;
    setTab("review");
    setCollapsed(false);
  }, [reviewRequest]);

  // The SL pane's compile chain asking for step 3. Same shape as the review
  // bump above: the chain names the formal object, this puts it on screen
  // beside the text that produced it.
  useEffect(() => {
    if (formalRequest === 0) return;
    setTab("formal");
    setCollapsed(false);
  }, [formalRequest]);

  // Focus wins over the thin collapse rail — a full-width dock can't be a sliver.
  if (collapsed && !focused) {
    return (
      // The whole rail is the affordance, not just the caret: it is the only
      // way back to the instrument column by hand, so it takes the full edge.
      <button
        onClick={() => setCollapsed(false)}
        title="Show inspector (Run, Formal, Review, Element)"
        aria-expanded={false}
        className="flex w-8 shrink-0 flex-col items-center gap-3 border-l py-2 transition-colors"
        style={{ borderColor: "var(--hairline)", background: "var(--lens-chrome)" }}
      >
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          ◂
        </span>
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)", writingMode: "vertical-rl" }}
        >
          inspector
        </span>
        {issueCount > 0 && (
          <span
            className="rounded-pill px-1 text-[10px] font-semibold"
            style={{
              borderRadius: "var(--radius-pill)",
              background: "var(--lens-accent)",
              color: "var(--text-on-accent)",
            }}
          >
            {issueCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      // Shrinkable under pressure (#17): 24rem by preference, yielding down to
      // 18rem at narrow windows instead of pushing the row past the viewport.
      className={`flex flex-col border-l ${focused ? "min-h-0 flex-1" : "min-w-72 shrink basis-96"}`}
      style={{ borderColor: "var(--hairline)", background: "var(--lens-chrome)" }}
    >
      {/* Tab strip — the instrument's face selector. The active tab carries the
          lens accent (underline + text), the rest stay quiet.

          Two cells, and the split is load-bearing: when tabs and controls
          shared one non-shrinking row the overflow pushed the LAST tabs and
          BOTH controls past the right edge — so the dock had no visible way to
          close and Analyst ran off the screen. The tabs scroll under pressure;
          the controls are pinned.

          #312 move 1: Type left this strip for the model name in the menu bar.
          It was model metadata, set once at authoring time, competing with live
          readings for a slot. Every remaining tab is a reading of the model or
          of the selection. Tab widths are bound by InspectorDock.test.tsx. */}
      <div
        className="flex items-stretch border-b"
        style={{ borderColor: "var(--hairline)" }}
      >
        <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
        {DOCK_TABS.map(({ id, label }) =>
          id === "element" && !element ? null : (
            <TabButton
              key={id}
              label={label}
              active={tab === id}
              onClick={() => setTab(id)}
              badge={id === "review" && issueCount > 0 ? issueCount : undefined}
            />
          ),
        )}
        </div>
        <div className="flex shrink-0 items-stretch">
          {/* Focus toggle — pops the active tab full-width (hides the canvas) and
              back. Same quiet glyph-button chrome as the collapse control. */}
          <button
            onClick={onToggleFocus}
            title={focused ? "Exit focus (show canvas)" : "Focus — expand this tab full-width"}
            aria-pressed={focused}
            className="px-3 text-xs"
            style={{ color: focused ? "var(--lens-accent)" : "var(--text-muted)" }}
          >
            {focused ? "⤡" : "⤢"}
          </button>
          {/* Collapse to a sliver — only meaningful in the docked (non-focus)
              layout; full-width focus can't collapse to a rail. */}
          {!focused && (
            <button
              onClick={() => setCollapsed(true)}
              title="Collapse inspector"
              className="px-3 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              ▸
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* In focus mode the panel gets the whole row; hold it to a comfortable
            reading measure so it reads as a designed screen, not a stretched
            dock (harvested from #55's PanelScreen shell). */}
        <div className={focused ? "mx-auto w-full max-w-4xl" : undefined}>
          <KernelErrorBoundary resetKeys={resetKeys}>
            {tab === "element" &&
              (element?.thing ? (
                <>
                  <NodeEditorRows
                    thing={element.thing}
                    lens={element.lens}
                    decompose={element.decompose}
                    onUpdateThing={element.onUpdate}
                    onDelete={element.onDelete}
                    onClose={element.onDeselect}
                  />
                  {/* What this node DOES (walkthrough #13) — flows, substance,
                      declared magnitudes, and its recorded trajectory. */}
                  {canvasModel && (
                    <ElementMechanism thing={element.thing} model={canvasModel} result={result} tick={tick ?? 0} />
                  )}
                </>
              ) : canvasModel ? (
                /* The home slot (walkthrough #15): with nothing selected, the
                   MODEL is the element — name, kind, domain, blurb,
                   composition, and data provenance, all derived. */
                <ModelAbout model={canvasModel} manifest={runManifest ?? null} blurb={blurb} />
              ) : (
                <Placeholder>Click a component or environment thing to edit it here.</Placeholder>
              ))}
            {tab === "run" && (
              <RunTab
                result={result}
                ranEdited={ranEdited}
                runError={runError}
                lens={canvasModel?.lens ?? "Klir"}
                onAcceptUnit={onAcceptUnit}
                tick={tick}
                model={canvasModel}
                manifest={runManifest ?? null}
                onInputEdit={onInputEdit}
                onResetInputs={onResetInputs}
                time={time}
                focused={focused}
                onToggleFocus={onToggleFocus}
                runKind={canvasModel ? LensPalette[canvasModel.lens].run : "conservation"}
                markovRun={markovRun}
              />
            )}
            {tab === "formal" && <FormalTab desc={desc} analysisError={analysisError} />}
            {tab === "review" && (
              <ReviewTab
                model={canvasModel}
                verdict={verdict}
                issueTargets={issueTargets}
                analysisError={analysisError}
                hostError={hostError}
                reviewedAt={reviewedAt}
                onReview={onReview}
                onNavigate={onNavigate}
              />
            )}
            {tab === "analyst" &&
              (canvasModel ? (
                <AnalystPanel canvasModel={canvasModel} onNavigate={onNavigate} />
              ) : (
                <Placeholder>Open or import a model to analyze it.</Placeholder>
              ))}
          </KernelErrorBoundary>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors"
      style={{
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        borderBottom: `2px solid ${active ? "var(--lens-accent)" : "transparent"}`,
        marginBottom: "-1px",
        transition: "var(--transition-base)",
      }}
    >
      {label}
      {badge !== undefined && (
        <span
          className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] font-medium tabular"
          style={{ background: "var(--verdict-warning)", color: "var(--text-on-accent)" }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// The empty / waiting state for a tab whose kernel output isn't there yet.
function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 py-6 text-sm" style={{ color: "var(--text-muted)" }}>
      {children}
    </p>
  );
}

function RunTab({
  result,
  ranEdited,
  runError,
  lens,
  onAcceptUnit,
  tick,
  model,
  manifest,
  onInputEdit,
  onResetInputs,
  time,
  focused,
  onToggleFocus,
  runKind,
  markovRun,
}: {
  result: RunResultRich | null;
  ranEdited?: boolean;
  runError: string | null;
  lens: CanvasModel["lens"];
  onAcceptUnit?: (name: string, unit: string) => void;
  tick?: number;
  model?: CanvasModel | null;
  manifest?: Manifest | null;
  onInputEdit?: (next: Relation) => void;
  onResetInputs?: () => void;
  time?: { dt: number; t: number; klir: boolean; onCommit: (dt: number, t: number) => void };
  /** #283: the dock's focus toggle, surfaced on the Result card too. */
  focused?: boolean;
  onToggleFocus?: () => void;
  /** #282: the lens's declared run semantics — this tab renders from it. */
  runKind: RunKind;
  /** #282: the DTMC run (#67), when the declared kind is dtmc. */
  markovRun: MarkovRunResult | null;
}) {
  // The inputs card renders above WHATEVER the run state is — including a
  // refusal, since fix-the-number-and-rerun is exactly the loop it exists for.
  const inputs =
    model && manifest && onInputEdit ? (
      <RunInputs model={model} manifest={manifest} onEdit={onInputEdit} onReset={onResetInputs} />
    ) : null;
  // The run's time slice, docked with the run (Δt/T relocation). Commit
  // re-runs immediately; under Klir only the horizon means anything (a DTMC
  // advances in steps, not Δt-sized slices).
  const timeRow = time ? <TimeRow time={time} /> : null;
  // #283 (placement per Shingai's review): the focus toggle sits at the very
  // top of the run tab, above Time and outside every card — a real button,
  // not a header ornament. Same #57 focus state the tab-strip ⤢ drives.
  const expandRow = onToggleFocus ? (
    <div className="flex justify-end">
      <button
        onClick={onToggleFocus}
        title={focused ? "Exit focus (show canvas)" : "Focus — expand the run full-width"}
        aria-pressed={focused}
        className="rounded-full border px-3 py-1 text-xs font-medium"
        style={{
          borderColor: "var(--border)",
          color: focused ? "var(--text-on-accent)" : "var(--lens-accent)",
          background: focused ? "var(--lens-accent)" : "var(--bg-surface)",
        }}
      >
        {focused ? "⤡ Exit focus" : "⤢ Expand run"}
      </button>
    </div>
  ) : null;
  // #282, decided 2026-08-01: Bunge does not run. The lens's own register says
  // it — no mechanism stated (⊘M) — so executing Mobus's engine under this
  // reading was a lens leak. The deck states the refusal instead of borrowing
  // furniture; the conservation result (if a demo ran) waits under Mobus.
  if (runKind === "none") {
    return (
      <div className="grid gap-5">
        {expandRow}
        <Card title="Result" source="bert-core · wasm">
          <Verdict tone="warning">no mechanism stated (⊘M) — reads as a black box</Verdict>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            This lens declares composition, environment, and structure — never a
            mechanism. There is nothing to run. Read the model under Mobus to
            execute its declared dynamics, or under Klir to evolve it as a state
            machine.
          </p>
        </Card>
      </div>
    );
  }
  // #282: the DTMC deck — steps and occupancy, no Δt, no conservation chrome.
  if (runKind === "dtmc") {
    return (
      <div className="grid gap-5">
        {expandRow}
        {timeRow}
        {runError ? (
          <Card title="Result" source="bert-compose · wasm">
            <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
              {runError}
            </p>
          </Card>
        ) : markovRun ? (
          <DtmcPanel
            run={markovRun}
            tick={tick}
            weights={model ? weightProvenance(model.relations) : undefined}
          />
        ) : (
          <Placeholder>
            Run evolves this state machine as a Markov chain — steps and state
            occupancy, not Δt. Set the steps above and press ▶ Run, or ⏭ Step
            one tick at a time.
            {model &&
              model.relations.length > 0 &&
              weightProvenance(model.relations) === "defaulted" &&
              " Transition weights are undeclared, so the chain will run uniform — add `weight <n>` to a flow to calibrate it."}
          </Placeholder>
        )}
      </div>
    );
  }
  if (runError) {
    return (
      <div className="grid gap-5">
        {expandRow}
        {timeRow}
        {inputs}
        <Card title="Result" source="bert-compose · wasm">
          <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
            {runError}
          </p>
        </Card>
      </div>
    );
  }
  if (result)
    return (
      <div className="grid gap-5">
        {expandRow}
        {timeRow}
        {inputs}
        <RunPanel
          result={result}
          ranEdited={ranEdited}
          lens={lens}
          onAcceptUnit={onAcceptUnit}
          tick={tick}
          model={model}
        />
      </div>
    );
  return (
    <div className="grid gap-5">
      {expandRow}
      {timeRow}
      {inputs}
      <Placeholder>
        {manifest
          ? // #297: the model opens at zero — loaded, mapped, and waiting for
            // the author's horizon. Nothing has run until Run is pressed.
            "The model is loaded and nothing has run. Set the run length in Time and press ▶ Run — or ⏭ Step one tick at a time."
          : "Run needs a demo bundle (model + CSV + mapping) to force the simulation."}
      </Placeholder>
    </div>
  );
}

/** The run's time slice (Δt/T relocation): step size and horizon, docked with
 *  the run they govern. Commit (Enter/blur) re-runs over the new slice — the
 *  inputs-card grammar. Under Klir only the horizon renders (a DTMC advances
 *  in steps; Δt is not a Klir word). */
function TimeRow({
  time,
}: {
  time: { dt: number; t: number; klir: boolean; onCommit: (dt: number, t: number) => void };
}) {
  // Plain words lead, the formal symbol rides muted beside them (#297 review:
  // Δt and T alone assume the reader arrives knowing Mobus's time base).
  const field = (
    label: string,
    symbol: string | null,
    value: number,
    commit: (v: number) => void,
    title: string,
  ) => (
    <label className="flex items-center gap-1.5 text-xs" title={title} style={{ color: "var(--text-secondary)" }}>
      {label}
      {symbol && (
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {symbol}
        </span>
      )}
      <input
        key={value}
        type="number"
        defaultValue={value}
        min={0}
        step="any"
        onBlur={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v) && v > 0 && v !== value) commit(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-16 rounded-md px-1.5 py-0.5 text-xs tabular"
        style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
      />
    </label>
  );
  return (
    <Card title="Time" source="the run's slice · edits re-run">
      <div className="flex flex-wrap items-center gap-4">
        {!time.klir &&
          field(
            "step size",
            "Δt",
            time.dt,
            (v) => time.onCommit(v, time.t),
            "how much model time passes each tick, in the model's time unit — totals are Δt-invariant (dt_invariance)",
          )}
        {field(
          time.klir ? "steps" : "run length",
          time.klir ? null : "T",
          time.t,
          (v) => time.onCommit(time.dt, v),
          time.klir
            ? "how many transitions the chain takes"
            : "total model time the run covers — run length ÷ step size = ticks",
        )}
      </div>
    </Card>
  );
}

function FormalTab({ desc, analysisError }: { desc: LensDescription | null; analysisError: string | null }) {
  if (analysisError) return <RejectedCard message={analysisError} />;
  if (desc) return <FormalPanel desc={desc} />;
  return <Placeholder>Open or import a model to see its formal object in the active lens.</Placeholder>;
}

function ReviewTab({
  model,
  verdict,
  issueTargets,
  analysisError,
  hostError,
  reviewedAt,
  onReview,
  onNavigate,
}: {
  model: CanvasModel | null;
  verdict: ValidationResult | null;
  issueTargets: IssueTarget[];
  analysisError: string | null;
  hostError: string | null;
  reviewedAt: string | null;
  onReview: () => void;
  onNavigate: (target: IssueTarget) => void;
}) {
  if (analysisError) return <RejectedCard message={analysisError} />;
  if (!verdict || !model)
    return <Placeholder>Open or import a model to review it against the kernel.</Placeholder>;
  return (
    <div className="grid gap-4">
      {/* Outside the review, by construction: the kernel judged nothing here. */}
      {hostError && <HostFailureCard message={hostError} />}
      <ReviewPanel
        model={model}
        validation={verdict}
        targets={issueTargets}
        reviewedAt={reviewedAt}
        onReview={onReview}
        onNavigate={onNavigate}
      />
    </div>
  );
}

/** A failure of the app around the kernel — storage, resolution, the network.
 *  It is NOT a verdict and must never read as one: no severity, no citation, no
 *  doc anchor, and its own card above the review (#233 §4). */
function HostFailureCard({ message }: { message: string }) {
  return (
    <Card title="The app could not complete a check" source="app · not the kernel">
      <p className="text-sm" style={{ color: "var(--text-primary)" }}>
        {message}
      </p>
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        This is the app failing, not the kernel refusing your model. Nothing below was affected by it.
      </p>
    </Card>
  );
}

// The kernel-rejected notice, shared by the Formal and Review tabs (both read the
// same projection, so a rejection blanks both).
function RejectedCard({ message }: { message: string }) {
  return (
    <Card title="Kernel rejected this state" source="bert-core · wasm">
      <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
        {message}
      </p>
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        The canvas still shows the structure. Switch lens, undo the last edit, or load another demo to clear this.
      </p>
    </Card>
  );
}
