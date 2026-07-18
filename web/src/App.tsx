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
import { InspectorDock } from "./InspectorDock";
import { SlPane } from "./SlPane";
import type { SlError } from "./kernel/types";
import { Banner, Pill } from "./ui";
import { KernelErrorBoundary } from "./KernelErrorBoundary";
import {
  isFolderSupported,
  pickDirectory,
  writeModel,
  listModelFiles,
  readModelFile,
  type DirHandleLike,
} from "./fsAccess";
import { saveModel, listModels, loadModel, deleteModel } from "./modelStore";

const today = () => new Date().toISOString().slice(0, 10);
const LENSES: CanvasModel["lens"][] = ["Klir", "Bunge", "Mobus"];

// The SL pane's seed text — Mobus's steel plant (Ch.4 §4.3.1) as a system
// paragraph, so the pane's first Compile produces a live model.
const SL_SEED = `# Mobus's steel plant — a system paragraph in SL
system : Concrete/Technical
domain "steel manufacturing"
component "Steel Plant" primitive Combining interface
source "Iron Vendor"
source "Power Utility"
sink Customers
sink "Waste Disposal"
flow "Iron Vendor" -> "Steel Plant" : matter "iron"
flow "Power Utility" -> "Steel Plant" : energy "electricity"
flow "Steel Plant" -> Customers : matter "steel"
flow "Steel Plant" -> "Waste Disposal" : matter "scrap"
boundary porosity 0.7 fuzziness 0.1

@lens mobus
`;

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
// A coarse "saved N ago" hint for the library rows — good enough for a listing,
// no dependency. Reads off Date.now() at render.
function relTime(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

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
          {/* During kernel load the File button is disabled (loaded={false}),
              so its menu never opens — the items are visibly greyed, not silent
              no-ops behind a live-looking menu. */}
          <MenuBar loaded={false} onNew={() => {}} onOpen={() => {}} onSave={() => {}} onExport={() => {}} onSaveToFolder={() => {}} onSaveToLibrary={() => {}} canExport={false} hasModel={false} currentLabel={null} dirty={false} onHome={() => {}} libraryModels={[]} onSwitchDemo={() => {}} onSwitchLibrary={() => {}} onOpenFull={() => {}} />
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
  // Unsaved-work tracking (presentation-only): true once the loaded model has
  // been edited on the canvas or via a popover, cleared on every load/new/save
  // seam. The nav affordances (Home, Switch model) confirm-before-discard only
  // when this is set, so an untouched or freshly-saved model navigates freely.
  const [dirty, setDirty] = useState(false);
  // The SL text pane (textual authoring surface). Text + faults live here so
  // the pane survives toggling; seeded with a worked example (Mobus's steel
  // plant, Ch.4 §4.3.1) so the first Compile lands a real model.
  const [slOpen, setSlOpen] = useState(false);
  const [slText, setSlText] = useState(SL_SEED);
  const [slErrors, setSlErrors] = useState<SlError[]>([]);
  // Folder save/load (File System Access): the picked working folder, the
  // current model's filename stem (so re-saving is one gesture into the same
  // file), the SaveDialog toggle, and the folder listing shown in OpenDialog
  // (null = folder not picked this session yet). Explicit-save only — nothing
  // here fires without a menu/button gesture.
  const [dirHandle, setDirHandle] = useState<DirHandleLike | null>(null);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [folderFiles, setFolderFiles] = useState<string[] | null>(null);
  // The browser-local model library (IndexedDB, fsAccess.ts's flag-free sibling):
  // whether the pending SaveDialog writes to the folder or the library, and the
  // library's current listing (shown in OpenDialog, refreshed when it opens).
  const [saveTarget, setSaveTarget] = useState<"folder" | "library">("folder");
  const [libraryModels, setLibraryModels] = useState<{ name: string; savedAt: number }[]>([]);
  // A soft, informational message channel, distinct from `toast` (which the
  // canvas reserves for kernel rejections, rendered "rejected — …").
  const [notice, setNotice] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  // World → screen inside the canvas container (popover anchoring under zoom).
  const toScreen = (p: Pt): Pt => ({
    x: canvasPan.x + p.x * canvasScale,
    y: canvasPan.y + p.y * canvasScale,
  });
  const [toast, setToast] = useState<string | null>(null);

  // Esc = disarm the rail tool, else clear selection. Delete/Backspace removes the
  // selected node or flow (guarded so it never fires while typing in a field).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setArmed((a) => {
          if (a) return null;
          setSelectedThingId(null);
          setSelectedRelationId(null);
          setBoundaryAnchor(null);
          return a;
        });
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const el = document.activeElement as HTMLElement | null;
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
        if (selectedThingId !== null) {
          e.preventDefault();
          deleteThing(selectedThingId);
        } else if (selectedRelationId !== null) {
          e.preventDefault();
          deleteRelation(selectedRelationId);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedThingId, selectedRelationId]);

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
    setDirty(false);
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
      setDirty(false);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  // SL pane → Compile: the parsed model lands through the same reset seam as
  // import. The lens is view state — if a model is already on the canvas, the
  // author's current lens survives the compile unless the text pinned one via
  // @lens (the parser reports which).
  function onSlCompiled(cm: CanvasModel, lensExplicit: boolean) {
    setDemo(null);
    setCanvasModel((prev) => (prev && !lensExplicit ? { ...cm, lens: prev.lens } : cm));
    setManifest({ model: "", data: "", t: 12, mapping: [] });
    setResult(null);
    setRunError(null);
    setSelectedRelationId(null);
    setSelectedThingId(null);
    setBoundaryAnchor(null);
    setArmed(null);
    setGalleryOpen(false);
    setDirty(false);
    setNotice("SL compiled ✓");
  }

  // File → New: a blank canvas to author a model from scratch (the #14 path — no
  // demo bundle, so the run stays dark until tethered; structure/lens/formal/audit
  // read the empty model). Boundary defaults are neutral, editable via the popover.
  function newModel() {
    setDemo(null);
    setCanvasModel({ lens: "Mobus", things: [], relations: [], boundary: { porosity: 0, perceptive_fuzziness: 0 } });
    setManifest({ model: "", data: "", t: 12, mapping: [] });
    setResult(null);
    setRunError(null);
    setSelectedRelationId(null);
    setSelectedThingId(null);
    setBoundaryAnchor(null);
    setArmed(null);
    setGalleryOpen(false);
    setDirty(false);
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

  // File → Save to folder…: the native-file counterpart to the download-based
  // Save/Export. Pick a working folder once (reused thereafter), then a small
  // SaveDialog names the file — writing is still explicit (menu → dialog → Save),
  // never automatic. On unsupported browsers the download Save/Export remain.
  async function saveToFolder() {
    if (!canvasModel) return;
    if (!isFolderSupported()) {
      setNotice(
        "Folder access is off in this browser. Brave disables the File System Access API by default — enable brave://flags/#file-system-access-api and relaunch, or use Chrome/Edge.",
      );
      return;
    }
    try {
      let dir = dirHandle;
      if (!dir) {
        dir = await pickDirectory();
        if (!dir) return; // cancelled the picker
        setDirHandle(dir);
      }
      setSaveTarget("folder");
      setSaveDialogOpen(true);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  // File → Save to library…: the flag-free counterpart to Save to folder. No
  // picker, no feature gate — IndexedDB is everywhere. Just name the model, then
  // confirmSave routes to saveModel below.
  function saveToLibrary() {
    if (!canvasModel) return;
    setSaveTarget("library");
    setSaveDialogOpen(true);
  }

  // SaveDialog confirm: project the canvas model to JSON, then write it either to
  // the picked folder (File System Access) or the browser-local library
  // (IndexedDB), per saveTarget. The name becomes `currentName` so a re-save
  // defaults to overwriting the same slot.
  async function confirmSave(name: string) {
    if (!canvasModel) return;
    const stem = name.trim().replace(/\.json$/i, "") || "untitled";
    const json = JSON.stringify(project(canvasModel), null, 2);
    try {
      if (saveTarget === "library") {
        await saveModel(stem, json);
        setLibraryModels(await listModels());
        setCurrentName(stem);
        setSaveDialogOpen(false);
        setDirty(false);
        setNotice(`saved to library → ${stem}`);
        return;
      }
      if (!dirHandle) return;
      await writeModel(dirHandle, stem, json);
      setCurrentName(stem);
      setSaveDialogOpen(false);
      setDirty(false);
      setNotice(`saved → ${stem}.json`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  // OpenDialog → Open from folder…: pick a folder and list its .json models.
  async function openFolder() {
    if (!isFolderSupported()) {
      setNotice(
        "Folder access is off in this browser. Brave disables the File System Access API by default — enable brave://flags/#file-system-access-api and relaunch, or use Chrome/Edge.",
      );
      return;
    }
    try {
      const dir = await pickDirectory();
      if (!dir) return; // cancelled
      setDirHandle(dir);
      setFolderFiles(await listModelFiles(dir));
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  // Load one file from the picked folder onto the canvas — same seam as import
  // (toCanvas + reset), plus it remembers the folder + filename stem for saving.
  async function openFromFolder(name: string) {
    if (!dirHandle) return;
    try {
      const cm = toCanvas(await readModelFile(dirHandle, name));
      setDemo(null);
      setCanvasModel(cm);
      setManifest({ model: "", data: "", t: 12, mapping: [] });
      setResult(null);
      setRunError(null);
      setSelectedRelationId(null);
      setSelectedThingId(null);
      setBoundaryAnchor(null);
      setArmed(null);
      setCurrentName(name.replace(/\.json$/i, ""));
      setGalleryOpen(false);
      setDirty(false);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  // OpenDialog → Saved in this browser: load one model out of the IndexedDB
  // library onto the canvas — same seam as import (toCanvas + reset), and it
  // remembers the name so a re-save overwrites the same library slot.
  async function loadFromLibrary(name: string) {
    try {
      const cm = toCanvas(await loadModel(name));
      setDemo(null);
      setCanvasModel(cm);
      setManifest({ model: "", data: "", t: 12, mapping: [] });
      setResult(null);
      setRunError(null);
      setSelectedRelationId(null);
      setSelectedThingId(null);
      setBoundaryAnchor(null);
      setArmed(null);
      setCurrentName(name);
      setGalleryOpen(false);
      setDirty(false);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  // Drop one model from the library and refresh the listing in place.
  async function removeFromLibrary(name: string) {
    try {
      await deleteModel(name);
      setLibraryModels(await listModels());
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

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 2800);
    return () => clearTimeout(id);
  }, [notice]);

  // Refresh the library listing whenever the Open dialog opens, so the "Saved in
  // this browser" section reflects the current IndexedDB contents.
  useEffect(() => {
    if (!galleryOpen) return;
    listModels()
      .then(setLibraryModels)
      .catch((e) => setToast(e instanceof Error ? e.message : String(e)));
  }, [galleryOpen]);

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
    setDirty(true);
  }

  // Delete removes the selected element. Deleting a component cascades to its
  // flows — a relation can't dangle to a thing that no longer exists.
  function deleteThing(id: number) {
    setCanvasModel((m) =>
      m
        ? {
            ...m,
            things: m.things.filter((t) => t.id !== id),
            relations: m.relations.filter((r) => r.a !== id && r.b !== id),
          }
        : m,
    );
    setSelectedThingId(null);
    setDirty(true);
  }

  function deleteRelation(id: number) {
    setCanvasModel((m) => (m ? { ...m, relations: m.relations.filter((r) => r.id !== id) } : m));
    setSelectedRelationId(null);
    setDirty(true);
  }

  // A node edit from the popover (rename, work-process set/clear): same shape
  // as updateRelation — the kernel re-projects + re-judges on every change.
  function updateThing(next: import("./kernel/types").Thing) {
    setCanvasModel((m) =>
      m ? { ...m, things: m.things.map((t) => (t.id === next.id ? next : t)) } : m,
    );
    setDirty(true);
  }

  const selectedThing =
    canvasModel && selectedThingId !== null ? (thingById(canvasModel, selectedThingId) ?? null) : null;

  function updateBoundary(next: import("./kernel/types").CanvasBoundaryProps) {
    setCanvasModel((m) => (m ? { ...m, boundary: next } : m));
    setDirty(true);
  }

  const clean = verdict !== null && verdict.issues.length === 0;

  // A human label for the model now on the canvas — the demo's title, else the
  // saved name, else a neutral "untitled". Shown in the menu bar and used to
  // mark the active row in the Switch menu.
  const currentLabel = demo?.title ?? currentName ?? (canvasModel ? "untitled" : null);

  // Confirm-before-discard gate for the nav affordances. No dirty-model guard
  // existed before this wave, so this is it: only the unsaved-work case prompts.
  function guardDiscard(): boolean {
    if (!dirty) return true;
    return window.confirm("Discard unsaved changes to the current model?");
  }

  // Home / Close (#73): leave the canvas and return to the start screen — a null
  // model behind the open gallery, exactly the app's initial state. The one
  // route back out of a loaded model.
  function goHome() {
    if (!guardDiscard()) return;
    setDemo(null);
    setCanvasModel(null);
    setManifest({ model: "", data: "", t: 12, mapping: [] });
    setResult(null);
    setRunError(null);
    setSelectedRelationId(null);
    setSelectedThingId(null);
    setBoundaryAnchor(null);
    setArmed(null);
    setCurrentName(null);
    setDirty(false);
    setGalleryOpen(true);
  }

  // Switch model (#74): load another model without routing through the full
  // Open… dialog. Both quick paths reuse the existing load seams (which reset
  // dirty), guarded so an unsaved model isn't silently dropped.
  function switchToDemo(d: Demo) {
    if (!guardDiscard()) return;
    pick(d);
  }
  function switchToLibrary(name: string) {
    if (!guardDiscard()) return;
    loadFromLibrary(name);
  }

  return (
    <>
      <MenuBar
        loaded={true}
        onNew={newModel}
        onOpen={() => setGalleryOpen(true)}
        onSave={() => exportModel(".model")}
        onExport={() => exportModel(".world")}
        onSaveToFolder={saveToFolder}
        onSaveToLibrary={saveToLibrary}
        canExport={canvasModel !== null}
        hasModel={canvasModel !== null}
        currentLabel={currentLabel}
        dirty={dirty}
        onHome={goHome}
        libraryModels={libraryModels}
        onSwitchDemo={switchToDemo}
        onSwitchLibrary={switchToLibrary}
        onOpenFull={() => setGalleryOpen(true)}
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
            <button
              onClick={() => setSlOpen((o) => !o)}
              className="rounded-pill px-3 py-1.5 text-sm font-body transition-colors"
              style={{
                borderRadius: "var(--radius-pill)",
                background: slOpen ? "var(--lens-accent)" : "var(--bg-surface)",
                color: slOpen ? "#fff" : "var(--text-secondary)",
              }}
              title="Toggle the SL text pane (textual authoring surface)"
            >
              SL
            </button>
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

          {/* The SL text pane — mounts independently of a loaded model, so an
              author can write a model from blank text. */}
          {slOpen && (
            <SlPane
              text={slText}
              errors={slErrors}
              onTextChange={setSlText}
              onErrors={setSlErrors}
              onCompiled={onSlCompiled}
              onClose={() => setSlOpen(false)}
              canvasModel={canvasModel}
            />
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
                      onModelChange={(m) => {
                        setCanvasModel(m);
                        setDirty(true);
                      }}
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
                        onDelete={() => deleteThing(selectedThing.id)}
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
                        onDelete={() => deleteRelation(selectedRelation.id)}
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
                    {notice && (
                      <Banner tone="soft" className="absolute bottom-3 left-3">
                        {notice}
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

                  {/* The Run / Formal / Audit panels no longer stack here — they
                      live in the right-docked InspectorDock (a sibling of this
                      <main>, below), so the canvas keeps the full viewport. */}
                </div>
              </KernelErrorBoundary>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Open a demo or a model file (File → Open…) to begin.
                </p>
                {!slOpen && (
                  <button
                    onClick={() => setSlOpen(true)}
                    className="rounded-full px-4 py-1.5 text-sm font-semibold"
                    style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--hairline)" }}
                  >
                    …or write SL text
                  </button>
                )}
              </div>
            )}
          </main>

          {/* Right-edge instrument dock: Run / Formal / Audit as tabs, one
              visible at a time, full height of the work region. Only mounts once
              a model is loaded — before that the canvas empty-state holds the
              main region alone. */}
          {canvasModel && (
            <InspectorDock
              result={result}
              runError={runError}
              desc={desc}
              verdict={verdict}
              issueTargets={issueTargets}
              analysisError={analysisError}
              canvasModel={canvasModel}
              onNavigate={(t) => {
                setBoundaryAnchor(null);
                setSelectedThingId(t.thing);
                setSelectedRelationId(t.relation);
              }}
              onSystemTypeChange={(st) => setCanvasModel((m) => (m ? { ...m, system_type: st } : m))}
              resetKeys={[canvasModel, demo?.key ?? "import"]}
            />
          )}
        </div>
      </div>

      {galleryOpen && (
        <OpenDialog
          selected={demo}
          onPick={pick}
          onNew={newModel}
          onWriteSl={() => {
            setSlOpen(true);
            setGalleryOpen(false);
          }}
          onClose={() => setGalleryOpen(false)}
          closable={canvasModel !== null}
          onOpenFile={() => importInputRef.current?.click()}
          folderSupported={isFolderSupported()}
          folderFiles={folderFiles}
          onOpenFolder={openFolder}
          onOpenFromFolder={openFromFolder}
          libraryModels={libraryModels}
          onLoadFromLibrary={loadFromLibrary}
          onDeleteFromLibrary={removeFromLibrary}
        />
      )}

      {saveDialogOpen && (
        <SaveDialog
          target={saveTarget}
          defaultName={currentName ?? "untitled"}
          onSave={confirmSave}
          onClose={() => setSaveDialogOpen(false)}
        />
      )}
    </>
  );
}

// The thin top menu bar — Frost chrome, quiet, mono/small-caps. The File menu
// carries the working Open / Save / Export seams. Opening a disk file folds into
// Open…'s "From a file" section rather than a separate Import item.
function MenuBar({
  loaded,
  onNew,
  onOpen,
  onSave,
  onExport,
  onSaveToFolder,
  onSaveToLibrary,
  canExport,
  hasModel,
  currentLabel,
  dirty,
  onHome,
  libraryModels,
  onSwitchDemo,
  onSwitchLibrary,
  onOpenFull,
}: {
  loaded: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExport: () => void;
  onSaveToFolder: () => void;
  onSaveToLibrary: () => void;
  canExport: boolean;
  hasModel: boolean;
  currentLabel: string | null;
  dirty: boolean;
  onHome: () => void;
  libraryModels: { name: string; savedAt: number }[];
  onSwitchDemo: (d: Demo) => void;
  onSwitchLibrary: (name: string) => void;
  onOpenFull: () => void;
}) {
  const [fileOpen, setFileOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
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

      {/* Home / Close (#73): the one route back to the start screen from a
          loaded model. Disabled when already home (no model), so it never
          no-ops silently. */}
      <button
        onClick={onHome}
        disabled={!loaded || !hasModel}
        title={hasModel ? "Close this model and return to the start screen" : "Already at the start screen"}
        className="rounded px-2 py-1 text-xs uppercase tracking-wide"
        style={{
          fontFamily: "var(--font-mono)",
          color: loaded && hasModel ? "var(--text-secondary)" : "var(--text-muted)",
          opacity: loaded && hasModel ? 1 : 0.5,
          cursor: loaded && hasModel ? "pointer" : "not-allowed",
        }}
      >
        Home
      </button>

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
              {item("New", onNew)}
              {item("Open…", onOpen)}
              <div className="my-1 border-t" style={{ borderColor: "var(--hairline)" }} />
              {item("Save", onSave, !canExport)}
              {item("Save to folder…", onSaveToFolder, !canExport)}
              {item("Save to library…", onSaveToLibrary, !canExport)}
              {item("Export", onExport, !canExport)}
            </div>
          </>
        )}
      </div>
      {/* Switch model (#74): an in-canvas quick-open — demos + browser library
          in a compact menu, so switching models never routes through the full
          Open… dialog. Only meaningful once a model is loaded. */}
      <div className="relative">
        <button
          onClick={() => setSwitchOpen((o) => !o)}
          disabled={!loaded || !hasModel}
          className="rounded px-2 py-1 text-xs uppercase tracking-wide"
          style={{
            fontFamily: "var(--font-mono)",
            color: loaded && hasModel ? "var(--text-secondary)" : "var(--text-muted)",
            opacity: loaded && hasModel ? 1 : 0.5,
            cursor: loaded && hasModel ? "pointer" : "not-allowed",
            background: switchOpen ? "var(--bg-surface)" : "transparent",
          }}
          title="Switch to another model without leaving the canvas"
        >
          Switch ▾
        </button>
        {switchOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setSwitchOpen(false)} />
            <div
              className="absolute left-0 top-full z-20 mt-1 max-h-[70vh] w-56 overflow-y-auto py-1"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-card)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div
                className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                Demos
              </div>
              {DEMOS.map((d) => {
                const active = currentLabel === d.title;
                return (
                  <button
                    key={d.key}
                    onClick={() => {
                      setSwitchOpen(false);
                      onSwitchDemo(d);
                    }}
                    className="block w-full truncate px-3 py-1.5 text-left text-xs"
                    style={{ color: active ? "var(--accent-strong)" : "var(--text-secondary)" }}
                    title={d.title}
                  >
                    {active ? "• " : ""}
                    {d.title}
                  </button>
                );
              })}
              <div className="my-1 border-t" style={{ borderColor: "var(--hairline)" }} />
              <div
                className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                Saved in this browser
              </div>
              {libraryModels.length === 0 ? (
                <div className="px-3 py-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  no saved models yet
                </div>
              ) : (
                libraryModels.map((m) => {
                  const active = currentLabel === m.name;
                  return (
                    <button
                      key={m.name}
                      onClick={() => {
                        setSwitchOpen(false);
                        onSwitchLibrary(m.name);
                      }}
                      className="block w-full truncate px-3 py-1.5 text-left text-xs"
                      style={{ color: active ? "var(--accent-strong)" : "var(--text-secondary)" }}
                      title={m.name}
                    >
                      {active ? "• " : ""}
                      {m.name}
                    </button>
                  );
                })
              )}
              <div className="my-1 border-t" style={{ borderColor: "var(--hairline)" }} />
              <button
                onClick={() => {
                  setSwitchOpen(false);
                  onOpenFull();
                }}
                className="block w-full px-3 py-1.5 text-left text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                More… (Open dialog)
              </button>
            </div>
          </>
        )}
      </div>

      {/* The model now on the canvas — a quiet mono label, dot-marked when it
          carries unsaved edits. */}
      {currentLabel && (
        <span
          className="max-w-[16rem] truncate text-[11px]"
          style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
          title={dirty ? `${currentLabel} — unsaved changes` : currentLabel}
        >
          {currentLabel}
          {dirty ? " •" : ""}
        </span>
      )}

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
  onNew,
  onWriteSl,
  onClose,
  closable,
  onOpenFile,
  folderSupported,
  folderFiles,
  onOpenFolder,
  onOpenFromFolder,
  libraryModels,
  onLoadFromLibrary,
  onDeleteFromLibrary,
}: {
  selected: Demo | null;
  onPick: (d: Demo) => void;
  onNew: () => void;
  onWriteSl: () => void;
  onClose: () => void;
  closable: boolean;
  onOpenFile: () => void;
  folderSupported: boolean;
  folderFiles: string[] | null;
  onOpenFolder: () => void;
  onOpenFromFolder: (name: string) => void;
  libraryModels: { name: string; savedAt: number }[];
  onLoadFromLibrary: (name: string) => void;
  onDeleteFromLibrary: (name: string) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
      style={{ background: "color-mix(in srgb, var(--bg-primary) 70%, transparent)" }}
      onClick={() => closable && onClose()}
    >
      <div
        className="w-full max-w-3xl p-6"
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
        <button
          onClick={onNew}
          className="mt-3 w-full p-3 text-left text-sm transition-colors"
          style={{
            background: "transparent",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <span style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Start blank</span>
          <span className="ml-2" style={{ color: "var(--text-muted)" }}>— author a new model from scratch</span>
        </button>
        <button
          onClick={onWriteSl}
          className="mt-2 w-full p-3 text-left text-sm transition-colors"
          style={{
            background: "transparent",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-card)",
          }}
        >
          <span style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Write SL</span>
          <span className="ml-2" style={{ color: "var(--text-muted)" }}>— author a model as text in the system language</span>
        </button>

        {/* From a file: open a model JSON off disk via the OS file picker (the
            folded-in Import path, works everywhere), plus an optional folder
            picker for reopening a working folder of saved models (File System
            Access — Chrome/Edge only, disabled + labelled elsewhere). */}
        <div className="mt-4">
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            From a file
          </div>
          <button
            onClick={onOpenFile}
            className="w-full p-3 text-left text-sm transition-colors"
            style={{
              background: "transparent",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Choose a file…</span>
            <span className="ml-2" style={{ color: "var(--text-muted)" }}>— open a model .json from your computer</span>
          </button>

          <button
            onClick={onOpenFolder}
            disabled={!folderSupported}
            title={folderSupported ? undefined : "Opening a folder needs Chrome or Edge (File System Access API)"}
            className="mt-2 w-full p-3 text-left text-sm transition-colors"
            style={{
              background: "transparent",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-card)",
              opacity: folderSupported ? 1 : 0.5,
              cursor: folderSupported ? "pointer" : "not-allowed",
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>Open a folder…</span>
            <span className="ml-2" style={{ color: "var(--text-muted)" }}>
              — a working folder of saved models {folderSupported ? "" : "(Chrome only)"}
            </span>
          </button>

          {folderFiles !== null && (
            <div className="mt-3">
              <div
                className="mb-2 text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}
              >
                In this folder
              </div>
              {folderFiles.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  no models in this folder yet
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3">
                  {folderFiles.map((name) => (
                    <button
                      key={name}
                      onClick={() => onOpenFromFolder(name)}
                      className="truncate p-3 text-left text-sm transition-shadow"
                      style={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border)",
                        boxShadow: "var(--shadow-card)",
                        borderRadius: "var(--radius-card)",
                        color: "var(--text-primary)",
                      }}
                      title={name}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Saved in this browser: the IndexedDB library. Always shown (flag-free,
            works in every browser) — click a row to load, × to delete. */}
        <div className="mt-4">
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            Saved in this browser
          </div>
          {libraryModels.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              no saved models yet
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {libraryModels.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center gap-2 p-3"
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-card)",
                    borderRadius: "var(--radius-card)",
                  }}
                >
                  <button
                    onClick={() => onLoadFromLibrary(m.name)}
                    className="min-w-0 flex-1 text-left"
                    title={m.name}
                  >
                    <div className="truncate text-sm" style={{ color: "var(--text-primary)" }}>
                      {m.name}
                    </div>
                    <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      saved {relTime(m.savedAt)}
                    </div>
                  </button>
                  <button
                    onClick={() => onDeleteFromLibrary(m.name)}
                    title={`Delete ${m.name}`}
                    className="shrink-0 rounded px-1.5 text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// A small name-this modal reusing the OpenDialog overlay/card chrome. The only
// decision a save needs from the user: the name. Shared by both save targets —
// `target` only tunes the heading and the ".json" hint (a library slot has no
// extension).
function SaveDialog({
  target,
  defaultName,
  onSave,
  onClose,
}: {
  target: "folder" | "library";
  defaultName: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const commit = () => {
    const trimmed = name.trim();
    if (trimmed) onSave(trimmed);
  };
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
      style={{ background: "color-mix(in srgb, var(--bg-primary) 70%, transparent)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm p-6"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card-hover)",
          borderRadius: "var(--radius-card)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="mb-4 text-lg font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          {target === "library" ? "Save to library" : "Save to folder"}
        </h2>
        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") onClose();
            }}
            className="flex-1 rounded-md px-2 py-1 text-sm"
            style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          />
          {target === "folder" && <span style={{ color: "var(--text-muted)" }}>.json</span>}
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={commit}
            className="rounded-md px-4 py-1.5 text-xs font-semibold"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Save
          </button>
        </div>
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
            className="p-4 text-left transition-shadow"
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
