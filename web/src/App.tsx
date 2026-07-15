import { useEffect, useMemo, useState } from "react";
import { ready, runForced, toCanvas, parseCsv, analyzeCanvas } from "./kernel";
import type { CanvasModel, Manifest, RunResultRich } from "./kernel/types";
import { DEMOS, type Demo } from "./demos";
import Canvas from "./canvas/Canvas";
import { edgeGeometry } from "./canvas/geometry";
import { EdgePopover } from "./canvas/EdgePopover";
import { SimScrubber } from "./canvas/SimScrubber";
import { type SimFrame } from "./canvas/types";
import type { Pt } from "./canvas/geometry";
import { RunPanel } from "./RunPanel";
import { FormalPanel } from "./FormalPanel";
import { Banner, Card, Pill } from "./ui";
import { KernelErrorBoundary } from "./KernelErrorBoundary";

const today = () => new Date().toISOString().slice(0, 10);
const LENSES: CanvasModel["lens"][] = ["Klir", "Bunge", "Mobus"];

// The minted demos carry the compose ladder's original tight spacing (~120px),
// too cramped for their domain-named flow labels ("Watershed → Reservoir").
// Purely a display scale-up of the loaded positions — no systems meaning here,
// just breathing room for the edge labels.
function spaceOut(model: CanvasModel): CanvasModel {
  const SPACING = 1.8;
  return { ...model, things: model.things.map((t) => ({ ...t, x: t.x * SPACING })) };
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    ready()
      .then(() => setLoaded(true))
      .catch((e) => setLoadError(String(e)));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <Header loaded={loaded} />
      {loadError && (
        <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
          Failed to load the wasm kernel: {loadError}
        </p>
      )}
      {loaded && <Workspace />}
      <Footer />
    </div>
  );
}

