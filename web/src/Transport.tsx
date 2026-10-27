// The run's transport cluster — the bench's spine (run-legibility, 2026-08-17).
// ONE row carries the whole run grammar: Run computes a history, Step
// extends it one tick, the scrubber's play runs the recorded trace, and the
// chip says whether it conserved. Any runnable surface mounts this whole;
// nothing here decides availability or executes anything — the parent owns
// both. Makeover slice D (rules 3, 9d, 14): Run is the primary Button with
// the play icon and its word, Step and the rewind are 32px ToolButtons with
// drawn icons, and the verdict chip carries its mark in the Pill's icon slot.
import { SimScrubber } from "./canvas/SimScrubber";
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
}) {
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
              ? "Run on: play keeps stepping the engine past the run length, and a knob turned while it plays takes effect at that tick. Click to stop at the run length."
              : "Stops at the run length. Click to keep running past it, live."
          }
        >
          run on
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
      {verdict && (
        <span className="shrink-0" title={`residual ${verdict.residual.toExponential(1)}`}>
          <Pill tone={verdict.conserved ? "ok" : "error"} icon={verdict.conserved ? "ok" : "warning"}>
            {verdict.conserved ? "conserved" : "leak"}
          </Pill>
        </span>
      )}
    </div>
  );
}
