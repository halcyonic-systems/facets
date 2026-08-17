// The Markov run's distribution readout (#67 J9). Structure is primary — the
// mass rides the state-transition diagram itself; this is the noted, textual
// reading of the distribution at the shared cursor's tick. Playback belongs
// to the Transport spine (#345) — this row reads the cursor, it never owns it.
//
// A Markov run conserves probability, not substance — so this deliberately
// carries NO conservation pill (`✓ conserved` / `⚠ leak`) and no `residual`.
// Those belong only to a `RunResultRich`; discriminating on the result kind is
// what keeps a meaningless conservation verdict off a distribution run.
import type { MarkovRunResult } from "../kernel/types";

export function MarkovReadout({
  run,
  tick,
}: {
  run: MarkovRunResult;
  tick: number;
}) {
  const row = run.history[Math.max(0, Math.min(run.history.length - 1, tick))] ?? [];
  return (
    <div className="mt-3 grid gap-3" data-markov-controls>
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular"
        style={{ color: "var(--text-muted)" }}
      >
        <span style={{ color: "var(--text-secondary)" }}>distribution</span>
        {run.states.map((name, i) => (
          <span key={name} className="font-mono">
            {name} {((row[i] ?? 0) * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </div>
  );
}
