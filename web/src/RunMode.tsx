// Run mode — the run leaves the inspector dock and becomes a MODE (#312 move 2,
// honoring #304). A run is not a reading of the model, it is an ACTIVITY with a
// timeline, inputs and results, so it belongs on the mode axis beside Structure
// and Data rather than in a 24rem column shared with three readings. Two faces,
// one instrument: Run = a mode transition (Arc 4).
//
// Placement only. Every card below is the same component the dock's Run tab
// hosted, fed the same kernel state from the same App owner: what changed is the
// container and therefore the width. Nothing here decides anything about a
// model; the run's availability is still decided upstream in the control strip,
// which is where the run controls live and where a model that cannot run says
// so.
import { useState } from "react";
import type {
  CanvasModel,
  Manifest,
  MarkovRunResult,
  Relation,
  RunResultRich,
} from "./kernel/types";
import type { RunKind } from "./canvas/lenses/registry";
import { RunInputs } from "./RunInputs";
import { DtmcPanel, RunFit, RunGlance, RunStory, RunTable, weightProvenance } from "./RunPanel";
import { Card, Tabs, Verdict } from "./ui";

/** The dock's readout tabs (ws3). Fit only exists when a CSV is bound —
 *  absence is ontology, not a disabled tab. */
type ReadoutTab = "story" | "fit" | "table";