function Workspace() {
  const [demo, setDemo] = useState<Demo | null>(null);
  const [canvasModel, setCanvasModel] = useState<CanvasModel | null>(null);
  const [manifest, setManifest] = useState<Manifest>({ model: "", data: "", t: 12, mapping: [] });
  const [dt, setDt] = useState(1);
  const [t, setT] = useState(12);
  const [result, setResult] = useState<RunResultRich | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [selectedRelationId, setSelectedRelationId] = useState<number | null>(null);
  const [canvasPan, setCanvasPan] = useState<Pt>({ x: 0, y: 0 });
  const [toast, setToast] = useState<string | null>(null);

  const runWith = (modelJson: string, csv: string, m: Manifest, dtv: number, tv: number) => {
    try {
      const r = runForced(modelJson, csv, m, dtv, tv, today());
      setResult(r);
      setRunError(null);
      setTick(0);
    } catch (e) {
      setResult(null);
      setRunError(e instanceof Error ? e.message : String(e));
    }
  };

  const pick = (d: Demo) => {
    setDemo(d);
    setCanvasModel(spaceOut(toCanvas(d.modelJson))); // load the demo onto the canvas as a diagram
    setManifest(d.manifest);
    setDt(d.manifest.dt ?? 1);
    setT(d.t);
    setSelectedRelationId(null);
    runWith(d.modelJson, d.csv, d.manifest, d.manifest.dt ?? 1, d.t); // one click → runs
  };

  // The author-view verdict, lens facts, and formal object: every model or lens
  // change re-projects and re-judges in Rust — one atomic analyze_canvas call
  // (one deserialization, one projection), memoized on the canvas model. The
  // canvas renders these; it derives nothing.
  //
  // This call runs during render, so a kernel rejection on a partially-valid
  // editing state (which palette authoring routinely produces) would throw
  // straight through render and unmount the tree. Catch it here: the canvas
  // still draws its structure, and the verdict/formal panels show the kernel's
  // reason instead of white-screening. Recovery is automatic — a new canvas
  // model recomputes this memo. The KernelErrorBoundary below is the belt to
  // this suspenders, catching the same class of throw from child renders.
  const analysis = useMemo(() => {
    if (!canvasModel) return { ok: null, error: null as string | null };
    try {
      return { ok: analyzeCanvas(canvasModel), error: null };
    } catch (e) {
      return { ok: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [canvasModel]);
  const verdict = analysis.ok?.validation ?? null;
  const facts = analysis.ok?.facts ?? null;
  const desc = analysis.ok?.description ?? null;
  const analysisError = analysis.error;

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  const csvHeaders = useMemo(() => {
    if (!demo) return [];
    try {
      return parseCsv(demo.csv).headers;
    } catch {
      return [];
    }
  }, [demo]);

  // Which flows are currently driven — a structural fact read off the manifest,
  // independent of whether a run has happened yet.
  const drivenNames = useMemo(
    () =>
      new Set(
        manifest.mapping
          .filter((m) => m.as === "flow" && m.force && m.element)
          .map((m) => m.element as string),
      ),
    [manifest],
  );

  // The scrubber's per-tick readout: indexing into the kernel's trajectories /
  // comparisons at `tick`. No dynamics computed here — only array lookups.
  const simFrame: SimFrame | null = useMemo(() => {
    if (!result) return null;
    const nodes: SimFrame["nodes"] = {};
    for (const traj of result.trajectories) {
      if (traj.series.length === 0) continue;
      const min = Math.min(...traj.series);
      const max = Math.max(...traj.series);
      const value = traj.series[Math.min(tick, traj.series.length - 1)];
      nodes[traj.name] = { value, unit: traj.unit, frac: max > min ? (value - min) / (max - min) : 0.5 };
    }
    const edges: SimFrame["edges"] = {};
    for (const c of result.comparisons) {
      const value = c.simulated[Math.min(tick, c.simulated.length - 1)] ?? 0;
      edges[c.element] = { value, unit: c.unit };
    }
    return { nodes, edges };
  }, [result, tick]);

  const selectedRelation = canvasModel?.relations.find((r) => r.id === selectedRelationId) ?? null;
  const popoverAnchor = useMemo(() => {
    if (!canvasModel || !selectedRelation) return null;
    const geo = edgeGeometry(canvasModel, selectedRelation, canvasModel.lens !== "Klir");
    return geo ? geo.labelAt : null;
  }, [canvasModel, selectedRelation]);

  function setLens(lens: CanvasModel["lens"]) {
    setCanvasModel((m) => (m ? { ...m, lens } : m));
  }

  function applyDrive(next: Manifest) {
    setManifest(next);
    setSelectedRelationId(null);
    if (demo) runWith(demo.modelJson, demo.csv, next, dt, t);
  }

  // A per-lens edge edit (kind / bond⇄mere / direction / klir toggle): update
  // the editing model; the effect above re-projects + re-judges in Rust.
  function updateRelation(next: import("./kernel/types").Relation) {
    setCanvasModel((m) =>
      m ? { ...m, relations: m.relations.map((r) => (r.id === next.id ? next : r)) } : m,
    );
  }

  const clean = verdict !== null && verdict.issues.length === 0;

  return (
    <>
      <DemoGallery selected={demo} onPick={pick} />
      {demo && canvasModel && (
        <KernelErrorBoundary resetKeys={[canvasModel, demo.key]}>
        {/* data-lens drives the --lens-* seam: every descendant's chrome
            re-tints to the active lens (slate/indigo/teal), bound to the
            kernel Mode via LENS_TO_MODE — a reskin keyed on a kernel fact. */}
        <div className="mt-6 grid gap-5" data-lens={canvasModel.lens}>
          {analysisError && (
            <Card title="Kernel rejected this state" source="bert-core · wasm">
              <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
                {analysisError}
              </p>
              <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                The canvas still shows the structure below. Switch lens, undo the
                last edit, or load another demo to clear this.
              </p>
            </Card>
          )}
          <Card title={demo.title} source="bert-core + bert-compose · wasm">
            <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
              {demo.blurb}
            </p>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div
                className="flex items-center gap-1 rounded-pill p-1"
                style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-pill)" }}
              >
                {LENSES.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLens(l)}
                    className="rounded-pill px-3 py-1.5 text-sm font-body transition-colors"
                    style={{
                      borderRadius: "var(--radius-pill)",
                      background: canvasModel.lens === l ? "var(--lens-accent)" : "transparent",
                      color: canvasModel.lens === l ? "#fff" : "var(--text-secondary)",
                      transition: "var(--transition-base)",
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <Pill tone={clean ? "ok" : "warning"}>
                {verdict === null
                  ? "…"
                  : clean
                    ? "✓ clean"
                    : `${verdict.issues.length} issue${verdict.issues.length === 1 ? "" : "s"}`}
              </Pill>
            </div>

            <div
              className="relative overflow-hidden rounded-xl"
              style={{ height: 440, border: "1px solid var(--hairline)" }}
            >
              <Canvas
                model={canvasModel}
                lens={canvasModel.lens}
                facts={facts}
                onModelChange={setCanvasModel}
                onReject={setToast}
                selectedRelationId={selectedRelationId}
                onSelectRelation={setSelectedRelationId}
                driven={drivenNames}
                sim={simFrame}
                onPanChange={setCanvasPan}
              />
              {selectedRelation && popoverAnchor && (
                <EdgePopover
                  relation={selectedRelation}
                  lens={canvasModel.lens}
                  sigIndex={canvasModel.relations.findIndex((r) => r.id === selectedRelation.id)}
                  headers={csvHeaders}
                  manifest={manifest}
                  anchor={{ x: canvasPan.x + popoverAnchor.x, y: canvasPan.y + popoverAnchor.y }}
                  onApplyManifest={applyDrive}
                  onUpdateRelation={updateRelation}
                  onClose={() => setSelectedRelationId(null)}
                />
              )}
              {/* Bunge's single most lens-specific rule: systemhood is EARNED.
                  The verdict is the kernel's (validate_mode(Structural) via
                  lens_facts.aggregate) — the face only announces it. */}
              {canvasModel.lens === "Bunge" && facts && (
                <Banner
                  tone={facts.aggregate ? "error" : "soft"}
                  className="pointer-events-none absolute left-3 top-3"
                >
                  {facts.aggregate
                    ? "⚠ aggregate (heap) — no bond among distinct components (Bunge Def 1.1)"
                    : "✓ system — ≥1 bond among distinct components (Bunge Def 1.1)"}
                </Banner>
              )}
              <div
                className="pointer-events-none absolute bottom-3 right-3 text-[11px] font-mono"
                style={{ color: "var(--text-muted)" }}
              >
                click a flow to drive it · drag a node to move · drag the teal dot to connect
              </div>
              {toast && (
                <Banner tone="error" className="absolute bottom-3 left-3">
                  rejected — {toast}
                </Banner>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <NumField label="Δt" value={dt} onChange={setDt} />
              <NumField label="T" value={t} onChange={setT} />
              <button
                onClick={() => runWith(demo.modelJson, demo.csv, manifest, dt, t)}
                className="rounded-full px-5 py-2 text-sm font-semibold transition-colors"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                ▶ Run
              </button>
            </div>

            {result && (
              <div className="mt-5 grid gap-3">
                <SimScrubber result={result} tick={tick} onTick={setTick} />
                <div className="flex flex-wrap items-center gap-3">
                  <Pill tone={result.conserved ? "ok" : "error"}>
                    {result.conserved ? "✓ conserved" : "⚠ leak"}
                  </Pill>
                  <span className="text-xs tabular" style={{ color: "var(--text-muted)" }}>
                    residual {result.residual.toExponential(1)}
                  </span>
                </div>
              </div>
            )}
          </Card>

          {desc && <FormalPanel desc={desc} />}

          {runError && (
            <Card title="Result" source="bert-compose · wasm">
              <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
                {runError}
              </p>
            </Card>
          )}
          {result && <RunPanel result={result} />}
        </div>
        </KernelErrorBoundary>
      )}
    </>
  );
}

function DemoGallery({ selected, onPick }: { selected: Demo | null; onPick: (d: Demo) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {DEMOS.map((d) => {
        const active = selected?.key === d.key;
        return (
          <button
            key={d.key}
            onClick={() => onPick(d)}
            className="rounded-2xl p-4 text-left transition-shadow"
            style={{
              background: "var(--bg-secondary)",
              border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              boxShadow: active ? "var(--shadow-card-hover)" : "var(--shadow-card)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <div
              className="text-base font-semibold"
              style={{
                fontFamily: "var(--font-display)",
                color: active ? "var(--accent-strong)" : "var(--text-primary)",
              }}
            >
              {d.title}
            </div>
            <div className="mt-1 text-xs leading-snug" style={{ color: "var(--text-muted)" }}>
              {d.blurb.split(".")[0]}.
            </div>
          </button>
        );
      })}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
      {label}
      <input
        type="number"
        value={value}
        min={0}
        step="any"
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-20 rounded-md px-2 py-1 text-sm tabular"
        style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
      />
    </label>
  );
}

function Header({ loaded }: { loaded: boolean }) {
  return (
    <header className="mb-8">
      <h1
        style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        className="text-5xl font-semibold tracking-tight"
      >
        bert&#8202;·&#8202;lenses
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        Load a model onto the canvas, click a flow to drive it with real data, run —
        and watch it run on the structure. The Rust kernel (bert-core + bert-compose)
        does every bit of it in WebAssembly, right here in the page.
      </p>
      <div className="mt-4">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
          style={{
            background: loaded ? "var(--accent-soft)" : "var(--bg-surface)",
            color: loaded ? "var(--accent-strong)" : "var(--text-muted)",
            border: "1px solid var(--border)",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: loaded ? "var(--accent)" : "var(--text-muted)" }}
          />
          {loaded ? "kernel loaded (wasm)" : "loading kernel…"}
        </span>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer
      className="mt-12 border-t pt-5 text-xs leading-relaxed"
      style={{ borderColor: "var(--hairline)", color: "var(--text-muted)" }}
    >
      Every gate, projection, forced simulation, and number above was computed in Rust
      (bert-core + bert-compose) compiled to WebAssembly, in this tab. The React layer
      parsed no models and decided no verdicts.{" "}
      <span style={{ color: "var(--text-secondary)" }}>crates/ = truth · web/ = face.</span>
    </footer>
  );
}
