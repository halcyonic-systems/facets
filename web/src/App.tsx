import { useEffect, useMemo, useRef, useState } from "react";
import {
  ready,
  runForced,
  openModel,
  writeArchive,
  project,
  parseCsv,
  analyzeCanvas,
  checkDecompositionsCanvas,
  decomposeComponent,
  compileSl,
} from "./kernel";
import type {
  CanvasModel,
  IssueTarget,
  Manifest,
  ResidueEntry,
  RunResultRich,
  Thing,
  ValidationIssue,
} from "./kernel/types";
import { DEMOS, type Demo } from "./demos";
import { firstSentence, groupedCorpus, TRADITIONS, type CorpusEntry } from "./corpus";
import Canvas from "./canvas/Canvas";
import { edgeGeometry, thingById } from "./canvas/geometry";
import { EdgePopover } from "./canvas/EdgePopover";
import type { DecomposeAffordance } from "./canvas/NodeEditor";
import { KlirRegister } from "./canvas/KlirRegister";
import { BungeRegister } from "./canvas/BungeRegister";
import { BoundaryPopover } from "./canvas/BoundaryPopover";
import { PaletteRail } from "./canvas/PaletteRail";
import type { PaletteTool } from "./canvas/lenses/registry";
import { SimScrubber } from "./canvas/SimScrubber";
import { type SimFrame } from "./canvas/types";
import type { Pt } from "./canvas/geometry";
import { InspectorDock } from "./InspectorDock";
import { NewModelTypePrompt } from "./NewModelTypePrompt";
import { SlPane } from "./SlPane";
import { authorSl } from "./gsr";
import type { SlError } from "./kernel/types";
import { Banner, Pill, ToolButton } from "./ui";
import { KernelErrorBoundary } from "./KernelErrorBoundary";
import {
  isFolderSupported,
  pickDirectory,
  writeModel,
  listModelFiles,
  readModelFile,
  type DirHandleLike,
} from "./fsAccess";
import { saveModel, listModelRecords, loadModel, deleteModel, renameModel } from "./modelStore";
import { buildLibraryTree, flattenLibraryTree, type LibraryNode } from "./libraryTree";
import { mintLibraryName, parentSlotName } from "./libraryNames";
import { resolveModelRefs } from "./modelResolve";
import { diagramFilename, exportDiagramSvg, exportDiagramPng } from "./canvas/exportDiagram";

// A residue line, exactly as the kernel worded it. `count === 0` is the
// uncountable line (Bunge's ⊘M): one unanswered question, not a tally, so no
// number precedes it.
const residueLine = (e: ResidueEntry) => (e.count === 0 ? e.label : `${e.count} ${e.label}`);

const today = () => new Date().toISOString().slice(0, 10);
const LENSES: CanvasModel["lens"][] = ["Klir", "Bunge", "Mobus"];

// #109 walk choreography — the enter/exit transition's OUT phase length. Must
// match the walk-*-out animation durations in index.css: the model swap waits
// for this beat (and races data resolution via Promise.all), so the old canvas
// finishes pressing through the membrane before the next one arrives.
const WALK_OUT_MS = 150;

// The choreography's presentation state: which phase the canvas wrapper is
// animating (dive = enter a child, rise = exit to an ancestor) and the CSS
// transform-origin the phase zooms around. Null = no transition in flight.
interface WalkFx {
  phase: "dive-out" | "dive-in" | "rise-out" | "rise-in";
  origin: string;
}

