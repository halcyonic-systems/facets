// The sandbox surface: palette rail | live canvas | inspector, under a
// continuous transport. The desktop compose shell's layout, re-expressed.
//
// Everything on this page edits or reads the LIVE session — no re-run seam,
// no spec rebuild: drag a slider and the running system responds next tick.
// Dev entry only for now (`?sandbox=1` in main.tsx); becomes a Home document
// type in the persistence phase.

import { useEffect, useState } from "react";
import { ready, ladderStamps, sandboxPalette } from "../kernel";
import type { LadderStamp, SandboxPaletteEntry } from "../kernel/types";
import { useSandboxSession } from "./useSandboxSession";
import SandboxCanvas, { type CanvasSelection } from "./SandboxCanvas";
import SandboxInspector from "./SandboxInspector";
import SandboxMetrics from "./SandboxMetrics";

/** Cascade for click-to-place so repeated adds don't perfectly overlap. */
function placeAt(count: number): { x: number; y: number } {
  return { x: 120 + (count % 5) * 60, y: 90 + ((count * 37) % 200) };
}

export default function SandboxSurface() {
  const sb = useSandboxSession();
  const [stampList, setStampList] = useState<LadderStamp[]>([]);
  const [palette, setPalette] = useState<SandboxPaletteEntry[]>([]);
  const [selected, setSelected] = useState<CanvasSelection | null>(null);

  useEffect(() => {
    void ready().then(() => {
      setStampList(ladderStamps());
      setPalette(sandboxPalette());
    });
  }, []);

  const snap = sb.snapshot;

  const onDelete = (sel: CanvasSelection) => {
    // Index identity: after a removal every index may shift — drop the
    // selection rather than guess where it went (the mirror re-reads anyway).
    sb.mutate((h) => (sel.kind === "node" ? h.removeNode(sel.index) : h.removeWire(sel.index)));
    setSelected(null);
  };

  return (
    <div
      className="flex h-screen flex-col"
      style={{ background: "var(--surface-page, var(--surface, #fff))", color: "var(--text-primary)" }}
    >
      {/* transport bar */}
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-2 text-sm">
        <h1 className="mr-2 text-sm font-semibold">Sandbox</h1>
        <button
          className="rounded px-3 py-1"
          style={{ background: "var(--accent)", color: "var(--text-on-accent)" }}
          onClick={() => sb.setRunning(!sb.running)}
        >
          {sb.running ? "Pause" : "Run"}
        </button>
        <button className="rounded border px-2 py-1" onClick={sb.stepOnce} disabled={sb.running}>
          Step
        </button>
        <button className="rounded border px-2 py-1" onClick={sb.reset}>
          Reset
        </button>
        <label className="flex items-center gap-2 text-xs">
          <span style={{ color: "var(--text-muted)" }}>ticks/s</span>
          <input
            type="range"
            min={1}
            max={60}
            value={sb.ticksPerSec}
            onChange={(e) => sb.setTicksPerSec(Number(e.target.value))}
          />
          <span className="w-6 font-mono">{sb.ticksPerSec}</span>
        </label>
        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          t = {snap?.tick ?? 0}
        </span>
        {snap && (
          <label
            className="flex items-center gap-1 text-xs"
            title="axis D: the invariant this model declares. Off = same trajectory, no mass ledger (abstract numbers)."
          >
            <input
              type="checkbox"
              checked={snap.invariant === "conserved"}
              onChange={(e) => sb.mutate((h) => h.setInvariant(e.target.checked))}
            />
            <span style={{ color: "var(--text-muted)" }}>declare conservation</span>
          </label>
        )}
        {snap?.invariant === "conserved" && snap.balance !== null && snap.balance !== undefined && (
          <span
            className="font-mono text-xs"
            style={{ color: Math.abs(snap.balance) < 1e-3 ? "var(--verdict-ok)" : "var(--verdict-warning)" }}
            title="conservation residual: emitted + initial stocks − (stored + sunk + dissipated). Mid-run edits move the baseline; Reset re-baselines."
          >
            ⚖ {Math.abs(snap.balance) < 1e-3 ? "conserved" : `residual ${snap.balance.toFixed(2)}`}
          </span>
        )}
        {snap?.algebraic_cycle && (
          <span className="text-xs" style={{ color: "var(--verdict-error)" }}>
            step refused — a loop of pure relays ({snap.algebraic_cycle.map((j) => snap.nodes[j]?.name ?? j).join(" → ")}
            ): put a stock on the loop
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        {/* palette rail */}
        <aside className="w-44 shrink-0 overflow-y-auto border-r p-3">
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Primitives
          </h2>
          <p className="mb-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
            click to add · drag ∘ to wire
          </p>
          <div className="mb-4 grid gap-1">
            {palette.map((p) => (
              <button
                key={p.kind}
                className="rounded border px-2 py-1 text-left text-xs"
                title={p.card.plain}
                onClick={() =>
                  sb.mutate((h) => {
                    const at = placeAt(snap?.nodes.length ?? 0);
                    const idx = h.addNode(p.kind, at.x, at.y);
                    setSelected({ kind: "node", index: idx });
                  })
                }
              >
                {p.kind}
              </button>
            ))}
          </div>
          <h2 className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Systems processes
          </h2>
          <p className="mb-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
            Troncale's processes — each stamps its primitive circuit, not an atom
          </p>
          <div className="grid gap-1">
            {stampList.map((s) => (
              <button
                key={s.slug}
                className="rounded border px-2 py-1 text-left text-xs"
                style={{ borderColor: "var(--lens-accent, var(--accent))" }}
                title={`${s.blurb}\n↳ ${s.composition}\n${s.provenance}`}
                onClick={() =>
                  sb.mutate((h) => {
                    const base = h.stamp(s.name, 120, 90);
                    setSelected({ kind: "node", index: base });
                  })
                }
              >
                {s.name}
              </button>
            ))}
          </div>
        </aside>

        {/* canvas */}
        <main className="min-w-0 flex-1">
          {snap ? (
            snap.nodes.length > 0 ? (
              <SandboxCanvas
                snapshot={snap}
                selected={selected}
                onSelect={setSelected}
                onMoveNode={(i, x, y) => sb.mutate((h) => h.setNodePos(i, x, y))}
                onWire={(from, to, mode) => sb.mutate((h) => h.addWire(from, to, mode))}
                onDelete={onDelete}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  <p className="mb-1 font-semibold" style={{ color: "var(--text-primary)" }}>
                    Build a system from work processes
                  </p>
                  <p>① stamp a systems process (left rail)</p>
                  <p>② or add primitives and drag ∘ → component to wire</p>
                  <p>③ press Run — then tweak it while it flows</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
              loading the kernel…
            </div>
          )}
        </main>

        {/* inspector */}
        <aside className="w-72 shrink-0 overflow-y-auto border-l p-3">
          <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Inspector
          </h2>
          {snap && (
            <SandboxInspector
              snapshot={snap}
              palette={palette}
              selected={selected}
              mutate={sb.mutate}
              onDelete={onDelete}
            />
          )}
        </aside>
      </div>

      {/* metrics strip */}
      {snap && snap.nodes.length > 0 && <SandboxMetrics session={sb.session} snapshot={snap} />}

      {/* status line */}
      <footer className="border-t px-4 py-1 text-right font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
        {snap ? `${snap.nodes.length} components · ${snap.wires.length} bonds` : ""}
      </footer>
    </div>
  );
}