export function RunMode({
  result,
  markovRun,
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
  runKind,
  dock = false,
  transport,
}: {
  result: RunResultRich | null;
  /** #282: the DTMC run (#67) — the result when the active lens declares
   *  `run: "dtmc"`. App keeps result/markovRun mutually exclusive. */
  markovRun: MarkovRunResult | null;
  /** ADR run-seam-canvas-document: whether the last run executed the edited
   *  canvas's projection rather than the shipped calibration artifact. */
  ranEdited?: boolean;
  runError: string | null;
  lens: CanvasModel["lens"];
  /** #94: accept a run-derived stock unit as declared. App owns the write. */
  onAcceptUnit?: (name: string, unit: string) => void;
  /** #154 P1: the scrubber's current tick, marking where the system is. */
  tick?: number;
  model?: CanvasModel | null;
  /** The active demo's manifest (null = no runnable bundle). */
  manifest?: Manifest | null;
  onInputEdit?: (next: Relation) => void;
  onResetInputs?: () => void;
  time?: { dt: number; t: number; klir: boolean; onCommit: (dt: number, t: number) => void };
  /** #282: the lens's declared run semantics — this view renders from it. */
  runKind: RunKind;
  /** The recomposition (2026-08-16): dock form — the run's cards in a bottom
   *  dock beneath the LIVING diagram stage, instead of a full-bleed frame
   *  over it. Conservation runs only; the caller decides. */
  dock?: boolean;
  /** The run's transport (the scrubber) — in dock form it rides the dock's
   *  own spine, the one row both surfaces share, instead of a strip below
   *  the whole stage where the dock made it invisible (field report). */
  transport?: React.ReactNode;
}) {
  // Which readout tab is open — a viewing posture, not run state, so it lives
  // here (the InspectorDock precedent), while every number rendered below
  // still flows from App's one owner.
  const [tabChoice, setTabChoice] = useState<ReadoutTab>("story");

  // #282, decided 2026-08-01: Bunge does not run. The lens's own register says
  // it — no mechanism stated (⊘M) — so executing Mobus's engine under this
  // reading was a lens leak. The mode states the refusal rather than borrowing
  // furniture; it has no timeline and no inputs, so it takes no rail.
  if (runKind === "none") {
    return (
      <Frame name={model?.name} runKind={runKind} dock={dock}>
        <div className="mx-auto w-full max-w-2xl">
          <Card title="Result" source="bert-core · wasm">
            <Verdict tone="warning">no mechanism stated (⊘M) — reads as a black box</Verdict>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              This lens declares composition, environment, and structure, never a
              mechanism. There is nothing to run. Read the model under Mobus to
              execute its declared dynamics, or under Klir to evolve it as a
              state machine.
            </p>
          </Card>
        </div>
      </Frame>
    );
  }

  // The inputs card renders alongside WHATEVER the run state is — including a
  // refusal, since fix-the-number-and-rerun is exactly the loop it exists for.
  // Under Klir there are no forced inputs to edit; the rail carries time alone.
  const inputs =
    runKind !== "dtmc" && model && manifest && onInputEdit ? (
      <RunInputs model={model} manifest={manifest} onEdit={onInputEdit} onReset={onResetInputs} />
    ) : null;
  const timeRow = time ? <TimeRow time={time} /> : null;

  // Dock form (conservation runs): the BENCH (ws3). A fixed left rail that
  // never scrolls away — time and the declared knobs — and a readout area
  // whose glance row is always visible, with the charts behind real tabs.
  // Only the tab panel scrolls; every fact appears exactly once.
  if (dock) {
    const hasFit = !!result && result.comparisons.length > 0;
    const tab: ReadoutTab = tabChoice === "fit" && !hasFit ? "story" : tabChoice;
    const readout = runError ? (
      <div className="p-3">
        <Card title="Result" source="bert-compose · wasm">
          <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
            {runError}
          </p>
        </Card>
      </div>
    ) : result ? (
      <>
        <RunGlance result={result} model={model} tick={tick} />
        <div className="px-3">
          <Tabs
            tabs={[
              { key: "story", label: "Story" },
              // Fit exists only when a CSV is bound — absence is ontology.
              ...(hasFit ? [{ key: "fit", label: "Fit to data" }] : []),
              { key: "table", label: "Table" },
            ]}
            active={tab}
            onSelect={(k) => setTabChoice(k as ReadoutTab)}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {tab === "story" && <RunStory result={result} lens={lens} tick={tick} model={model} />}
          {tab === "fit" && hasFit && <RunFit result={result} tick={tick} />}
          {tab === "table" && (
            <RunTable
              result={result}
              ranEdited={ranEdited}
              lens={lens}
              onAcceptUnit={onAcceptUnit}
              tick={tick}
            />
          )}
        </div>
      </>
    ) : (
      <Placeholder>
        {manifest
          ? // #297: the model opens at zero — loaded, mapped, and waiting for
            // the author's horizon. Nothing has run until Run is pressed.
            "The model is loaded and nothing has run. Set the run length in Time and press ▶ Run, or ⏭ Step one tick at a time."
          : "Run needs data: open a demo bundle, or attach a CSV in Data mode and bind at least one flow."}
      </Placeholder>
    );
    return (
      <Frame name={model?.name} runKind={runKind} dock transport={transport}>
        <div className="flex min-h-0 flex-1">
          <aside
            className="w-60 shrink-0 overflow-y-auto border-r p-3"
            style={{ borderColor: "var(--hairline)" }}
          >
            <div className="grid gap-3">
              {timeRow}
              {inputs}
            </div>
          </aside>
          <section className="flex min-w-0 flex-1 flex-col">{readout}</section>
        </div>
      </Frame>
    );
  }

  // Full-bleed form: the run kinds that own their whole surface (a DTMC, or
  // an error on one). Conservation runs never reach here — they dock.
  const deck = (() => {
    if (runError)
      return (
        <Card title="Result" source="bert-compose · wasm">
          <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
            {runError}
          </p>
        </Card>
      );
    // #282: the DTMC deck — steps and occupancy, no Δt, no conservation chrome.
    if (runKind === "dtmc")
      return markovRun ? (
        <DtmcPanel
          run={markovRun}
          tick={tick}
          weights={model ? weightProvenance(model.relations) : undefined}
        />
      ) : (
        <Placeholder>
          Run evolves this state machine as a Markov chain: steps and state
          occupancy, not Δt. Set the steps beside this and press ▶ Run, or ⏭ Step
          one tick at a time.
          {model &&
            model.relations.length > 0 &&
            weightProvenance(model.relations) === "defaulted" &&
            " Transition weights are undeclared, so the chain will run uniform. Add `weight <n>` to a flow to calibrate it."}
        </Placeholder>
      );
    return (
      <Placeholder>
        {manifest
          ? "The model is loaded and nothing has run. Set the run length in Time and press ▶ Run, or ⏭ Step one tick at a time."
          : "Run needs data: open a demo bundle, or attach a CSV in Data mode and bind at least one flow."}
      </Placeholder>
    );
  })();

  return (
    <Frame name={model?.name} runKind={runKind} dock={dock} transport={transport}>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
        <div className="grid gap-5">
          {timeRow}
          {inputs}
        </div>
        <div className="grid min-w-0 gap-5">{deck}</div>
      </div>
    </Frame>
  );
}