// Instant swap under prefers-reduced-motion (#109): the JS sequencing skips
// the out-phase beat entirely (belt), and index.css disables the keyframes
// for any class that still lands (braces).
const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// One ancestor on the decomposition walk (#89 step 5b): everything needed to
// restore that model when the breadcrumb exits back to it, plus the display
// facts the breadcrumb renders (label, id on hover, seam glyph as of descent).
// The walk is presentation/navigation state — every seam verdict along it is
// still the kernel's.
interface WalkSegment {
  label: string;
  modelId: string | null;
  /** Its decomposition seams' status when we descended (saves happen only at
   *  navigation seams, so this is fresh whenever the breadcrumb is visible). */
  clean: boolean;
  canvas: CanvasModel;
  demo: Demo | null;
  manifest: Manifest;
  dt: number;
  t: number;
  currentName: string | null;
  dirty: boolean;
}

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
  // A compiled SL draft shown on the canvas but NOT yet committed — the
  // author's own model is stashed so Discard reverts. Accept commits the draft
  // (the human-checks-meaning gate; llm-sl-authoring-plan.md Rung 0). null =
  // not previewing. Works for a human pasting SL today and for an LLM drafter next.
  const [preview, setPreview] = useState<{ stash: CanvasModel | null; priorDirty: boolean } | null>(null);
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
  // Fit-to-content request counter (presentation-only): bumped after an SL
  // compile so the canvas frames the freshly laid-out model in the current
  // viewport (its auto-layout centers on a fixed point that can otherwise land
  // outside the narrower SL-pane view — #83). Canvas fits once per new value.
  const [fitToken, setFitToken] = useState<number | undefined>(undefined);
  // The Klir locator's preset size (#100 harvest — "way too small" on 2 of 3
  // blind-pick arms). Three presets, medium default; a change refits the
  // picture to the new box via fitToken. Presentation only.
  const [locSize, setLocSize] = useState<"s" | "m" | "l">("m");
  // Shell chrome state (presentation only): the File→Open gallery (also the
  // start screen before anything is loaded), the docked palette's collapse.
  const [galleryOpen, setGalleryOpen] = useState(true);
  // #77: gentle, skippable first-step type/name prompt on new-model creation.
  const [typePromptOpen, setTypePromptOpen] = useState(false);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  // #57: inspector focus mode. Pops the docked inspector to full width and hides
  // the palette + canvas so the active reading (Run / Formal / Audit) gets the
  // whole work region. Presentation-only — the canvas <main> stays mounted (just
  // display:none'd), so its pan/zoom viewport survives the round trip untouched.
  const [inspectorFocused, setInspectorFocused] = useState(false);
  // Unsaved-work tracking (presentation-only): true once the loaded model has
  // been edited on the canvas or via a popover, cleared on every load/new/save
  // seam. The nav affordances (Home, Switch model) confirm-before-discard only
  // when this is set, so an untouched or freshly-saved model navigates freely.
  const [dirty, setDirty] = useState(false);
  // The decomposition walk (#89 step 5b): the ancestors above the model on the
  // canvas, root-first. Empty = not walking. Entering a decomposed component
  // pushes the current model as a segment; the breadcrumb exits by restoring
  // one. Navigation state only — every model and verdict stays kernel-fed.
  const [walk, setWalk] = useState<WalkSegment[]>([]);
  // #109: the enter/exit transition phase on the canvas wrapper. Presentation
  // only — the walk's document-navigation mechanism above is untouched.
  const [walkFx, setWalkFx] = useState<WalkFx | null>(null);
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
  // The listing is a TREE (#105): children reached by `decomposes` references
  // group under their root SOIs, read fresh from the records on every refresh —
  // grouping is never stored, so deleting a parent simply re-reads its children
  // as roots. The flattened form feeds the Switch menu's indented rows.
  const [saveTarget, setSaveTarget] = useState<"folder" | "library">("folder");
  const [libraryTree, setLibraryTree] = useState<LibraryNode[]>([]);
  const libraryList = useMemo(() => flattenLibraryTree(libraryTree), [libraryTree]);
  async function refreshLibrary() {
    setLibraryTree(buildLibraryTree(await listModelRecords()));
  }
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

  // #109: the Escape exit route, held in a ref refreshed every render so the
  // window keydown handler (subscribed on a narrow dep list) never fires a
  // STALE exitTo — the exit autosaves, and it must save the current canvas,
  // not the closure it was subscribed with. The ref also owns the "nothing
  // capturing is open" gate: dialogs keep Escape to themselves.
  const escapeExitRef = useRef<() => void>(() => {});
  useEffect(() => {
    escapeExitRef.current = () => {
      if (galleryOpen || saveDialogOpen || typePromptOpen) return;
      if (walk.length > 0) void exitTo(walk.length - 1);
    };
  });

  // Esc = disarm the rail tool, else clear selection (closing any popover),
  // else — while walking, with no field focused and no dialog open — exit one
  // level of the walk (#109). Field editors win outright: the #116 label
  // draft, the node-name draft, and dialog inputs all cancel on their own
  // Escape handlers, so a focused input never also navigates. Delete/Backspace
  // removes the selected node or flow (same typing guard).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (armed) {
          setArmed(null);
          return;
        }
        const hadSelection = selectedThingId !== null || selectedRelationId !== null || boundaryAnchor !== null;
        setSelectedThingId(null);
        setSelectedRelationId(null);
        setBoundaryAnchor(null);
        if (hadSelection) return;
        const el = document.activeElement as HTMLElement | null;
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
        escapeExitRef.current();
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
  }, [selectedThingId, selectedRelationId, boundaryAnchor, armed]);

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

  // Guarded + flushed at the seam itself (#111), so every caller — the Switch
  // menu AND the OpenDialog gallery — gets the same discard discipline.
  const pick = async (d: Demo) => {
    if (!guardDiscard() || !(await flushWalk())) return;
    setDemo(d);
    setCanvasModel(spaceOut(openModel(d.modelJson))); // load the demo onto the canvas as a diagram
    setManifest(d.manifest);
    setDt(d.manifest.dt ?? 1);
    setT(d.t);
    setSelectedRelationId(null);
    setSelectedThingId(null);
    setArmed(null);
    setGalleryOpen(false);
    setDirty(false);
    setWalk([]);
    runWith(d.modelJson, d.csv, d.manifest, d.manifest.dt ?? 1, d.t); // one click → runs
  };

  // Source corpus → open: an author's own model, shipped as SL text. Reuses the
  // two existing seams and invents nothing — guardDiscard (which onSlCompiled
  // deliberately omits, because compiling in the pane is the author's stated
  // intent) then the SL compile seam itself.
  //
  // A corpus entry ships no CSV and no manifest, so the run path stays dark.
  // That is the File → Import case exactly (see the comment there), not a new
  // state: structure, lens, formal object and audit still light up, because
  // they read the canvas model.
  const pickCorpus = async (e: CorpusEntry) => {
    if (!guardDiscard() || !(await flushWalk())) return;
    const outcome = compileSl(e.sl);
    if ("errors" in outcome) {
      // Should be unreachable: the ship gate asserts every entry compiles with
      // zero faults. Report the first fault the way importModel reports a bad
      // file rather than failing silently.
      setToast(outcome.errors[0]?.message ?? "corpus entry failed to compile");
      return;
    }
    await onSlCompiled(outcome.ok, outcome.lens_explicit);
    setGalleryOpen(false);
    setDirty(false);
  };

  // File → Import: load a user-supplied model JSON onto the canvas via the same
  // kernel seam the demo picker uses (toCanvas). No demo bundle means no CSV /
  // manifest, so the run path stays dark for imports — structure, lens, formal
  // object, and audit still light up (they read the canvas model).
  async function importModel(json: string) {
    if (!guardDiscard() || !(await flushWalk())) return;
    try {
      // Either generation may arrive here — a neutral archive, or a legacy
      // WorldModel someone exported before #140. The kernel decides which.
      const cm = openModel(json);
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
      setWalk([]);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  // SL pane → Compile: the parsed model lands through the same reset seam as
  // import. The lens is view state — if a model is already on the canvas, the
  // author's current lens survives the compile unless the text pinned one via
  // @lens (the parser reports which).
  // No confirm here (compiling over the canvas is the author's stated intent),
  // but a walk's dirty ancestors still autosave before the reset (#111).
  // `asPreview` (SL pane → Compile): render the draft on the canvas but do NOT
  // commit it — stash the author's model so Discard reverts, Accept commits
  // (llm-sl-authoring-plan.md Rung 0, the human-checks-meaning gate). Other callers
  // (corpus open) commit directly, as before.
  async function onSlCompiled(cm: CanvasModel, lensExplicit: boolean, asPreview = false) {
    if (!(await flushWalk())) return;
    const prior = canvasModel;
    const nextModel = prior && !lensExplicit ? { ...cm, lens: prior.lens } : cm;
    setDemo(null);
    setCanvasModel(nextModel);
    setManifest({ model: "", data: "", t: 12, mapping: [] });
    setResult(null);
    setRunError(null);
    setSelectedRelationId(null);
    setSelectedThingId(null);
    setBoundaryAnchor(null);
    setArmed(null);
    setGalleryOpen(false);
    setWalk([]);
    setFitToken((n) => (n ?? 0) + 1); // frame the compiled layout in the current viewport (#83)
    if (asPreview) {
      // If already previewing, keep the original stash so re-compiling an edited
      // draft never buries the author's base model.
      setPreview((p) => p ?? { stash: prior, priorDirty: dirty });
      setDirty(true); // uncommitted draft — guard against silent loss
      setNotice("SL compiled — previewing (Accept to keep, Discard to revert)");
    } else {
      setPreview(null); // committing clears any stale preview
      setDirty(false);
      setNotice("SL compiled ✓");
    }
  }

  // Accept the previewed draft: it becomes the working model (still unsaved). The
  // human-checks-meaning gate — the line between "LLM proposes" and "LLM authors".
  function acceptPreview() {
    setPreview(null);
    setNotice("Accepted onto the canvas ✓");
  }

  // Discard the previewed draft: restore the author's own model and its dirty
  // state; nothing the draft touched survives.
  function discardPreview() {
    if (!preview) return;
    setCanvasModel(preview.stash);
    setDirty(preview.priorDirty);
    setResult(null);
    setPreview(null);
    setNotice("Draft discarded — reverted");
  }

  // File → New: a blank canvas to author a model from scratch (the #14 path — no
  // demo bundle, so the run stays dark until tethered; structure/lens/formal/audit
  // read the empty model). Boundary defaults are neutral, editable via the popover.
  async function newModel() {
    if (!guardDiscard() || !(await flushWalk())) return;
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
    setWalk([]);
    setFitToken((n) => (n ?? 0) + 1); // frame the newborn membrane (#100 phase 0)
    setTypePromptOpen(true); // #77: offer the kind/name first step (skippable)
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

  // File → Export diagram (SVG/PNG) (#78): serialize the live canvas SVG framed
  // on its content extent — a deliverable diagram straight off the stage, no
  // cropped screenshot. Reads the mounted SVG by class (single canvas on screen).
  async function exportDiagram(format: "svg" | "png") {
    if (!canvasModel) return;
    const svg = document.querySelector<SVGSVGElement>("svg.canvas-stage");
    if (!svg) {
      setToast("canvas not ready");
      return;
    }
    const filename = diagramFilename(canvasModel, currentLabel);
    try {
      const ok =
        format === "svg"
          ? exportDiagramSvg(svg, canvasModel, filename)
          : await exportDiagramPng(svg, canvasModel, filename);
      if (!ok) setToast("nothing to export — the model is empty");
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
    // Save-as-copy discipline (bert-core model_id contract): saving under a NEW
    // name is a copy, and a copy must not inherit its origin's identity — clear
    // it so a later decomposition mints a fresh one. Re-saving the same slot
    // keeps the id (that's what keeps a walked child's parent reference alive).
    // #140: storage writes the NEUTRAL model. `project` stays the Mobus
    // export and the executable projection — it is lossy on Bunge's `mere` and
    // `field` and Klir's `@directed`, so it must never be what we archive.
    const copy = { ...canvasModel } as CanvasModel & { model_id?: string };
    if (currentName && stem !== currentName) delete copy.model_id;
    // Encoded here rather than via `persist` because one text serves two
    // destinations below (library slot or working folder) and the save-as-copy
    // rule must drop identity BEFORE it is written. These are the only two
    // places in the app that turn a model into stored text.
    const json = writeArchive(copy);
    try {
      if (saveTarget === "library") {
        await saveModel(stem, json);
        await refreshLibrary();
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
    if (!guardDiscard() || !(await flushWalk())) return;
    try {
      const cm = openModel(await readModelFile(dirHandle, name));
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
      setWalk([]);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  // OpenDialog → Saved in this browser: load one model out of the IndexedDB
  // library onto the canvas — same seam as import (toCanvas + reset), and it
  // remembers the name so a re-save overwrites the same library slot. Guarded
  // here (#111), so the dialog's direct load no longer bypasses the gate.
  async function loadFromLibrary(name: string) {
    if (!guardDiscard() || !(await flushWalk())) return;
    try {
      const cm = openModel(await loadModel(name));
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
      setWalk([]);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  // Drop one model from the library and refresh the listing in place.
  async function removeFromLibrary(name: string) {
    try {
      await deleteModel(name);
      await refreshLibrary();
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  // Rename a library slot in place (#116 candidate 3): same record, same id,
  // new key — the store refuses a taken name, and the refusal surfaces as a
  // toast while the row stays in edit mode (returns false). Every in-memory
  // pointer at the old key follows the rename: `currentName` (so a re-save
  // lands in the renamed slot, not a resurrected old one) and any walk
  // segment's autosave slot (flushWalk writes by name). The parent's
  // `decomposes @id` stamp needs no touch-up — resolution is by identity.
  async function renameInLibrary(from: string, to: string): Promise<boolean> {
    const target = to.trim();
    if (!target || target === from) return true;
    try {
      await renameModel(from, target);
      if (currentName === from) setCurrentName(target);
      setWalk((w) => w.map((s) => (s.currentName === from ? { ...s, currentName: target } : s)));
      await refreshLibrary();
      return true;
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
      return false;
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

  // Decomposition seams are judged at resolution time (#89 step 5a): collect
  // the model's `decomposes` references, resolve them through the store layer
  // (IndexedDB library, then the working folder), and let the kernel check
  // every seam — including the cross-model derived_env identity. Async because
  // resolution is I/O; the issues merge into the same verdict the pill and
  // audit panel read, so a missing or broken referent is as loud as any other
  // validation error. Effect-shaped (not memo) — a stale check is discarded.
  // Since step 5b the kernel also resolves each issue's canvas target
  // (check_decompositions_canvas), so seam rows navigate like any other issue.
  const [decomposition, setDecomposition] = useState<{
    issues: ValidationIssue[];
    targets: IssueTarget[];
  }>({ issues: [], targets: [] });
  useEffect(() => {
    const refs = canvasModel
      ? canvasModel.things.flatMap((t) => (t.child_model ? [t.child_model.id] : []))
      : [];
    if (!canvasModel || refs.length === 0) {
      setDecomposition({ issues: [], targets: [] });
      return;
    }
    let stale = false;
    (async () => {
      const resolved = await resolveModelRefs(refs, dirHandle);
      if (stale) return;
      const report = checkDecompositionsCanvas(canvasModel, resolved);
      if (!stale) setDecomposition({ issues: report.issues, targets: report.issue_targets });
    })().catch((e) => {
      // Resolution failing outright (storage error, projection throw) must
      // still surface on the audit panel, never only the console.
      if (!stale) {
        setDecomposition({
          issues: [
            {
              severity: "Error",
              location: "decomposition",
              message: `decomposition references could not be checked: ${
                e instanceof Error ? e.message : String(e)
              }`,
              suggestion: null,
              doc: null,
            },
          ],
          targets: [{ thing: null, relation: null }],
        });
      }
    });
    return () => {
      stale = true;
    };
  }, [canvasModel, dirHandle]);

  // The kernel's lens-gate verdict plus the resolution-time decomposition
  // issues, one list — the issues Pill, the audit panel, and the dock all read
  // this. Both halves carry kernel-resolved canvas targets, index-parallel.
  const verdict = useMemo(() => {
    const base = analysis.ok?.validation ?? null;
    if (decomposition.issues.length === 0) return base;
    return { issues: [...(base?.issues ?? []), ...decomposition.issues] };
  }, [analysis, decomposition]);
  const issueTargets = useMemo(
    () => [...(analysis.ok?.issue_targets ?? []), ...decomposition.targets],
    [analysis, decomposition],
  );
  const facts = analysis.ok?.facts ?? null;
  const desc = analysis.ok?.description ?? null;
  const residue = analysis.ok?.residue ?? null;
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
    refreshLibrary().catch((e) => setToast(e instanceof Error ? e.message : String(e)));
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
    // The re-cut narration (#100 phase 2, F8-as-curriculum): when a Bunge
    // author moves a thing across the C/E partition, say the C→E→S dependency
    // out loud AT the moment it is enacted — the one-line lesson, no wizard,
    // no enforced sequence. The re-derivation itself is the kernel's (the
    // analyze memo below re-judges ℰ, 𝒮, and the hull off the new 𝒞).
    const prev = canvasModel?.things.find((t) => t.id === next.id);
    if (canvasModel?.lens === "Bunge" && prev && prev.role !== next.role) {
      setNotice(
        `re-cut: "${next.name || "unnamed"}" → ${next.role === "Component" ? "𝒞" : "ℰ"} — composition chosen; environment and structure re-derive (C → E → S)`,
      );
    }
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

  // The math-panel-first Klir register (#100): under Klir the set listings are
  // the primary surface and the node-and-edge picture demotes to a locator, so
  // the container composes differently — Mobus is untouched.
  const isKlir = canvasModel?.lens === "Klir";

  // The Bunge register (#100 phase 2): Bunge KEEPS the picture (the coupling
  // graph with its hull is the primary face), but his structure is also his
  // coupling matrix M — so the Bunge canvas carries a graph ⇄ matrix view
  // toggle (F1, the Klir register's toggle grammar as a sibling, not a clone).
  // While the matrix is up the picture demotes to the same locator Klir uses.
  const [bungeView, setBungeView] = useState<"graph" | "matrix">("graph");
  const isBungeMatrix = canvasModel?.lens === "Bunge" && bungeView === "matrix";
  // Either register up = text is the primary reading surface: locator on, and
  // the pixel popovers yield to the registers' inline editors.
  const registerActive = isKlir || isBungeMatrix;

  // The decomposition door's case, decided off KERNEL facts (boundary
  // membership = lens_facts.boundary_thing_ids — the same set the kernel's v1
  // refusal checks). One function, read by the NodePopover AND the Klir
  // register's inline thing editor.
  function decomposeFor(thing: Thing): DecomposeAffordance | null {
    if (thing.role !== "Component") return null;
    if (thing.child_model)
      return { kind: "entered", label: thing.child_model.name, onEnter: () => enterThingChild(thing) };
    if (!facts) return null;
    if (facts.boundary_thing_ids.includes(thing.id)) return { kind: "interface" };
    return { kind: "ready", onDecompose: () => decomposeThing(thing) };
  }

  // A human label for the model now on the canvas — the demo's title, else the
  // saved name, else a neutral "untitled". Shown in the menu bar and used to
  // mark the active row in the Switch menu.
  const currentLabel = demo?.title ?? currentName ?? (canvasModel ? "untitled" : null);

  // Confirm-before-discard gate for the nav affordances: only the unsaved-work
  // case prompts. A walk's dirty ancestors autosave on reset (flushWalk below),
  // so only a segment flushWalk cannot save — dirty with no name — still
  // counts as discardable work here.
  function guardDiscard(): boolean {
    const proceed =
      (!dirty && !walk.some((s) => s.dirty && !s.currentName)) ||
      window.confirm("Discard unsaved changes to the current model?");
    // Any load that proceeds past this gate leaves a live SL preview behind;
    // clear the stash so the banner doesn't linger over an unrelated model.
    if (proceed) setPreview(null);
    return proceed;
  }

  // #140: the ONE place a model becomes stored text. Every storage write
  // funnels here, so the archive encoding is chosen once — the seam that was
  // spread across seven separate call sites before it had a name.
  const persist = (name: string, model: CanvasModel) => saveModel(name, writeArchive(model));

  // Walk-reset autosave (#111): every path that discards the walk gets the
  // breadcrumb-exit discipline — dirty ancestor segments are saved before
  // setWalk([]) throws their snapshots away. Dirty-only, name-required, same
  // as exitTo. The current model is not saved here; guardDiscard's confirm
  // owns that decision. False = a save failed, so the caller must not reset.
  async function flushWalk(): Promise<boolean> {
    try {
      for (const seg of walk) {
        if (seg.dirty && seg.currentName) {
          await persist(seg.currentName, seg.canvas);
        }
      }
      return true;
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
      return false;
    }
  }

  // Home / Close (#73): leave the canvas and return to the start screen — a null
  // model behind the open gallery, exactly the app's initial state. The one
  // route back out of a loaded model.
  async function goHome() {
    if (!guardDiscard() || !(await flushWalk())) return;
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
    setWalk([]);
    setGalleryOpen(true);
  }

  // Switch model (#74): load another model without routing through the full
  // Open… dialog. Both quick paths reuse the existing load seams, which now
  // carry the guard + walk flush themselves (#111) — no second gate here.
  function switchToDemo(d: Demo) {
    void pick(d);
  }
  function switchToLibrary(name: string) {
    void loadFromLibrary(name);
  }

  // The door (#89 step 5b): derive the child of a component in the KERNEL
  // (G′ from flows(c), minted identity, empty interior), save it to the browser
  // library, and stamp the parent's `decomposes` reference. Stamping is
  // tooling — this layer writes the reference; the kernel derived and judged.
  // The stamped parent persists in the same breath (#111) — the moment the
  // reference is written into it is the moment it must live somewhere a walk
  // reset can't reach. Child saved first: a crash between the two leaves an
  // unreferenced child (recoverable), never a reference to a missing child.
  async function decomposeThing(thing: Thing) {
    if (!canvasModel) return;
    try {
      // Library slots are keyed by name (put overwrites), so an occupied name
      // gets a numeric suffix rather than silently clobbering another model.
      const taken = new Set((await listModelRecords()).map((m) => m.name));
      const parent = parentSlotName(currentName, canvasModel.name, demo?.key, taken);
      if (!parent) {
        setNotice("name this model first (File → Save to library…) — the decomposition reference needs a saved parent to live in");
        return;
      }
      const out = decomposeComponent(canvasModel, thing.id);
      if ("issues" in out) {
        setToast(out.issues[0]?.message ?? "cannot decompose this component");
        return;
      }
      taken.add(parent.name);
      const name = mintLibraryName(out.ok.child_name || "subsystem", taken);
      // The kernel derives the newborn as a WorldModel (`child.systems`), so it
      // was still landing in storage in the format #140 demoted. Nothing is
      // lost either way — a newborn carries no `mere`, `field`, or `@directed`
      // yet — but a write path that emits the old format is exactly how the old
      // format comes back.
      await persist(name, openModel(out.ok.child_json));
      const stamped: CanvasModel = {
        ...canvasModel,
        things: canvasModel.things.map((t) =>
          t.id === thing.id ? { ...thing, child_model: { name, id: out.ok.child_id } } : t,
        ),
      };
      await persist(parent.name, stamped);
      await refreshLibrary();
      setCanvasModel(stamped);
      setCurrentName(parent.name);
      setDirty(false);
      setSelectedThingId(null);
      setNotice(
        parent.isNew
          ? `decomposed → saved "${name}" to the library; parent saved as "${parent.name}" — double-click the component to enter`
          : `decomposed → saved "${name}" to the library — double-click the component to enter`,
      );
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  // Enter a decomposed component's child (#89 step 5b): resolve the reference
  // by id through the store layer, push the current model as a walk segment,
  // and put the child on the canvas. Mechanism = navigation across documents;
  // only the breadcrumb makes it read as a hierarchical dive. A referent that
  // resolves nowhere surfaces the kernel's defined issue in place — never a
  // crash, never a silent no-op.
  async function enterThingChild(thing: Thing) {
    const ref = thing.child_model;
    if (!ref || !canvasModel) return;
    // The dive choreography (#109): the view presses toward the clicked
    // component (dive-out, origin at the component's screen position) while
    // the child resolves CONCURRENTLY — resolution races the beat, never the
    // other way round. If resolution is slow the out-phase completes (fill:
    // forwards holds it) and the child arrives when ready, exactly the
    // existing async enter path. Reduced motion: no phases, instant swap.
    const animate = !prefersReducedMotion();
    if (animate) {
      const at = toScreen({ x: thing.x, y: thing.y });
      setWalkFx({ phase: "dive-out", origin: `${at.x}px ${at.y}px` });
    }
    try {
      const [resolved] = await Promise.all([
        resolveModelRefs([ref.id], dirHandle),
        animate ? delay(WALK_OUT_MS) : undefined,
      ]);
      const json = resolved[ref.id];
      if (json === undefined) {
        setWalkFx(null);
        const row = decomposition.issues.find((_, i) => decomposition.targets[i]?.thing === thing.id);
        setToast(row?.message ?? `child model ${ref.id} could not be resolved`);
        return;
      }
      const cm = openModel(json);
      setWalk((w) => [
        ...w,
        {
          label: currentLabel ?? "untitled",
          modelId: canvasModel.model_id ?? null,
          clean: decomposition.issues.length === 0,
          canvas: canvasModel,
          demo,
          manifest,
          dt,
          t,
          currentName,
          dirty,
        },
      ]);
      setDemo(null);
      setCanvasModel(cm);
      setManifest({ model: "", data: "", t: 12, mapping: [] });
      setResult(null);
      setRunError(null);
      setSelectedRelationId(null);
      setSelectedThingId(null);
      setBoundaryAnchor(null);
      setArmed(null);
      setCurrentName(ref.name);
      setGalleryOpen(false);
      setDirty(false);
      // Entry orientation (#109 §3): the fit fires IN the swap batch, so the
      // child's first committed frame already centers its membrane with the
      // G′ stand-ins framed — and the dive-in phase starts from opacity 0,
      // so the one pre-fit paint the fit effect allows is never visible.
      setFitToken((n) => (n ?? 0) + 1);
      setWalkFx(animate ? { phase: "dive-in", origin: "50% 50%" } : null);
    } catch (e) {
      setWalkFx(null);
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  // Exit to an ancestor (breadcrumb click). AUTOSAVES before navigating — the
  // current child and every deeper segment being popped, dirty-only, so work is
  // never lost and an untouched newborn is never rewritten. No confirm dialog;
  // explicit save is unchanged. Restoring the ancestor re-runs its seam check
  // against the just-saved children.
  async function exitTo(index: number) {
    if (!canvasModel || index >= walk.length) return;
    // The reverse choreography (#109): the child recedes (rise-out) and the
    // restored ancestor arrives pulling back to rest (rise-in). Same racing
    // discipline as enter — the autosaves run concurrently with the beat and
    // are never delayed by it. Center-origin on both phases (the entered
    // component's post-fit screen position isn't knowable pre-render).
    const animate = !prefersReducedMotion();
    if (animate) setWalkFx({ phase: "rise-out", origin: "50% 50%" });
    try {
      const saves = (async () => {
        if (dirty && currentName) {
          await persist(currentName, canvasModel);
        }
        for (const seg of walk.slice(index + 1)) {
          if (seg.dirty && seg.currentName) {
            await persist(seg.currentName, seg.canvas);
          }
        }
      })();
      await Promise.all([saves, animate ? delay(WALK_OUT_MS) : undefined]);
      const target = walk[index];
      setWalk(walk.slice(0, index));
      setDemo(target.demo);
      setCanvasModel(target.canvas);
      setManifest(target.manifest);
      setDt(target.dt);
      setT(target.t);
      setResult(null);
      setRunError(null);
      setSelectedRelationId(null);
      setSelectedThingId(null);
      setBoundaryAnchor(null);
      setArmed(null);
      setCurrentName(target.currentName);
      setDirty(target.dirty);
      await refreshLibrary();
      setFitToken((n) => (n ?? 0) + 1);
      setWalkFx(animate ? { phase: "rise-in", origin: "50% 50%" } : null);
    } catch (e) {
      setWalkFx(null);
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <MenuBar
        loaded={true}
        onNew={newModel}
        onOpen={() => setGalleryOpen(true)}
        onSave={() => exportModel(".model")}
        onExport={() => exportModel(".world")}
        onExportSvg={() => exportDiagram("svg")}
        onExportPng={() => exportDiagram("png")}
        onSaveToFolder={saveToFolder}
        onSaveToLibrary={saveToLibrary}
        canExport={canvasModel !== null}
        hasModel={canvasModel !== null}
        currentLabel={currentLabel}
        dirty={dirty}
        onHome={goHome}
        libraryModels={libraryList}
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
        {/* The walk breadcrumb (#89 step 5b): the label path down the
            decomposition (`Boiler › Furnace`), each segment carrying its
            contract-status glyph (✓ seams hold / ⚠ violations, kernel-fed).
            Ids live on hover/title only. Clicking an ancestor exits to it
            (autosaving on the way — see exitTo). Shown only while walking. */}
        {walk.length > 0 && canvasModel && (
          <nav
            className="flex flex-wrap items-center gap-1.5 border-b px-4 py-1.5 text-xs"
            style={{ borderColor: "var(--hairline)", background: "var(--bg-secondary)", fontFamily: "var(--font-mono)" }}
          >
            {walk.map((seg, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span style={{ color: "var(--text-muted)" }}>›</span>}
                <button
                  onClick={() => exitTo(i)}
                  className="flex items-center gap-1"
                  style={{ color: "var(--text-secondary)" }}
                  title={seg.modelId ? `${seg.label} @${seg.modelId}` : seg.label}
                >
                  <SeamGlyph clean={seg.clean} />
                  {seg.label}
                </button>
              </span>
            ))}
            <span style={{ color: "var(--text-muted)" }}>›</span>
            <span
              className="flex items-center gap-1 font-semibold"
              style={{ color: "var(--text-primary)" }}
              title={canvasModel.model_id ? `${currentLabel} @${canvasModel.model_id}` : currentLabel ?? undefined}
            >
              <SeamGlyph clean={decomposition.issues.length === 0} />
              {currentLabel}
            </span>
          </nav>
        )}

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
                    color: canvasModel.lens === l ? "var(--text-on-accent)" : "var(--text-secondary)",
                    transition: "var(--transition-base)",
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
            {/* Lens switching is question switching (#100): each tradition
                answers a different guiding question, so the picker docks the
                active lens's question as orientation copy. Kernel copy — the
                same describe() string the contract fixtures pin. */}
            {desc && (
              <span className="min-w-0 text-xs italic" style={{ color: "var(--text-muted)" }}>
                {desc.question}
              </span>
            )}
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
                color: slOpen ? "var(--text-on-accent)" : "var(--text-secondary)",
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
                style={{ background: "var(--accent)", color: "var(--text-on-accent)", opacity: demo ? 1 : 0.45, cursor: demo ? "pointer" : "not-allowed" }}
              >
                ▶ Run
              </button>
            </div>
          </div>
        )}

        {/* Body: docked-left palette + the canvas viewport it authors onto. In
            inspector-focus mode (#57) the palette and SL pane fold away and the
            canvas <main> is hidden (not unmounted) so the dock can fill the row. */}
        <div className="flex min-h-0 flex-1">
          {canvasModel && !inspectorFocused && (
            <PaletteDock collapsed={paletteCollapsed} onToggle={() => setPaletteCollapsed((c) => !c)}>
              <PaletteRail lens={canvasModel.lens} armed={armed} onArm={setArmed} />
            </PaletteDock>
          )}

          {/* The SL text pane — mounts independently of a loaded model, so an
              author can write a model from blank text. */}
          {slOpen && !inspectorFocused && (
            <SlPane
              text={slText}
              errors={slErrors}
              onTextChange={setSlText}
              onErrors={setSlErrors}
              onCompiled={(cm, lensExplicit) => onSlCompiled(cm, lensExplicit, true)}
              onClose={() => setSlOpen(false)}
              canvasModel={canvasModel}
              onRequestDraft={async (description) => {
                // #10 Rung 1: GSR authors the SL; the pane compiles it to a
                // Rung-0 preview. Seed the drafter with the current lens so the
                // reading matches; the kernel still owns legality on compile.
                // compile→retry (≤2): the kernel's own faults (which name the
                // fix) feed back so the drafter heals near-misses before the
                // author ever sees them — the harness carrying correctness.
                const lens = canvasModel?.lens;
                let { sl } = await authorSl({ description, lens });
                for (let i = 0; i < 2; i++) {
                  const outcome = compileSl(sl);
                  if (!("errors" in outcome)) break;
                  const errs = outcome.errors.map((e) => `line ${e.line}: ${e.message}`).join("\n");
                  ({ sl } = await authorSl({ description, lens, priorSl: sl, errors: errs }));
                }
                return sl;
              }}
            />
          )}

          <main className={`min-h-0 flex-1 overflow-y-auto ${inspectorFocused && canvasModel ? "hidden" : ""}`}>
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
                    {/* #109: the choreography wrapper — the walk-fx-* classes
                        animate ONLY this layer (opacity + transform), so the
                        banners/popovers anchored to the container never warp.
                        The "in" phases clear themselves on animation end. It
                        encloses the whole per-lens view, so under Klir the
                        register dives with its locator. */}
                    <div
                      className={`absolute inset-0${walkFx ? ` walk-fx-${walkFx.phase}` : ""}`}
                      style={walkFx ? { transformOrigin: walkFx.origin } : undefined}
                      onAnimationEnd={() =>
                        setWalkFx((fx) => (fx && (fx.phase === "dive-in" || fx.phase === "rise-in") ? null : fx))
                      }
                    >
                    {/* Klir (#100): the register IS the stage — the literal
                        T/R listings (and their matrix twin) fill the region;
                        the node-and-edge picture demotes to the small locator
                        box below. Editing happens in the register's own text;
                        the pixel popovers stay a Bunge/Mobus device. */}
                    {isKlir && (
                      <KlirRegister
                        model={canvasModel}
                        selectedThingId={selectedThingId}
                        selectedRelationId={selectedRelationId}
                        onSelectThing={(id) => {
                          setSelectedThingId(id);
                          if (id !== null) {
                            setSelectedRelationId(null);
                            setBoundaryAnchor(null);
                          }
                        }}
                        onSelectRelation={(id) => {
                          setSelectedRelationId(id);
                          if (id !== null) {
                            setSelectedThingId(null);
                            setBoundaryAnchor(null);
                          }
                        }}
                        onUpdateThing={updateThing}
                        onUpdateRelation={updateRelation}
                        onDeleteThing={deleteThing}
                        onDeleteRelation={deleteRelation}
                        onModelChange={(m) => {
                          setCanvasModel(m);
                          setDirty(true);
                        }}
                        onReject={setToast}
                        decomposeFor={decomposeFor}
                        placeName={canvasModel.name?.trim() || currentLabel}
                        // The kernel's ladder verdict (#100 harvest) — the
                        // register renders it as a collapsed complement chip.
                        ladder={desc?.lens === "Klir" ? desc.ladder : null}
                      />
                    )}
                    {/* Bunge (#100 phase 2): the coupling matrix M as the
                        register surface — same composition as the Klir
                        register (panel + locator), Bunge's own semantics
                        (kind-of-action cells, bond vs mere, the cut as the
                        row/col ordering). C→E→S→M inside (F8). */}
                    {isBungeMatrix && (
                      <BungeRegister
                        model={canvasModel}
                        facts={facts}
                        desc={desc?.lens === "Bunge" ? desc : null}
                        selectedThingId={selectedThingId}
                        selectedRelationId={selectedRelationId}
                        onSelectThing={(id) => {
                          setSelectedThingId(id);
                          if (id !== null) {
                            setSelectedRelationId(null);
                            setBoundaryAnchor(null);
                          }
                        }}
                        onSelectRelation={(id) => {
                          setSelectedRelationId(id);
                          if (id !== null) {
                            setSelectedThingId(null);
                            setBoundaryAnchor(null);
                          }
                        }}
                        onUpdateThing={updateThing}
                        onUpdateRelation={updateRelation}
                        onDeleteThing={deleteThing}
                        onDeleteRelation={deleteRelation}
                        onModelChange={(m) => {
                          setCanvasModel(m);
                          setDirty(true);
                        }}
                        onReject={setToast}
                        decomposeFor={decomposeFor}
                        placeName={canvasModel.name?.trim() || currentLabel}
                        onViewGraph={() => setBungeView("graph")}
                      />
                    )}
                    <div
                      className={
                        registerActive
                          ? `absolute bottom-9 right-3 max-h-[45vh] max-w-[70%] overflow-hidden rounded-lg ${
                              // #100 harvest: the locator was "way too small"
                              // on 2 of 3 arms — preset sizes, medium default.
                              // The caps are the harvest residue: on a short
                              // viewport the large preset climbed over the
                              // register's own text, so the preset is a
                              // request the available room still bounds.
                              locSize === "s" ? "h-44 w-72" : locSize === "m" ? "h-64 w-[26rem]" : "h-96 w-[38rem]"
                            }`
                          : "absolute inset-0"
                      }
                      style={
                        registerActive
                          ? {
                              border: "1px solid var(--hairline)",
                              background: "var(--bg-primary)",
                              boxShadow: "var(--shadow-card)",
                            }
                          : undefined
                      }
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
                      onEnterThing={(t) => {
                        if (t.child_model) enterThingChild(t);
                      }}
                      // #109 exit gesture (a): while walking, double-click on
                      // the empty stage exits one level — the mirror of
                      // double-click-to-enter. Null when not walking, so the
                      // stage double-click stays the node-draft creator.
                      onExitUp={walk.length > 0 ? () => void exitTo(walk.length - 1) : null}
                      onSelectBoundary={(at) => {
                        setBoundaryAnchor(at);
                        setSelectedThingId(null);
                        setSelectedRelationId(null);
                      }}
                      driven={drivenNames}
                      sim={simFrame}
                      onPanChange={setCanvasPan}
                      onScaleChange={setCanvasScale}
                      fitToken={fitToken}
                      // #100 phase 0: the container/place label names the
                      // SYSTEM (author SOI name, else the shell's label), so a
                      // model can never impersonate its only component.
                      placeName={canvasModel.name?.trim() || currentLabel}
                    />
                      {registerActive && (
                        <span
                          className="pointer-events-none absolute bottom-1 right-1.5 text-[9px] uppercase tracking-wide"
                          style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                        >
                          locator
                        </span>
                      )}
                      {registerActive && (
                        <div className="absolute right-1.5 top-1 flex gap-0.5">
                          {(["s", "m", "l"] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => {
                                setLocSize(s);
                                setFitToken((n) => (n ?? 0) + 1); // reframe in the new box
                              }}
                              className="rounded px-1 text-[9px] uppercase leading-4"
                              style={{
                                fontFamily: "var(--font-mono)",
                                color: locSize === s ? "var(--text-primary)" : "var(--text-muted)",
                                background: locSize === s ? "var(--lens-accent-soft)" : "transparent",
                                border: `1px solid ${locSize === s ? "var(--lens-accent)" : "var(--hairline)"}`,
                              }}
                              title={`locator size — ${s === "s" ? "small" : s === "m" ? "medium" : "large"}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    </div>
                    {boundaryAnchor && (
                      <BoundaryPopover
                        boundary={canvasModel.boundary}
                        anchor={toScreen(boundaryAnchor)}
                        onUpdateBoundary={updateBoundary}
                        onClose={() => setBoundaryAnchor(null)}
                      />
                    )}
                    {selectedRelation && popoverAnchor && !registerActive && (
                      <EdgePopover
                        relation={selectedRelation}
                        lens={canvasModel.lens}
                        sigIndex={canvasModel.relations.findIndex((r) => r.id === selectedRelation.id)}
                        headers={csvHeaders}
                        manifest={manifest}
                        anchor={toScreen(popoverAnchor)}
                        fact={facts?.edges.find((e) => e.id === selectedRelation.id)}
                        onApplyManifest={applyDrive}
                        onUpdateRelation={updateRelation}
                        onDelete={() => deleteRelation(selectedRelation.id)}
                        onClose={() => setSelectedRelationId(null)}
                      />
                    )}
                    {/* The Bunge view toggle (#100 phase 2, F1): coupling
                        graph ⇄ coupling matrix — one structure, two of
                        Bunge's own notations, the Klir register's toggle
                        grammar as a sibling. Rendered on the graph face; the
                        register carries its own copy of the same control. */}
                    {canvasModel.lens === "Bunge" && !isBungeMatrix && (
                      <div className="absolute left-3 top-3 flex items-center gap-1">
                        <ToolButton
                          active
                          onClick={() => {}}
                          title="the coupling graph — things, bonds, and the hull (the observer's cut)"
                        >
                          graph
                        </ToolButton>
                        <ToolButton
                          onClick={() => setBungeView("matrix")}
                          title="Bunge's coupling matrix M — who acts on whom, by what kind of action"
                        >
                          matrix
                        </ToolButton>
                      </div>
                    )}
                    {/* Bunge's single most lens-specific rule: systemhood is
                        EARNED. The verdict is the kernel's (validate_mode(
                        Structural) via lens_facts.aggregate) — the face only
                        announces it. Graph view only — the register carries
                        the same verdict as its headline pill. */}
                    {canvasModel.lens === "Bunge" && !isBungeMatrix && facts && (
                      <Banner
                        tone={facts.aggregate ? "error" : "soft"}
                        className="pointer-events-none absolute left-48 top-3"
                      >
                        {facts.aggregate
                          ? "⚠ aggregate (heap) — no bond among distinct components (Bunge Def 1.1)"
                          : "✓ system — ≥1 bond among distinct components (Bunge Def 1.1)"}
                      </Banner>
                    )}
                    {/* Grace note for a walked-into newborn (#89 step 5b): an
                        empty interior is the intended starting state, so nudge
                        gently — an invitation on the canvas, not an error row
                        on the audit. Counting components is empty-state UI,
                        not a systems verdict. */}
                    {walk.length > 0 && !canvasModel.things.some((t) => t.role === "Component") && (
                      <Banner tone="soft" className="pointer-events-none absolute left-3 top-3">
                        newly decomposed — the stand-ins around you are this system's
                        neighbors; place your first primitive and wire them through it
                      </Banner>
                    )}
                    {/* The residue register (#100): every lens view enumerates
                        what it is NOT showing. Kernel judgment (analyze's
                        residue) — hidden: the model has it, this lens does not
                        ask that question; unanswered: the lens asks, the model
                        has not answered. Pedagogy, not alarm. */}
                    {residue && (residue.hidden.length > 0 || residue.unspecified.length > 0) && (
                      <div
                        className="pointer-events-none absolute right-3 top-3 max-w-[46%] text-right text-[11px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {[
                          residue.hidden.length > 0
                            ? `not visible in this lens: ${residue.hidden.map(residueLine).join(", ")}`
                            : null,
                          residue.unspecified.length > 0
                            ? `unanswered: ${residue.unspecified.map(residueLine).join(", ")}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                    <div
                      className="pointer-events-none absolute bottom-3 right-3 text-[11px] font-mono"
                      style={{ color: "var(--text-muted)" }}
                    >
                      arm a tool to stamp (Esc disarms) · click a node to edit it in the Element tab · double-click to enter it · drag the handle dot to connect · click a flow to drive it
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
                    {/* Rung 0: a compiled draft is on the canvas but not committed.
                        Assess it visually, then Accept (keep) or Discard (revert). */}
                    {preview && (
                      <div
                        className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-3 px-4 py-2 text-sm"
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--accent)",
                          borderRadius: "9999px",
                          boxShadow: "var(--shadow-card)",
                          color: "var(--text-primary)",
                        }}
                      >
                        <span>Previewing a draft — assess it, then</span>
                        <button
                          onClick={acceptPreview}
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{ background: "var(--accent)", color: "var(--text-on-accent)" }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={discardPreview}
                          className="rounded-full px-3 py-1 text-xs"
                          style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
                        >
                          Discard
                        </button>
                      </div>
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
              // #94: accept a run-derived stock unit as DECLARED — write it onto
              // the matching component (run nodes carry the components' own
              // names). An authoring edit like any other: dirty, saved via the
              // normal save path. Absent canvas = nothing to write into.
              onAcceptUnit={
                canvasModel
                  ? (name, unit) => {
                      setCanvasModel((m) =>
                        m
                          ? {
                              ...m,
                              things: m.things.map((t) =>
                                t.role === "Component" && t.name.trim() === name.trim()
                                  ? { ...t, stock_unit: unit }
                                  : t,
                              ),
                            }
                          : m,
                      );
                      setDirty(true);
                    }
                  : undefined
              }
              resetKeys={[canvasModel, demo?.key ?? "import"]}
              // #122: on the canvas the element editor is DOCKED, so the first
              // click of a double-click can no longer flash a menu into the
              // gesture that enters a child. A register carries its own inline
              // editor, so it keeps the element face and the dock stands down.
              element={
                canvasModel && !registerActive
                  ? {
                      thing: selectedThing,
                      lens: canvasModel.lens,
                      decompose: selectedThing ? decomposeFor(selectedThing) : null,
                      onUpdate: updateThing,
                      onDelete: () => selectedThing && deleteThing(selectedThing.id),
                      onDeselect: () => setSelectedThingId(null),
                    }
                  : null
              }
              focused={inspectorFocused}
              onToggleFocus={() => setInspectorFocused((f) => !f)}
            />
          )}
        </div>
      </div>

      {typePromptOpen && canvasModel && (
        <NewModelTypePrompt
          onApply={(name, systemType) => {
            setCanvasModel((m) => (m ? { ...m, name, system_type: systemType } : m));
            setTypePromptOpen(false);
          }}
          onSkip={() => setTypePromptOpen(false)}
        />
      )}

      {galleryOpen && (
        <OpenDialog
          selected={demo}
          onPick={pick}
          onPickCorpus={pickCorpus}
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
          libraryTree={libraryTree}
          onLoadFromLibrary={loadFromLibrary}
          onDeleteFromLibrary={removeFromLibrary}
          onRenameInLibrary={renameInLibrary}
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

// The breadcrumb's per-segment contract-status glyph: ✓ every decomposition
// seam of that model held / ⚠ violations. The verdict itself is the kernel's
// (check_decompositions_canvas); this only colors it.
function SeamGlyph({ clean }: { clean: boolean }) {
  return (
    <span
      aria-label={clean ? "seams hold" : "seam violations"}
      style={{ color: clean ? "var(--verdict-ok)" : "var(--verdict-warning)" }}
    >
      {clean ? "✓" : "⚠"}
    </span>
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
  onExportSvg,
  onExportPng,
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
  onExportSvg?: () => void;
  onExportPng?: () => void;
  onSaveToFolder: () => void;
  onSaveToLibrary: () => void;
  canExport: boolean;
  hasModel: boolean;
  currentLabel: string | null;
  dirty: boolean;
  onHome: () => void;
  libraryModels: { name: string; savedAt: number; depth: number }[];
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
              <div className="my-1 border-t" style={{ borderColor: "var(--hairline)" }} />
              {item("Export JSON", onExport, !canExport)}
              {onExportSvg && item("Export diagram (SVG)", onExportSvg, !canExport)}
              {onExportPng && item("Export diagram (PNG)", onExportPng, !canExport)}
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
                // Depth mirrors the OpenDialog's grouping (#105): children of a
                // decomposed model indent under their root SOI instead of
                // reading as top-level peers.
                libraryModels.map((m) => {
                  const active = currentLabel === m.name;
                  return (
                    <button
                      key={m.name}
                      onClick={() => {
                        setSwitchOpen(false);
                        onSwitchLibrary(m.name);
                      }}
                      className="block w-full truncate py-1.5 pr-3 text-left text-xs"
                      style={{
                        paddingLeft: 12 + m.depth * 12,
                        color: active ? "var(--accent-strong)" : "var(--text-secondary)",
                      }}
                      title={m.name}
                    >
                      {m.depth > 0 && (
                        <span aria-hidden style={{ color: "var(--text-muted)" }}>
                          {"└ "}
                        </span>
                      )}
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

// One library row plus, recursively, the rows of the children its `decomposes`
// references reach (#105) — the root at depth 0, each level indented one step
// with a connector glyph. Every row loads on click, deletes on ×, and renames
// on ✎ (#116 candidate 3): the name becomes an input, Enter or blur commits,
// Esc cancels — the same commit grammar as the click-to-edit membrane labels.
// A refused rename (name collision) keeps the row in edit mode so the user
// can pick again; the slot's identity never changes, so a renamed child stays
// exactly where its parent's stamp reaches it. Deleting a parent never touches
// its children (the next listing reads them as roots). A reference that
// resolves to no saved record shows as a quiet "n missing" note on the parent
// — the library-level echo of the kernel's missing-referent issue on the
// canvas.
function LibraryRow({
  node,
  depth,
  onLoad,
  onDelete,
  onRename,
}: {
  node: LibraryNode;
  depth: number;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
  onRename: (from: string, to: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  // Esc cancels by design, but the input's blur (fired as it leaves) must not
  // resurrect the commit from the pre-cancel render — the ref outlives the
  // stale closure.
  const cancelled = useRef(false);
  const commit = async () => {
    if (draft === null || cancelled.current) return;
    if (await onRename(node.name, draft)) setDraft(null);
  };
  return (
    <>
      <div
        className={depth === 0 ? "flex items-center gap-2" : "mt-1 flex items-center gap-2"}
        style={{ paddingLeft: depth === 0 ? 0 : (depth - 1) * 14 }}
      >
        {depth > 0 && (
          <span aria-hidden className="shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>
            └
          </span>
        )}
        {draft !== null ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commit();
              if (e.key === "Escape") {
                cancelled.current = true;
                setDraft(null);
              }
            }}
            onBlur={() => void commit()}
            className={
              depth === 0 ? "min-w-0 flex-1 rounded px-1 text-sm" : "min-w-0 flex-1 rounded px-1 text-xs"
            }
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
            aria-label={`Rename ${node.name}`}
          />
        ) : (
          <button
            onClick={() => onLoad(node.name)}
            className="min-w-0 flex-1 text-left"
            title={node.name}
          >
            <div
              className={depth === 0 ? "truncate text-sm" : "truncate text-xs"}
              style={{ color: "var(--text-primary)" }}
            >
              {node.name}
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              saved {relTime(node.savedAt)}
              {node.missingReferents > 0 &&
                ` · ${node.missingReferents} referent${node.missingReferents === 1 ? "" : "s"} missing`}
            </div>
          </button>
        )}
        {draft === null && (
          <button
            onClick={() => {
              cancelled.current = false;
              setDraft(node.name);
            }}
            title={`Rename ${node.name} — same model, new library name`}
            className="shrink-0 rounded px-1.5 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            ✎
          </button>
        )}
        <button
          onClick={() => onDelete(node.name)}
          title={`Delete ${node.name}`}
          className="shrink-0 rounded px-1.5 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          ×
        </button>
      </div>
      {node.children.map((c) => (
        <LibraryRow
          key={c.name}
          node={c}
          depth={depth + 1}
          onLoad={onLoad}
          onDelete={onDelete}
          onRename={onRename}
        />
      ))}
    </>
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
  libraryTree,
  onLoadFromLibrary,
  onDeleteFromLibrary,
  onRenameInLibrary,
  onPickCorpus,
}: {
  selected: Demo | null;
  onPick: (d: Demo) => void;
  onPickCorpus: (e: CorpusEntry) => void;
  onNew: () => void;
  onWriteSl: () => void;
  onClose: () => void;
  closable: boolean;
  onOpenFile: () => void;
  folderSupported: boolean;
  folderFiles: string[] | null;
  onOpenFolder: () => void;
  onOpenFromFolder: (name: string) => void;
  libraryTree: LibraryNode[];
  onLoadFromLibrary: (name: string) => void;
  onDeleteFromLibrary: (name: string) => void;
  onRenameInLibrary: (from: string, to: string) => Promise<boolean>;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
      style={{ background: "color-mix(in srgb, var(--bg-primary) 70%, transparent)" }}
      onClick={() => closable && onClose()}
    >
      <div
        className="w-full max-w-3xl overflow-y-auto p-6"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card-hover)",
          borderRadius: "var(--radius-card)",
          maxHeight: "calc(100vh - 3rem)", // scroll INSIDE the dialog; never overflow the viewport (#148)
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
        <CorpusGallery onPick={onPickCorpus} />
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
            works in every browser) — click a row to load, × to delete. One card
            per root SOI (#105): subsystems reached by `decomposes` references
            nest indented inside their root's card instead of sprawling as
            top-level peers, so this section reads as "pick your system of
            interest". The grouping is a fresh reading of the reference graph on
            every open — deleting a parent leaves its children, which simply
            list as roots next time. */}
        <div className="mt-4">
          <div
            className="mb-2 text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            Saved in this browser
          </div>
          {libraryTree.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              no saved models yet
            </p>
          ) : (
            <div className="flex flex-col">
              {libraryTree.map((root) => (
                <div
                  key={root.name}
                  className="border-b py-1.5 last:border-b-0"
                  style={{ borderColor: "var(--hairline)" }}
                >
                  <LibraryRow
                    node={root}
                    depth={0}
                    onLoad={onLoadFromLibrary}
                    onDelete={onDeleteFromLibrary}
                    onRename={onRenameInLibrary}
                  />
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
            style={{ background: "var(--accent)", color: "var(--text-on-accent)" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

// Demos as compact rows (#148), labelled and separate from the corpus — these
// RUN (the tool working), the corpus is structural (what the author said). Same
// dense row as a corpus entry so nothing on the dialog is a giant card.
function DemoGallery({ selected, onPick }: { selected: Demo | null; onPick: (d: Demo) => void }) {
  return (
    <div>
      <div
        className="mb-2 text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        Demos — runnable
      </div>
      <div className="flex flex-col">
        {DEMOS.map((d) => {
          const active = selected?.key === d.key;
          return (
            <button
              key={d.key}
              onClick={() => onPick(d)}
              title={d.blurb}
              className="flex w-full items-baseline gap-2 border-b px-1 py-1.5 text-left last:border-b-0"
              style={{ borderColor: "var(--hairline)" }}
            >
              <span
                className="shrink-0 text-sm"
                style={{
                  fontFamily: "var(--font-display)",
                  color: active ? "var(--accent-strong)" : "var(--text-primary)",
                }}
              >
                {d.title}
              </span>
              <span className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
                {d.blurb.split(".")[0]}.
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// A separate, labelled section below the demo grid — never interleaved with it.
// A card that goes dark on click sitting inside a grid of one-click runs reads
// as a bug, and the two sets answer different questions: "show me the tool
// working" versus "show me what this author actually said". The citation is the
// third line, and it is what makes a corpus card a corpus card.
// One corpus entry as a COMPACT ROW (#148) — title + a muted teach snippet on
// one line, citation on hover. Dense by design: the gallery is a browser, not a
// card wall, so a growing corpus stays scannable. Shared by sets and standalone.
function CorpusCard({ e, onPick }: { e: CorpusEntry; onPick: (e: CorpusEntry) => void }) {
  return (
    <button
      onClick={() => onPick(e)}
      title={e.citation}
      className="flex w-full items-baseline gap-2 border-b px-1 py-1.5 text-left transition-colors last:border-b-0"
      style={{ borderColor: "var(--hairline)" }}
    >
      <span
        className="shrink-0 text-sm"
        style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
      >
        {e.title}
      </span>
      <span className="truncate text-xs" style={{ color: "var(--text-muted)" }}>
        {firstSentence(e.teaches)}
      </span>
    </button>
  );
}

// #148: the corpus, faceted and COMPACT. Tradition sections COLLAPSED BY DEFAULT
// (the dialog opens navigable — three fold headers, not 14 cards) → expand one
// to reveal sibling-set clusters (Klir's goal-oriented paradigms etc. read as
// ONE lesson with variants) + standalone rows. Demos stay separate; the dialog
// scrolls internally so nothing ever overflows the viewport.
function CorpusGallery({ onPick }: { onPick: (e: CorpusEntry) => void }) {
  const groups = groupedCorpus();
  // Collapsed by default — opening every tradition would swamp the dialog.
  const [expanded, setExpanded] = useState<string | null>(null);
  if (groups.length === 0) return null;
  const toggle = (t: string) => setExpanded((prev) => (prev === t ? null : t));
  return (
    <div className="mt-5">
      <div
        className="mb-2 text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-muted)" }}
      >
        Source corpus
      </div>
      <div className="flex flex-col">
        {groups.map((g) => {
          const meta = TRADITIONS.find((t) => t.key === g.tradition)!;
          const isOpen = expanded === g.tradition;
          const count = g.sets.reduce((n, s) => n + s.entries.length, 0) + g.loose.length;
          return (
            <section key={g.tradition}>
              <button
                onClick={() => toggle(g.tradition)}
                className="flex w-full items-baseline gap-2 border-b py-2 text-left"
                style={{ borderColor: "var(--hairline)" }}
              >
                <span className="w-3 text-xs" style={{ color: "var(--text-muted)" }}>
                  {isOpen ? "▾" : "▸"}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                >
                  {meta.label}
                </span>
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {meta.author}
                </span>
                <span className="ml-auto text-[11px] tabular" style={{ color: "var(--text-muted)" }}>
                  {count} model{count === 1 ? "" : "s"}
                </span>
              </button>
              {isOpen && (
                <div className="mb-2 mt-2 flex flex-col gap-2 pl-3">
                  {g.sets.map((s) => (
                    <div key={s.name} className="pl-3" style={{ borderLeft: "2px solid var(--accent)" }}>
                      <div className="flex items-baseline gap-2 py-1">
                        <span
                          className="text-xs font-semibold"
                          style={{ fontFamily: "var(--font-display)", color: "var(--text-secondary)" }}
                        >
                          {s.name}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {s.entries.length} variants · one lesson by diff
                        </span>
                      </div>
                      <div className="flex flex-col">
                        {s.entries.map((e) => (
                          <CorpusCard key={e.file} e={e} onPick={onPick} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {g.loose.length > 0 && (
                    <div className="flex flex-col">
                      {g.loose.map((e) => (
                        <CorpusCard key={e.file} e={e} onPick={onPick} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
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
