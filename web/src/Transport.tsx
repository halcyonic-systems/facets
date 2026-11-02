// The run's transport cluster — the bench's spine (run-legibility, 2026-08-17).
// ONE row carries the whole run grammar: Run computes a history, Step
// extends it one tick, the scrubber's play runs the recorded trace, and the
// chip says whether it conserved. Any runnable surface mounts this whole;
// nothing here decides availability or executes anything — the parent owns
// both. Makeover slice D (rules 3, 9d, 14): Run is the primary Button with
// the play icon and its word, Step and the rewind are 32px ToolButtons with
// drawn icons, and the verdict chip carries its mark in the Pill's icon slot.
import { useState } from "react";
import { SimScrubber } from "./canvas/SimScrubber";
import { TimeRow } from "./Readouts";
import { Button, Pill, ToolButton } from "./ui";

export function Transport({
  onRun,
  onStep,
  runnable,
  runTitle,
  steps,
  tick,
  onTick,
  playing,
  onPlayingChange,
  loop,
  verdict,
  runOn,
  onRunOnChange,
  onRunOnTick,
  readouts,
  changedAt = [],
  time,
  error,
}: {
  onRun: () => void;
  onStep: () => void;
  /** Availability is decided upstream; an unrunnable transport states why. */
  runnable: boolean;
  /** Why the run is (un)available — the strip's old sentence, now a title. */
  runTitle: string;
  /** Frame count of the recorded trace; 0 = nothing has run yet. */
  steps: number;
  tick: number;
  onTick: (k: number) => void;
  playing: boolean;
  onPlayingChange: (p: boolean) => void;
  loop: boolean;
  /** Conservation verdict of the trace on screen; null = no verdict to state
   *  (no run yet, or a run kind with no conservation ledger). */
  verdict: { conserved: boolean; residual: number } | null;
  /** Run on (one-surface.md): whether play continues past the last recorded
   *  tick by stepping the engine. Absent = this run cannot run on (forced by
   *  data, or a Markov run), and the toggle is not shown. */
  runOn?: boolean;
  onRunOnChange?: (on: boolean) => void;
  /** Step the engine one tick; called by the scrubber at the last frame. */
  onRunOnTick?: () => void;
  /** The one way into the run's readouts (decision 1, 2026-11-02): the strip
   *  opens them and closes them again. Absent = no readouts to open. */
  readouts?: { open: boolean; onToggle: () => void };
  /** Ticks at which a knob was changed while the run kept going. The run's
   *  totals then mix two settings; the strip says so instead of leaving the
   *  numbers to look wrong (walk row 11). */
  changedAt?: number[];
  /** The run's time slice (2026-11-02 walk, row 26): run length and step
   *  size are settings of the run, so they live on the strip that runs it,
   *  behind one button that names the current length. Absent = not offered. */
  time?: { dt: number; t: number; klir: boolean; onCommit: (dt: number, t: number) => void };
  /** Why the last Run was refused, in the kernel's words. Shown on the strip
   *  so a refused Run never looks like nothing happened (walk row 27). */
  error?: string | null;
}) {
  const [timeOpen, setTimeOpen] = useState(false);
  if (!runnable) {
    return (
      <span className="text-xs font-body" style={{ color: "var(--text-muted)" }} title={runTitle}>
        {runTitle}
      </span>
    );
  }
  return (
    <div
      className="flex min-w-0 flex-1 items-center gap-3"
      title="Run computes the whole history · the scrubber's play runs the cursor through it"
    >
      <Button icon="play" onClick={onRun} title={runTitle}>
        Run
      </Button>
      <ToolButton
        icon="step"
        onClick={onStep}
        aria-label="Step"
        title="Advance the run by one tick (starts one if none has run)"
      />
      {runOn !== undefined && onRunOnChange && (
        <ToolButton
          icon="forward"
          active={runOn}
          onClick={() => onRunOnChange(!runOn)}
          title={
            runOn
              ? "Keep going: play continues past the run length, and a knob you change while it plays takes effect from that tick. Click to stop at the run length."
              : "Stops at the run length. Click to keep going past it."
          }
        >
          keep going
        </ToolButton>
      )}
      {steps > 0 && (
        <ToolButton
          icon="step-back"
          onClick={() => {
            onPlayingChange(false);
            onTick(0);
          }}
          aria-label="Rewind"
          title="Rewind to the start of the recorded trace"
        />
      )}
      {steps > 0 ? (
        <div className="min-w-0 flex-1">
          <SimScrubber
            steps={steps}
            tick={tick}
            onTick={onTick}
            playing={playing}
            onPlayingChange={onPlayingChange}
            loop={loop}
            onRunOn={runOn ? onRunOnTick : undefined}
          />
        </div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}
      {error && (
        <button
          type="button"
          className="min-w-0 max-w-[40%] shrink truncate text-left text-[11px]"
          style={{ color: "var(--verdict-error)" }}
          title={error}
          onClick={readouts && !readouts.open ? readouts.onToggle : undefined}
          data-testid="run-refused"
        >
          {`Run refused: ${error.split("\n")[1]?.replace(/^· /, "") ?? error}`}
        </button>
      )}
      {changedAt.length > 0 && (
        <span
          className="shrink-0 text-[11px]"
          style={{ color: "var(--verdict-warning)" }}
          title="A knob changed partway through, so this run's totals mix the settings before and after. Run again to start clean."
          data-testid="changed-at"
        >
          {changedAt.length === 1 ? `knob changed at tick ${changedAt[0]}` : `knobs changed at ticks ${changedAt.join(", ")}`}
        </span>
      )}
      {time && (
        <span className="relative shrink-0">
          <ToolButton
            icon="edit"
            active={timeOpen}
            onClick={() => setTimeOpen((o) => !o)}
            title="Run length and step size"
            aria-expanded={timeOpen}
            data-testid="run-time-toggle"
          >
            {time.klir ? `${time.t} steps` : `length ${time.t}`}
          </ToolButton>
          {timeOpen && (
            <div
              className="absolute bottom-full right-0 z-30 mb-2 w-max whitespace-nowrap rounded-lg border p-3"
              style={{ background: "var(--bg-secondary)", borderColor: "var(--hairline)" }}
              data-testid="run-time"
            >
              <TimeRow time={time} frame={false} />
            </div>
          )}
        </span>
      )}
      {verdict && (
        <span className="shrink-0" title={`residual ${verdict.residual.toExponential(1)}`}>
          <Pill tone={verdict.conserved ? "ok" : "error"} icon={verdict.conserved ? "ok" : "warning"}>
            {verdict.conserved ? "conserved" : "leak"}
          </Pill>
        </span>
      )}
      {readouts && (
        <Button
          size={28}
          variant="quiet"
          icon={readouts.open ? "collapse" : "expand"}
          onClick={readouts.onToggle}
          title={readouts.open ? "Back to the model (Esc)" : "Every readout of the run: charts, table, log"}
          aria-pressed={readouts.open}
          data-testid="readouts-toggle"
        >
          {readouts.open ? "model" : "readouts"}
        </Button>
      )}
    </div>
  );
}
