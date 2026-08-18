// Readouts — the run's full-page deep-dive EXPANSION (#345, revising #304/#312:
// Run left the mode axis). The bench on the Model surface answers "what is the
// world doing right now"; this surface is where you set the diagram aside and
// give the parameters and every chart the whole page. An expansion, not a
// mode: ⤢ opens it from the run card, Esc / ⤡ returns to the Model surface.
// Every card is the same component the dock hosted, fed the same kernel state
// from the same App owner — what changed is the container and the height.
import { useEffect, useState } from "react";
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
import { Card, Tabs } from "./ui";

/** The readout tabs. Fit only exists when a CSV is bound — absence is
 *  ontology, not a disabled tab. */
type ReadoutTab = "story" | "fit" | "table";

export function Readouts({
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
  transport,
  onClose,
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
  /** The one Transport spine, mounted whole (same instance grammar as the
   *  bench strip — one place starts a run, one place plays it). */
  transport?: React.ReactNode;
  /** Return to the Model surface (⤡ / Esc — App owns the binding). */
  onClose: () => void;
}) {
  // Which readout tab is open — a viewing posture, not run state, so it lives
  // here (the InspectorDock precedent), while every number rendered below
  // still flows from App's one owner.
  const [tabChoice, setTabChoice] = useState<ReadoutTab>("story");

  // Esc returns to the bench — bound here so the expansion always honors it,
  // whichever affordance opened it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hasFit = !!result && result.comparisons.length > 0;
  const tab: ReadoutTab = tabChoice === "fit" && !hasFit ? "story" : tabChoice;

  // The rail: the run's full input surface — time and every declared
  // magnitude, with the height the dock never had. Under Klir there are no
  // forced inputs to edit; the rail carries time alone.
  const inputs =
    runKind !== "dtmc" && model && manifest && onInputEdit ? (
      <RunInputs model={model} manifest={manifest} onEdit={onInputEdit} onReset={onResetInputs} />
    ) : null;
  const timeRow = time ? <TimeRow time={time} /> : null;

  const readout = runError ? (
    <div className="p-4">
      <Card title="Result" source="bert-compose · wasm">
        <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
          {runError}
        </p>
      </Card>
    </div>
  ) : runKind === "dtmc" ? (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      {markovRun ? (
        <DtmcPanel
          run={markovRun}
          tick={tick}
          weights={model ? weightProvenance(model.relations) : undefined}
        />
      ) : (
        <Placeholder>
          Run evolves this state machine as a Markov chain: steps and state
          occupancy, not Δt. Set the steps in the rail and press ▶ Run, or ⏭
          Step one tick at a time.
        </Placeholder>
      )}
    </div>
  ) : result ? (
    <>
      <RunGlance result={result} model={model} tick={tick} />
      <div className="px-4">
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
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "story" && (
          <RunStory result={result} lens={lens} tick={tick} model={model} />
        )}
        {tab === "fit" && hasFit && (
          <RunFit result={result} tick={tick} timeUnit={model?.time_unit} />
        )}
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
        ? "Nothing has run yet. Press ▶ Run in the header, or set the run length in the rail first."
        : "Run needs data: open a demo bundle, or attach a CSV in Data mode and bind at least one flow."}
    </Placeholder>
  );

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        className="flex items-center gap-x-4 px-4 py-1.5"
        style={{ borderBottom: "1px solid var(--hairline)" }}
      >
        <span
          className="shrink-0 text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-primary)" }}
        >
          Readouts
        </span>
        {model?.name?.trim() && (
          <span className="hidden shrink-0 text-xs sm:inline" style={{ color: "var(--text-secondary)" }}>
            {model.name.trim()}
          </span>
        )}
        <div className="min-w-0 flex-1">{transport}</div>
        <button
          onClick={onClose}
          title="Back to the model (Esc)"
          className="shrink-0 px-2 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          ⤡ model
        </button>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside
          className="w-80 shrink-0 overflow-y-auto border-r p-3"
          style={{ borderColor: "var(--hairline)" }}
        >
          <div className="grid gap-3">
            {timeRow}
            {inputs}
          </div>
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">{readout}</section>
      </div>
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 py-6 text-sm" style={{ color: "var(--text-muted)" }}>
      {children}
    </p>
  );
}

/** The run's time slice (Δt/T): step size and horizon, docked with the run
 *  they govern. Commit (Enter/blur) re-runs over the new slice — the
 *  inputs-card grammar. Under Klir only the horizon renders (a DTMC advances
 *  in steps; Δt is not a Klir word). Exported for the bench's RunCard. */
export function TimeRow({
  time,
  frame = true,
}: {
  time: { dt: number; t: number; klir: boolean; onCommit: (dt: number, t: number) => void };
  /** false = bare fields for a host that already carries card chrome (the
   *  bench's RunCard) — no Card-in-card nesting. */
  frame?: boolean;
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
  const body = (
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
  );
  if (!frame) return body;
  return (
    <Card title="Time" source="edits re-run">
      {body}
    </Card>
  );
}
