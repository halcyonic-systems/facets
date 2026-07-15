import { useEffect, useState } from "react";
import Canvas from "./Canvas";
import { ready, validateMode } from "./kernel";
import { SEED_MODEL } from "./seed";
import type { CanvasModel, Lens, ValidationResult } from "./types";
import { LENS_TO_MODE } from "./types";
import { useFps } from "./useFps";

const LENSES: Lens[] = ["Klir", "Bunge", "Mobus"];

export default function App() {
  const [kernelReady, setKernelReady] = useState(false);
  const [model, setModel] = useState<CanvasModel>(SEED_MODEL);
  const [verdict, setVerdict] = useState<ValidationResult | null>(null);
  const [toggleMs, setToggleMs] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fps = useFps();

  useEffect(() => {
    ready().then(() => setKernelReady(true));
  }, []);

  useEffect(() => {
    if (!kernelReady) return;
    const t0 = performance.now();
    const v = validateMode(model, LENS_TO_MODE[model.lens]);
    setToggleMs(performance.now() - t0);
    setVerdict(v);
  }, [kernelReady, model.lens, model.things, model.relations]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  function setLens(lens: Lens) {
    setModel((m) => ({ ...m, lens }));
  }

  const clean = verdict !== null && verdict.issues.length === 0;

  return (
    <div className="h-screen w-screen flex flex-col">
      <header className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-4">
          <h1 className="font-display text-lg" style={{ color: "var(--text-primary)" }}>
            bert-lenses — accretion canvas
          </h1>
          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            SVG spike
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-pill p-1" style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-pill)" }}>
          {LENSES.map((l) => (
            <button
              key={l}
              onClick={() => setLens(l)}
              className="px-3 py-1.5 text-sm font-body rounded-pill transition-colors"
              style={{
                borderRadius: "var(--radius-pill)",
                background: model.lens === l ? "var(--accent)" : "transparent",
                color: model.lens === l ? "white" : "var(--text-secondary)",
                transition: "var(--transition-base)",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          <span>{fps} fps</span>
          <span>{toggleMs !== null ? `${toggleMs.toFixed(2)}ms toggle` : "—"}</span>
          <span
            className="px-2 py-1 rounded-md tabular"
            style={{
              background: clean ? "var(--verdict-ok)" : "var(--verdict-error)",
              color: "white",
              opacity: 0.9,
              borderRadius: "var(--radius-sm)",
            }}
          >
            {verdict === null
              ? "…"
              : clean
                ? "✓ clean"
                : `${verdict.issues.length} issue${verdict.issues.length === 1 ? "" : "s"} — ${verdict.issues[0].message}`}
          </span>
        </div>
      </header>

      <main className="flex-1 relative">
        {kernelReady ? (
          <Canvas model={model} lens={model.lens} onModelChange={setModel} onReject={setToast} />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-mono text-sm" style={{ color: "var(--text-muted)" }}>
            loading kernel…
          </div>
        )}

        {toast && (
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md text-sm font-body shadow-lg"
            style={{ background: "var(--verdict-error)", color: "white", boxShadow: "var(--shadow-card-hover)" }}
          >
            rejected — {toast}
          </div>
        )}

        <div
          className="absolute bottom-4 right-4 text-[11px] font-mono leading-relaxed px-3 py-2 rounded-md"
          style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", boxShadow: "var(--shadow-card)", borderRadius: "var(--radius-md)" }}
        >
          drag node = move · drag teal dot = connect (drop on a node, or itself for a self-loop) · dbl-click empty = new component
        </div>
      </main>
    </div>
  );
}
