// The Phase-1 sandbox surface: transport + stamps + palette + a live table.
// Deliberately minimal — it exists to prove the live seam end to end (stamp,
// run continuously, tweak mid-run) before the canvas/inspector phases. Dev
// entry only (`?sandbox=1` in main.tsx); no route in the app shell yet.

import { useEffect, useState } from "react";
import { ready, ladderStamps, sandboxPalette } from "../kernel";
import type { LadderStamp, SandboxPaletteEntry } from "../kernel/types";
import { useSandboxSession } from "./useSandboxSession";

export default function SandboxSurface() {
  const sb = useSandboxSession();
  const [stampList, setStampList] = useState<LadderStamp[]>([]);
  const [palette, setPalette] = useState<SandboxPaletteEntry[]>([]);

  useEffect(() => {
    void ready().then(() => {
      setStampList(ladderStamps());
      setPalette(sandboxPalette());
    });
  }, []);

  const snap = sb.snapshot;

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--surface-page, var(--surface, #fff))", color: "var(--text-primary)" }}>
      <header className="mb-4 flex items-baseline gap-4">
        <h1 className="text-lg font-semibold">Sandbox</h1>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          touch the system — stamp a process, run it, tweak it mid-run
        </p>
      </header>

      {/* transport */}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <button
          className="rounded px-3 py-1"
          style={{ background: "var(--accent)", color: "var(--text-on-accent)" }}
          onClick={() => sb.setRunning(!sb.running)}
        >
          {sb.running ? "Pause" : "Run"}
        </button>
        <button className="rounded border px-3 py-1" onClick={sb.stepOnce} disabled={sb.running}>
          Step
        </button>
        <button className="rounded border px-3 py-1" onClick={sb.reset}>
          Reset
        </button>
        <label className="flex items-center gap-2">
          <span style={{ color: "var(--text-muted)" }}>ticks/s</span>
          <input
            type="range"
            min={1}
            max={60}
            value={sb.ticksPerSec}
            onChange={(e) => sb.setTicksPerSec(Number(e.target.value))}
          />
          <span className="font-mono">{sb.ticksPerSec}</span>
        </label>
        <span className="font-mono" style={{ color: "var(--text-muted)" }}>
          t = {snap?.tick ?? 0}
        </span>
        {snap?.invariant === "conserved" && snap.balance !== null && (
          <span
            className="font-mono text-xs"
            style={{ color: Math.abs(snap.balance) < 1e-3 ? "var(--verdict-ok)" : "var(--verdict-warning)" }}
            title="conservation residual: emitted + initial stocks − (stored + sunk + dissipated)"
          >
            ⚖ {Math.abs(snap.balance) < 1e-3 ? "conserved" : `residual ${snap.balance.toFixed(3)}`}
          </span>
        )}
      </div>

      {snap?.algebraic_cycle && (
        <p className="mb-3 text-xs" style={{ color: "var(--verdict-error)" }}>
          step refused: the wiring holds a loop of pure relays with no stock and no level read (nodes{" "}
          {snap.algebraic_cycle.join(" → ")}). Put a stock on the loop to anchor it.
        </p>
      )}

      {/* Troncale process stamps */}
      <section className="mb-4">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Systems processes — each stamps its primitive circuit, not an atom
        </h2>
        <div className="flex flex-wrap gap-2">
          {stampList.map((s) => (
            <button
              key={s.slug}
              className="rounded border px-2 py-1 text-xs"
              title={`${s.blurb}\n↳ ${s.composition}`}
              onClick={() => sb.mutate((h) => h.stamp(s.name, 60, 60))}
            >
              {s.name}
            </button>
          ))}
        </div>
      </section>

      {/* primitive palette */}
      <section className="mb-4">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Primitives
        </h2>
        <div className="flex flex-wrap gap-2">
          {palette.map((p) => (
            <button
              key={p.kind}
              className="rounded border px-2 py-1 text-xs"
              onClick={() => sb.mutate((h) => h.addNode(p.kind, 80, 80))}
            >
              {p.kind}
            </button>
          ))}
        </div>
      </section>

      {/* live node table */}
      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Components ({snap?.nodes.length ?? 0}) · bonds ({snap?.wires.length ?? 0})
        </h2>
        <table className="w-full max-w-3xl text-left text-sm">
          <thead>
            <tr className="text-xs" style={{ color: "var(--text-muted)" }}>
              <th className="py-1 pr-3 font-normal">name</th>
              <th className="py-1 pr-3 font-normal">kind</th>
              <th className="py-1 pr-3 font-normal">substance</th>
              <th className="py-1 pr-3 font-normal">param</th>
              <th className="py-1 pr-3 text-right font-normal">activity</th>
              <th className="py-1 pr-3 text-right font-normal">storage</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {snap?.nodes.map((n, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--border, #e5e7eb)" }}>
                <td className="py-1 pr-3">{n.name}</td>
                <td className="py-1 pr-3">{n.kind}</td>
                <td className="py-1 pr-3">{n.substance}</td>
                <td className="py-1 pr-3">
                  <input
                    type="number"
                    step="0.1"
                    className="w-20 rounded border px-1"
                    value={n.param}
                    onChange={(e) => sb.mutate((h) => h.setNodeParam(i, "param", Number(e.target.value)))}
                  />
                </td>
                <td className="py-1 pr-3 text-right">{n.activity.toFixed(2)}</td>
                <td className="py-1 pr-3 text-right">{n.storage.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
