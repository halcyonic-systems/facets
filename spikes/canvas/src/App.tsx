import { useEffect, useMemo, useRef, useState } from "react";
import * as kernel from "./kernel";
import type { Lens, ValidationResult } from "./kernel/types";
import { LENS_MODE } from "./kernel/types";
import { CanvasStage } from "./canvas/CanvasStage";
import { SEED_MODEL } from "./canvas/seed";
import type { CanvasModel } from "./kernel/types";

const LENSES: Lens[] = ["Klir", "Bunge", "Mobus"];

export default function App() {
  const [model, setModel] = useState<CanvasModel>(SEED_MODEL);
  const [toast, setToast] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const toastTimer = useRef<number | undefined>(undefined);

  function pushToast(msg: string) {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }

  function updateModel(updater: (m: CanvasModel) => CanvasModel) {
    setModel((m) => updater(m));
  }

  function setLens(lens: Lens) {
    setModel((m) => ({ ...m, lens }));
  }

  // The kernel verdict for the model's current lens, recomputed on every
  // structural change — this is the real, measured kernel latency, not a
  // simulated number.
  const { verdict, ms } = useMemo(() => {
    const t0 = performance.now();
    const result: ValidationResult = kernel.validateMode(model, LENS_MODE[model.lens]);
    const t1 = performance.now();
    return { verdict: result, ms: t1 - t0 };
  }, [model]);

  useEffect(() => {
    document.title = `bert-lenses spike — ${model.lens}`;
  }, [model.lens]);

  const verdictOk = verdict.issues.length === 0;

  return (
    <div className="flex h-screen w-screen flex-col">
      <header
        className="flex items-center gap-4 border-b px-5 py-3"
        style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}
      >
        <h1 className="font-display" style={{ fontSize: 19, color: "var(--text-primary)" }}>
          Accretion Canvas
        </h1>
        <span className="font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
          xyflow spike
        </span>

        <div className="ml-4 flex overflow-hidden" style={{ borderRadius: "var(--radius-pill)", border: "1px solid var(--border)" }}>
          {LENSES.map((lens) => (
            <button
              key={lens}
              onClick={() => setLens(lens)}
              className="px-4 py-1.5 font-medium transition-colors"
              style={{
                fontSize: 13,
                background: model.lens === lens ? "var(--accent)" : "var(--bg-secondary)",
                color: model.lens === lens ? "var(--bg-secondary)" : "var(--text-secondary)",
                transition: "var(--transition-base)",
              }}
            >
              {lens}
            </button>
          ))}
        </div>

        <div
          className="tabular ml-2 flex items-center gap-2 rounded-full px-3 py-1"
          style={{
            background: verdictOk ? "color-mix(in srgb, var(--verdict-ok) 14%, transparent)" : "color-mix(in srgb, var(--verdict-error) 14%, transparent)",
            color: verdictOk ? "var(--verdict-ok)" : "var(--verdict-error)",
            fontSize: 12,
          }}
          title={!verdictOk ? verdict.issues[0]?.message : undefined}
        >
          <span>{verdictOk ? "✓ clean" : `${verdict.issues.length} issue${verdict.issues.length === 1 ? "" : "s"}`}</span>
          {!verdictOk && <span className="max-w-[280px] truncate opacity-80">{verdict.issues[0]?.message}</span>}
        </div>

        <div className="ml-auto flex items-center gap-4 font-mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
          <span className="tabular">validate_mode: {ms.toFixed(2)}ms</span>
          <span className="tabular">{fps} fps</span>
        </div>
      </header>

      <div className="relative flex-1">
        <CanvasStage model={model} onModelChange={updateModel} onToast={pushToast} onFps={setFps} />

        <div
          className="pointer-events-none absolute bottom-4 left-4 rounded-lg px-3 py-2 font-mono"
          style={{ fontSize: 10.5, color: "var(--text-muted)", background: "var(--bg-secondary)", border: "1px solid var(--hairline)" }}
        >
          double-click canvas → new component · drag a rim handle onto another thing → propose a bond
        </div>

        {toast && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2 shadow-lg"
            style={{
              background: "var(--verdict-error)",
              color: "#fff",
              fontSize: 13,
              boxShadow: "var(--shadow-card-hover)",
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
