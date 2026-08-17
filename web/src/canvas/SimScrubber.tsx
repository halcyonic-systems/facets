// Play/tick control for the on-canvas sim. This is the ONE place the scrubber
// touches time — it only indexes into the kernel's already-computed per-tick
// trajectories (via the `tick` prop the parent reads out), it never advances
// any dynamics itself. If this file ever computed a value instead of an index,
// that would be the invariant violation.
//
// Playback state lives in the PARENT (one owner): the component is a stateless
// reader of `playing`, so a run can auto-play once after ▶ Run and playback
// survives the scrubber remounting across modes.
import { useEffect, useRef } from "react";

const TICKS_PER_SEC = 6;

/** Play/scrub a run's frames. `steps` is the frame count — valid ticks are
 *  0…steps-1, whatever kind of run produced them (a conservation trajectory or
 *  a Markov distribution). It only indexes; it computes no dynamics.
 *  `loop=false` stops at the last frame (auto-play-once); `loop=true` wraps. */
export function SimScrubber({
  steps,
  tick,
  onTick,
  playing,
  onPlayingChange,
  loop,
}: {
  steps: number;
  tick: number;
  onTick: (k: number) => void;
  playing: boolean;
  onPlayingChange: (p: boolean) => void;
  loop: boolean;
}) {
  const tickRef = useRef(tick);
  tickRef.current = tick;
  const lastTicks = steps;

  useEffect(() => {
    if (!playing || lastTicks <= 1) return;
    let raf = 0;
    let last = performance.now();
    const stepMs = 1000 / TICKS_PER_SEC;
    const loopFrame = (now: number) => {
      if (now - last >= stepMs) {
        last = now;
        const next = tickRef.current + 1;
        if (next >= lastTicks) {
          if (loop) onTick(0); // loop — keep the payoff going
          else {
            onPlayingChange(false); // played once; rest at the end
            return;
          }
        } else {
          onTick(next);
        }
      }
      raf = requestAnimationFrame(loopFrame);
    };
    raf = requestAnimationFrame(loopFrame);
    return () => cancelAnimationFrame(raf);
  }, [playing, loop, lastTicks, onTick, onPlayingChange]);

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onPlayingChange(!playing)}
        aria-label={playing ? "pause" : "play"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
        style={{ background: "var(--accent)", color: "var(--text-on-accent)" }}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <input
        type="range"
        min={0}
        max={Math.max(0, steps - 1)}
        value={tick}
        onChange={(e) => {
          onPlayingChange(false);
          onTick(Number(e.target.value));
        }}
        className="flex-1"
      />
      <span className="w-20 shrink-0 text-right text-xs tabular" style={{ color: "var(--text-muted)" }}>
        tick {tick} / {Math.max(0, steps - 1)}
      </span>
    </div>
  );
}
