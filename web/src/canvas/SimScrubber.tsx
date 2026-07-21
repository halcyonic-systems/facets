// Play/tick control for the on-canvas sim. This is the ONE place the scrubber
// touches time — it only indexes into the kernel's already-computed per-tick
// trajectories (via the `tick` prop the parent reads out), it never advances
// any dynamics itself. If this file ever computed a value instead of an index,
// that would be the invariant violation.
import { useEffect, useRef, useState } from "react";
import type { RunResultRich } from "../kernel/types";

const TICKS_PER_SEC = 6;

export function SimScrubber({
  result,
  tick,
  onTick,
}: {
  result: RunResultRich;
  tick: number;
  onTick: (k: number) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const lastTicks = result.ticks;

  useEffect(() => {
    if (!playing || lastTicks <= 1) return;
    let raf = 0;
    let last = performance.now();
    const stepMs = 1000 / TICKS_PER_SEC;
    const loop = (now: number) => {
      if (now - last >= stepMs) {
        last = now;
        const next = tickRef.current + 1;
        onTick(next >= lastTicks ? 0 : next); // loop — keep the payoff going
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, lastTicks, onTick]);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "pause" : "play"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
        style={{ background: "var(--accent)", color: "var(--text-on-accent)" }}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <input
        type="range"
        min={0}
        max={Math.max(0, result.ticks - 1)}
        value={tick}
        onChange={(e) => {
          setPlaying(false);
          onTick(Number(e.target.value));
        }}
        className="flex-1"
      />
      <span className="w-20 shrink-0 text-right text-xs tabular" style={{ color: "var(--text-muted)" }}>
        tick {tick} / {Math.max(0, result.ticks - 1)}
      </span>
    </div>
  );
}
