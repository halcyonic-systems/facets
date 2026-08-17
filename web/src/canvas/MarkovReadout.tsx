// The Markov run's canvas-adjacent controls (#67 J9): the scrubber that animates
// the mass on the diagram, plus the secondary distribution readout. Structure is
// primary (the mass rides the state-transition diagram itself); this is the
// noted, textual reading of the distribution at the scrubbed tick.
//
// A Markov run conserves probability, not substance — so this deliberately
// carries NO conservation pill (`✓ conserved` / `⚠ leak`) and no `residual`.
// Those belong only to a `RunResultRich`; discriminating on the result kind is
// what keeps a meaningless conservation verdict off a distribution run.
import { SimScrubber } from "./SimScrubber";
import type { MarkovRunResult } from "../kernel/types";

export function MarkovReadout({
  run,
  tick,
  onTick,
  playing,
  onPlayingChange,
  loop,
}: {
  run: MarkovRunResult;
  tick: number;
  onTick: (k: number) => void;
  playing: boolean;
  onPlayingChange: (p: boolean) => void;
  loop: boolean;
}) {
  const row = run.history[Math.max(0, Math.min(run.history.length - 1, tick))] ?? [];
  return (
    <div className="mt-3 grid gap-3" data-markov-controls>
      <SimScrubber
        steps={run.history.length}
        tick={tick}
        onTick={onTick}
        playing={playing}
        onPlayingChange={onPlayingChange}
        loop={loop}
      />
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