/** What the run mode executes, per the lens's declared run kind. The lens
 *  already decided this (`LensPalette[lens].run`); the header only says it out
 *  loud, so an author who arrives here by pressing Run knows what came back. */
const RUN_KIND_LINE: Record<RunKind, string> = {
  conservation:
    "the model executing: its time slice, what forces it, and the trajectory that came back",
  dtmc: "the state machine evolving as a Markov chain: steps and state occupancy, not Δt",
  none: "this lens states no mechanism, so there is nothing here to execute",
};

/** The mode's own surface: neutral ground, its own scroll, filling the stage the
 *  canvas holds in Structure mode. It opens on a header and the header closes on
 *  a rule (visual language rule 2) — the same shape Data mode uses, because they
 *  are the same axis and should not be designed twice. */
function Frame({
  name,
  runKind,
  dock = false,
  transport,
  children,
}: {
  name?: string | null;
  runKind: RunKind;
  dock?: boolean;
  transport?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Dock form (the recomposition): the run's cards take the stage's lower
  // band and the DIAGRAM keeps the rest — run it and both readers of the one
  // recorded trace move together. Fixed height by design (no splitter
  // primitive exists in this repo; do not invent one casually). Full-bleed
  // form stays for the run kinds that own their whole surface.
  if (dock) {
    return (
      <div
        className="absolute inset-x-0 bottom-0 flex h-[45%] min-h-[16rem] flex-col"
        style={{ background: "var(--bg-primary)", borderTop: "1px solid var(--border)" }}
      >
        <div
          className="flex items-center gap-x-4 px-4 py-1.5"
          style={{ borderBottom: "1px solid var(--hairline)" }}
        >
          <span
            className="shrink-0 text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-primary)" }}
          >
            Run
          </span>
          {name?.trim() && (
            <span className="hidden shrink-0 text-xs sm:inline" style={{ color: "var(--text-secondary)" }}>
              {name.trim()}
            </span>
          )}
          {/* The transport IS the spine: one row starts the run, plays the
              recorded trace, and states the verdict (#344 item 5's
              computes-vs-plays line rides as its tooltip). */}
          <div className="min-w-0 flex-1">{transport}</div>
        </div>
        {/* No outer scroll (ws3): the rail and the tab panel own their own
            overflow, so the bench's fixed parts can never scroll away. */}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    );
  }
  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="px-4 pb-2 pt-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-primary)" }}
          >
            Run
          </span>
          {name?.trim() && (
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {name.trim()}
            </span>
          )}
          {/* The transport rides this header too (ws2): a DTMC's Run/Step and
              scrubber live on the same spine the dock form uses, instead of
              being silently dropped by the full-bleed frame. */}
          {transport && <div className="min-w-0 flex-1">{transport}</div>}
        </div>
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          {RUN_KIND_LINE[runKind]}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 py-6 text-sm" style={{ color: "var(--text-muted)" }}>
      {children}
    </p>
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
