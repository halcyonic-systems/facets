// The face's half of the live sandbox: ONE hook owning the wasm session
// handle, the transport clock, and the mirrored snapshot.
//
// Division of labor (API.md, "The sandbox seam"): the FACE owns the clock —
// a wall-clock accumulator at `ticksPerSec` driven by requestAnimationFrame,
// the same loop the desktop shell ran (`app.rs`: elapsed / (1/tps) whole
// steps per frame) — and the ENGINE owns every transition. React state is a
// MIRROR of `snapshot()`, never a second truth: every mutation funnels
// through `mutate()`, which applies the change to the session and re-reads
// the snapshot in the same act, so the mirror and the wasm state cannot
// diverge (and an index-remapping `removeNode` is immediately re-read).
//
// The session is wasm-owned memory: created after `ready()`, freed on
// unmount. It is an instrument's live state, never the document of record —
// on a trap, discard and rebuild from `toModelJson()` output or the mirror.

import { useCallback, useEffect, useRef, useState } from "react";
import { ready, Sandbox } from "../kernel";
import type { SandboxSnapshot } from "../kernel/types";
import { advance, dropBaseline, freshClock } from "./transportClock";

export interface UseSandboxSession {
  /** Null until the wasm kernel is ready and the session exists. */
  snapshot: SandboxSnapshot | null;
  running: boolean;
  setRunning: (on: boolean) => void;
  ticksPerSec: number;
  setTicksPerSec: (tps: number) => void;
  dt: number;
  setDt: (dt: number) => void;
  /** One step at the current dt, paused or not. */
  stepOnce: () => void;
  /** Rewind the run (stocks to initial, clock to 0). Authoring survives. */
  reset: () => void;
  /** Apply a mutation to the live session and re-mirror in the same act. */
  mutate: (fn: (sb: Sandbox) => void) => void;
  /** The live handle, for reads the mirror does not carry (history pulls,
   *  toModelJson). Null before ready. */
  session: Sandbox | null;
  /** Swap the live session for a new one (open a saved document): frees the
   *  old handle, installs the built one, re-mirrors. */
  replace: (build: () => Sandbox) => void;
}

/** Build the session once the kernel is ready; `make` runs against the fresh
 *  handle (stamp something, load a model) before the first mirror. */
export function useSandboxSession(make?: (sb: Sandbox) => void): UseSandboxSession {
  const sessionRef = useRef<Sandbox | null>(null);
  const [snapshot, setSnapshot] = useState<SandboxSnapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [ticksPerSec, setTicksPerSec] = useState(4);
  const [dt, setDt] = useState(1.0);

  const mirror = useCallback(() => {
    const sb = sessionRef.current;
    if (sb) setSnapshot(sb.snapshot());
  }, []);

  // Session lifecycle: create after ready(), free on unmount.
  useEffect(() => {
    let cancelled = false;
    void ready().then(() => {
      if (cancelled) return;
      const sb = Sandbox.empty();
      make?.(sb);
      sessionRef.current = sb;
      setSnapshot(sb.snapshot());
    });
    return () => {
      cancelled = true;
      sessionRef.current?.free();
      sessionRef.current = null;
    };
    // `make` is an initializer, deliberately not a dependency: re-running it
    // would rebuild the session mid-life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The transport clock: whole ticks accumulated from wall time, stepped in
  // one batched call per frame. A hidden tab stops the loop (rAF pauses and
  // the visibility listener drops the accumulator) rather than fast-forwarding
  // a burst of ticks on return.
  const clock = useRef(freshClock());
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    clock.current = freshClock();
    const frame = (now: number) => {
      const sb = sessionRef.current;
      if (sb && !document.hidden) {
        const whole = advance(clock.current, now, ticksPerSec);
        if (whole > 0) {
          sb.step(whole, dt);
          setSnapshot(sb.snapshot());
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // A hidden tab drops the baseline so returning resumes at rate instead of
    // fast-forwarding the hidden interval (transportClock's law).
    const onVisibility = () => dropBaseline(clock.current);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [running, ticksPerSec, dt]);

  const stepOnce = useCallback(() => {
    sessionRef.current?.step(1, dt);
    mirror();
  }, [dt, mirror]);

  const reset = useCallback(() => {
    sessionRef.current?.reset();
    mirror();
  }, [mirror]);

  const replace = useCallback(
    (build: () => Sandbox) => {
      const next = build(); // build first — a refused open keeps the old session
      sessionRef.current?.free();
      sessionRef.current = next;
      setSnapshot(next.snapshot());
    },
    [],
  );

  const mutate = useCallback(
    (fn: (sb: Sandbox) => void) => {
      const sb = sessionRef.current;
      if (!sb) return;
      fn(sb);
      mirror();
    },
    [mirror],
  );

  return {
    snapshot,
    running,
    setRunning,
    ticksPerSec,
    setTicksPerSec,
    dt,
    setDt,
    stepOnce,
    reset,
    mutate,
    session: sessionRef.current,
    replace,
  };
}
