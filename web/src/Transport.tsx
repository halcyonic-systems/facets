// The run's transport cluster — the bench's spine (run-legibility, 2026-08-17).
// ONE row carries the whole run grammar: ▶ Run computes a history, ⏭ Step
// extends it one tick, the scrubber's ▶ plays the recorded trace, and the chip
// says whether it conserved. Any runnable surface mounts this whole; nothing
// here decides availability or executes anything — the parent owns both.
import { SimScrubber } from "./canvas/SimScrubber";
import { Pill } from "./ui";

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
      title="▶ Run computes the whole history · the scrubber's ▶ plays the cursor through it"
    >
      <button
        onClick={onRun}
        title={runTitle}
        className="shrink-0 px-3 py-1 text-xs font-semibold transition-colors"
        style={{
          background: "var(--accent)",
          color: "var(--text-on-accent)",
          borderRadius: "var(--radius-pill)",
        }}
      >
        ▶ Run
      </button>
      <button
        onClick={onStep}
        title="Advance the run by one tick (starts one if none has run)"
        className="shrink-0 border px-3 py-1 text-xs font-semibold transition-colors"
        style={{
          borderColor: "var(--accent)",
          color: "var(--accent)",
          background: "transparent",
          borderRadius: "var(--radius-pill)",
        }}
      >
        ⏭ Step
      </button>
      {steps > 0 && (
        <button
          onClick={() => {
            onPlayingChange(false);
            onTick(0);
          }}
          title="Rewind to the start of the recorded trace"
          className="shrink-0 px-1 text-xs"
          style={{ color: "var(--text-secondary)" }}
        >
          ⏮
        </button>
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
          />
        </div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}
      {verdict && (
        <span className="shrink-0" title={`residual ${verdict.residual.toExponential(1)}`}>
          <Pill tone={verdict.conserved ? "ok" : "error"}>
            {verdict.conserved ? "✓ conserved" : "⚠ leak"}
          </Pill>
        </span>
      )}
    </div>
  );
}
