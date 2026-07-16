import { useEffect, useMemo, useRef, useState } from "react";
import { ready, runForced, toCanvas, project, parseCsv, analyzeCanvas } from "./kernel";
import type { CanvasModel, Manifest, RunResultRich } from "./kernel/types";
import { DEMOS, type Demo } from "./demos";
import Canvas from "./canvas/Canvas";
import { edgeGeometry, thingById } from "./canvas/geometry";
import { EdgePopover } from "./canvas/EdgePopover";
import { NodePopover } from "./canvas/NodePopover";
import { BoundaryPopover } from "./canvas/BoundaryPopover";
import { PaletteRail } from "./canvas/PaletteRail";
import type { PaletteTool } from "./canvas/lenses/registry";
import { SimScrubber } from "./canvas/SimScrubber";
import { type SimFrame } from "./canvas/types";
import type { Pt } from "./canvas/geometry";
import { BottomConsole } from "./BottomConsole";
import { Banner, Pill } from "./ui";
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

// Offer a JSON string to the browser as a file download — the save/export
// mechanism for a pure-wasm page with no native file bridge (anchor + Blob URL,
// no File System Access dependency, no server).
function downloadJson(filename: string, json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    ready()
      .then(() => setLoaded(true))
      .catch((e) => setLoadError(String(e)));
  }, []);

  // The shell owns the viewport: an h-screen column, no page scroll. The menu
  // bar is chrome; the workbench below fills what's left.
  return (
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {loaded ? (
        <Workspace />
      ) : (
        <>
          <MenuBar loaded={false} onOpen={() => {}} onImport={() => {}} onSave={() => {}} onExport={() => {}} canExport={false} />
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm" style={{ color: loadError ? "var(--verdict-error)" : "var(--text-muted)" }}>
              {loadError ? `Failed to load the wasm kernel: ${loadError}` : "loading kernel…"}
            </p>
          </div>
        </>
      )}
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
  const [selectedThingId, setSelectedThingId] = useState<number | null>(null);
  const [boundaryAnchor, setBoundaryAnchor] = useState<Pt | null>(null);
  const [armed, setArmed] = useState<PaletteTool | null>(null);
  const [canvasPan, setCanvasPan] = useState<Pt>({ x: 0, y: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  // Shell chrome state (presentation only): the File→Open gallery (also the
  // start screen before anything is loaded), the docked palette's collapse.
  const [galleryOpen, setGalleryOpen] = useState(true);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  // World → screen inside the canvas container (popover anchoring under zoom).
  const toScreen = (p: Pt): Pt => ({
    x: canvasPan.x + p.x * canvasScale,
    y: canvasPan.y + p.y * canvasScale,
  });
  const [toast, setToast] = useState<string | null>(null);

  // Esc = disarm the rail tool, else clear selection — the only global key.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setArmed((a) => {
        if (a) return null;
        setSelectedThingId(null);
        setSelectedRelationId(null);
        setBoundaryAnchor(null);
        return a;
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    setSelectedThingId(null);
    setArmed(null);
    setGalleryOpen(false);
    runWith(d.modelJson, d.csv, d.manifest, d.manifest.dt ?? 1, d.t); // one click → runs
  };

  // File → Import: load a user-supplied model JSON onto the canvas via the same
  // kernel seam the demo picker uses (toCanvas). No demo bundle means no CSV /
  // manifest, so the run path stays dark for imports — structure, lens, formal
  // object, and audit still light up (they read the canvas model).
  function importModel(json: string) {
    try {
      const cm = toCanvas(json);
      setDemo(null);
      setCanvasModel(cm);
      setManifest({ model: "", data: "", t: 12, mapping: [] });
      setResult(null);
      setRunError(null);
      setSelectedRelationId(null);
      setSelectedThingId(null);
      setBoundaryAnchor(null);
      setArmed(null);
      setGalleryOpen(false);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => importModel(String(reader.result));
    reader.onerror = () => setToast("could not read file");
    reader.readAsText(file);
  }

  // File → Save / Export: project the canvas editing model back to a bert-core
  // WorldModel (the display-faithful inverse of toCanvas) and offer it as a
  // download. This projected JSON is NEVER fed to the run path — runWith always
  // runs off the original demo model + CSV + manifest.
  function exportModel(suffix: string) {
    if (!canvasModel) return;
    try {
      const world = project(canvasModel);
      const name = (demo?.key ?? "model").replace(/[^a-z0-9_-]+/gi, "-");
      downloadJson(`${name}${suffix}.json`, JSON.stringify(world, null, 2));
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

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
  const issueTargets = analysis.ok?.issue_targets ?? [];
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
    // The armed tool belongs to the outgoing lens's verb list — disarm. The
    // canvas itself never resets (accretion pattern).
    setArmed(null);
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

  // A node edit from the popover (rename, work-process set/clear): same shape
  // as updateRelation — the kernel re-projects + re-judges on every change.
  function updateThing(next: import("./kernel/types").Thing) {
    setCanvasModel((m) =>
      m ? { ...m, things: m.things.map((t) => (t.id === next.id ? next : t)) } : m,
    );
  }

  const selectedThing =
    canvasModel && selectedThingId !== null ? (thingById(canvasModel, selectedThingId) ?? null) : null;

  function updateBoundary(next: import("./kernel/types").CanvasBoundaryProps) {
    setCanvasModel((m) => (m ? { ...m, boundary: next } : m));
  }

  const clean = verdict !== null && verdict.issues.length === 0;

  return (
    <>
      <MenuBar
        loaded={true}
        onOpen={() => setGalleryOpen(true)}
        onImport={() => importInputRef.current?.click()}
        onSave={() => exportModel(".model")}
        onExport={() => exportModel(".world")}
        canExport={canvasModel !== null}
      />
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        onChange={onImportFile}
        className="hidden"
      />

      {/* The workbench proper. data-lens drives the --lens-* seam: every
          descendant's chrome re-tints to the active lens (slate/indigo/teal),
          bound to the kernel Mode via LENS_TO_MODE — a reskin keyed on a kernel
          fact. The whole workbench (toolbar strip, palette, canvas, panels)
          lives under it so the seam reaches every lens-tinted control. */}
      <div
        className="flex min-h-0 flex-1 flex-col"
        data-lens={canvasModel?.lens ?? "Klir"}
      >
        {/* Provisional control strip — temporary neutral home for the
            lens-switch pills, clean/issues Pill, and the Δt/T + Run controls
            that used to live inside the canvas Card. NOT a designed toolbar:
            arrangement of the workbench's controls is still open. */}
        {canvasModel && (
          <div
            className="flex flex-wrap items-center gap-3 border-b px-4 py-2"
            style={{ borderColor: "var(--hairline)", background: "var(--bg-secondary)" }}
          >
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
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <NumField label="Δt" value={dt} onChange={setDt} />
              <NumField label="T" value={t} onChange={setT} />
              <button
                onClick={() => demo && runWith(demo.modelJson, demo.csv, manifest, dt, t)}
                disabled={!demo}
                title={demo ? "Run the forced simulation" : "Run needs a demo bundle (model + CSV + mapping)"}
                className="rounded-full px-5 py-2 text-sm font-semibold transition-colors"
                style={{ background: "var(--accent)", color: "#fff", opacity: demo ? 1 : 0.45, cursor: demo ? "pointer" : "not-allowed" }}
              >
                ▶ Run
              </button>
            </div>
          </div>
        )}

        {/* Body: docked-left palette + the canvas viewport it authors onto. */}
        <div className="flex min-h-0 flex-1">
          {canvasModel && (
            <PaletteDock collapsed={paletteCollapsed} onToggle={() => setPaletteCollapsed((c) => !c)}>
              <PaletteRail lens={canvasModel.lens} armed={armed} onArm={setArmed} />
            </PaletteDock>
          )}

          <main className="min-h-0 flex-1 overflow-y-auto">
            {canvasModel ? (
              <KernelErrorBoundary resetKeys={[canvasModel, demo?.key ?? "import"]}>
                <div className="flex min-h-full flex-col p-4">
                  {/* Canvas owns the viewport — fills the region (no more
                      height:440 cap), and its popovers/banners still anchor to
                      this relatively-positioned container. */}
                  <div
                    className="relative min-h-0 flex-1 overflow-hidden rounded-xl"
                    style={{
                      minHeight: 420,
                      border: "1px solid color-mix(in srgb, var(--lens-accent) 30%, var(--hairline))",
                    }}
                  >
                    <Canvas
                      model={canvasModel}
                      lens={canvasModel.lens}
                      facts={facts}
                      onModelChange={setCanvasModel}
                      onReject={setToast}
                      selectedRelationId={selectedRelationId}
                      onSelectRelation={setSelectedRelationId}
                      armed={armed}
                      onSelectThing={(id) => {
                        setSelectedThingId(id);
                        if (id !== null) setBoundaryAnchor(null);
                      }}
                      onSelectBoundary={(at) => {
                        setBoundaryAnchor(at);
                        setSelectedThingId(null);
                        setSelectedRelationId(null);
                      }}
                      driven={drivenNames}
                      sim={simFrame}
                      onPanChange={setCanvasPan}
                      onScaleChange={setCanvasScale}
                    />
                    {boundaryAnchor && (
                      <BoundaryPopover
                        boundary={canvasModel.boundary}
                        anchor={toScreen(boundaryAnchor)}
                        onUpdateBoundary={updateBoundary}
                        onClose={() => setBoundaryAnchor(null)}
                      />
                    )}
                    {selectedThing && (
                      <NodePopover
                        thing={selectedThing}
                        lens={canvasModel.lens}
                        anchor={toScreen({ x: selectedThing.x, y: selectedThing.y })}
                        onUpdateThing={updateThing}
                        onClose={() => setSelectedThingId(null)}
                      />
                    )}
                    {selectedRelation && popoverAnchor && (
                      <EdgePopover
                        relation={selectedRelation}
                        lens={canvasModel.lens}
                        sigIndex={canvasModel.relations.findIndex((r) => r.id === selectedRelation.id)}
                        headers={csvHeaders}
                        manifest={manifest}
                        anchor={toScreen(popoverAnchor)}
                        onApplyManifest={applyDrive}
                        onUpdateRelation={updateRelation}
                        onClose={() => setSelectedRelationId(null)}
                      />
                    )}
                    {/* Bunge's single most lens-specific rule: systemhood is
                        EARNED. The verdict is the kernel's (validate_mode(
                        Structural) via lens_facts.aggregate) — the face only
                        announces it. */}
                    {canvasModel.lens === "Bunge" && facts && (
                      <Banner
                        tone={facts.aggregate ? "error" : "soft"}
                        className="pointer-events-none absolute left-48 top-3"
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
                      arm a tool to stamp (Esc disarms) · click a node to edit · drag the handle dot to connect · click a flow to drive it
                    </div>
                    {toast && (
                      <Banner tone="error" className="absolute bottom-3 left-3">
                        rejected — {toast}
                      </Banner>
                    )}
                  </div>

                  {/* Canvas-adjacent sim controls: the scrubber animates the
                      canvas frame, so it stays attached to the canvas (not one
                      of the forked panels). */}
                  {result && (
                    <div className="mt-3 grid gap-3">
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

                  {/* PANEL-DOCK (arrangement B): the three forked analysis
                      panels live in a bottom-docked console beneath the canvas —
                      a tabbed results/terminal drawer (Run · Formal · Audit)
                      that collapses so the canvas reclaims height. Placement
                      only; each panel's props and behavior are unchanged. */}
                  <BottomConsole
                    result={result}
                    runError={runError}
                    analysisError={analysisError}
                    desc={desc}
                    verdict={verdict}
                    issueTargets={issueTargets}
                    clean={clean}
                    onNavigate={(t) => {
                      setBoundaryAnchor(null);
                      setSelectedThingId(t.thing);
                      setSelectedRelationId(t.relation);
                    }}
                  />
                </div>
              </KernelErrorBoundary>
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Open a demo (File → Open) or import a model (File → Import) to begin.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>

      {galleryOpen && (
        <OpenDialog
          selected={demo}
          onPick={pick}
          onClose={() => setGalleryOpen(false)}
          closable={canvasModel !== null}
        />
      )}
    </>
  );
}

// The thin top menu bar — Frost chrome, quiet, mono/small-caps. The File menu
// carries the working Open / Import / Save / Export seams.
function MenuBar({
  loaded,
  onOpen,
  onImport,
  onSave,
  onExport,
  canExport,
}: {
  loaded: boolean;
  onOpen: () => void;
  onImport: () => void;
  onSave: () => void;
  onExport: () => void;
  canExport: boolean;
}) {
  const [fileOpen, setFileOpen] = useState(false);
  const item = (label: string, onClick: () => void, disabled = false) => (
    <button
      onClick={() => {
        if (disabled) return;
        setFileOpen(false);
        onClick();
      }}
      disabled={disabled}
      className="block w-full px-3 py-1.5 text-left text-xs"
      style={{
        color: disabled ? "var(--text-muted)" : "var(--text-secondary)",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
  return (
    <div
      className="relative z-30 flex items-center gap-4 border-b px-3 py-1.5"
      style={{ borderColor: "var(--hairline)", background: "var(--bg-secondary)" }}
    >
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}
      >
        bert&#8202;·&#8202;lenses
      </span>
      <div className="relative">
        <button
          onClick={() => setFileOpen((o) => !o)}
          disabled={!loaded}
          className="rounded px-2 py-1 text-xs uppercase tracking-wide"
          style={{
            fontFamily: "var(--font-mono)",
            color: loaded ? "var(--text-secondary)" : "var(--text-muted)",
            background: fileOpen ? "var(--bg-surface)" : "transparent",
          }}
        >
          File
        </button>
        {fileOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setFileOpen(false)} />
            <div
              className="absolute left-0 top-full z-20 mt-1 w-40 rounded-md py-1"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-card)",
                borderRadius: "var(--radius-md)",
              }}
            >
              {item("Open…", onOpen)}
              {item("Import…", onImport)}
              <div className="my-1 border-t" style={{ borderColor: "var(--hairline)" }} />
              {item("Save", onSave, !canExport)}
              {item("Export", onExport, !canExport)}
            </div>
          </>
        )}
      </div>
      <span
        className="ml-auto inline-flex items-center gap-1.5 text-[11px]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
        title="crates/ = truth · web/ = face"
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: loaded ? "var(--accent)" : "var(--text-muted)" }}
        />
        {loaded ? "kernel · wasm" : "loading…"}
      </span>
    </div>
  );
}

// The docked, collapsible left palette panel — a real shell-level dock track.
// Its content (PaletteRail) is unchanged; only its position moved here from
// inside the canvas container.
function PaletteDock({
  collapsed,
  onToggle,
  children,
}: {
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  if (collapsed) {
    return (
      <div
        className="flex w-8 flex-col items-center border-r py-2"
        style={{ borderColor: "var(--hairline)", background: "var(--bg-secondary)" }}
      >
        <button
          onClick={onToggle}
          title="Show palette"
          className="text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          ▸
        </button>
      </div>
    );
  }
  return (
    <div
      className="relative w-48 shrink-0 overflow-y-auto border-r"
      style={{ borderColor: "var(--hairline)", background: "var(--bg-secondary)" }}
    >
      <div className="flex items-center justify-between px-3 pt-2">
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          palette
        </span>
        <button onClick={onToggle} title="Collapse palette" className="text-xs" style={{ color: "var(--text-muted)" }}>
          ◂
        </button>
      </div>
      {children}
    </div>
  );
}

// File → Open: the demo gallery, now a start screen / modal rather than a
// permanent hero section above the fold.
function OpenDialog({
  selected,
  onPick,
  onClose,
  closable,
}: {
  selected: Demo | null;
  onPick: (d: Demo) => void;
  onClose: () => void;
  closable: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
      style={{ background: "color-mix(in srgb, var(--bg-primary) 70%, transparent)" }}
      onClick={() => closable && onClose()}
    >
      <div
        className="w-full max-w-3xl rounded-2xl p-6"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card-hover)",
          borderRadius: "var(--radius-card)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Open a model
          </h2>
          {closable && (
            <button onClick={onClose} className="text-xs" style={{ color: "var(--text-muted)" }}>
              close
            </button>
          )}
        </div>
        <DemoGallery selected={selected} onPick={onPick} />
      </div>
    </div>
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
