import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ready,
  runForced,
  runMarkov,
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
  MarkovRunResult,
  ResidueEntry,
  RunResultRich,
  Thing,
  ValidationIssue,
} from "./kernel/types";
import { DEMOS, isRunnable, type Demo } from "./demos";
import type { CorpusEntry } from "./corpus";
import Canvas from "./canvas/Canvas";
import { edgeGeometry, thingById } from "./canvas/geometry";
import { EdgePopover } from "./canvas/EdgePopover";
import type { DecomposeAffordance } from "./canvas/NodeEditor";
import { KlirRegister } from "./canvas/KlirRegister";
import { BungeRegister } from "./canvas/BungeRegister";
import { BoundaryPopover } from "./canvas/BoundaryPopover";
import { PaletteRail } from "./canvas/PaletteRail";
import type { PaletteTool } from "./canvas/lenses/registry";
import { LensPalette } from "./canvas/lenses/registry";
import { SimScrubber } from "./canvas/SimScrubber";
import { MarkovReadout } from "./canvas/MarkovReadout";
import { type SimFrame } from "./canvas/types";
import type { Pt } from "./canvas/geometry";
import { InspectorDock } from "./InspectorDock";
import { MODE_BY_LENS } from "./review";
import { NewModelTypePrompt } from "./NewModelTypePrompt";
import { SlPane } from "./SlPane";
import { draftSlWithRetry, newTurnId, loadCoauthorTurns, saveCoauthorTurns, type CoauthorTurn, type DraftStage } from "./coauthor";
import type { SlError } from "./kernel/types";
import { Banner, ConfirmDialog, Pill, ToolButton } from "./ui";
import { KernelErrorBoundary } from "./KernelErrorBoundary";
import { isFolderSupported, pickDirectory, writeModel, type DirHandleLike } from "./fsAccess";
import { library } from "./library";
import { HomeScreen, type HomeRoute } from "./HomeScreen";
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
  // #10 resident co-author: the active preview's originating turn, if any —
  // lets accept/discard (fired from the shared preview banner) flip the SAME
  // turn's status in the Co-author dock's history. undefined-vs-turn distinguishes
  // a coauthor-sourced preview from a plain paste/corpus compile (which clears it).
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  // #10: the resident co-author's persistent draft history — folded into the
  // SL pane as a mode (not a dock tab; locked 2026-07-24), and lifted here so
  // it outlives the pane's own mount (localStorage-backed, no cap).
  const [coauthorTurns, setCoauthorTurns] = useState<CoauthorTurn[]>(loadCoauthorTurns);
  useEffect(() => {
    saveCoauthorTurns(coauthorTurns);
  }, [coauthorTurns]);
  const [manifest, setManifest] = useState<Manifest>({ model: "", data: "", t: 12, mapping: [] });
  const [dt, setDt] = useState(1);
  // The discard-confirm's parked resolver (in-app ConfirmDialog; see guardDiscard).
  const [discardAsk, setDiscardAsk] = useState<{ resolve: (ok: boolean) => void } | null>(null);
  const [t, setT] = useState(12);
  const [result, setResult] = useState<RunResultRich | null>(null);
  // ADR run-seam-canvas-document: which model the last run executed — the
  // shipped calibration artifact, or the projection of an edited canvas. The
  // kernel already hash-stamps the difference; this is the UI's plain word.
  const [ranEdited, setRanEdited] = useState(false);
  // #67 J9: a Klir state machine's run is a distribution trajectory, not a
  // conservation ledger — held apart so its result never reaches for a
  // conservation `residual`/`conserved` field (and the conservation pill, driven
  // by `result`, stays suppressed while a Markov run is showing).
  const [markovRun, setMarkovRun] = useState<MarkovRunResult | null>(null);
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
  // The locator can also expand to a full-viewport overlay — a large diagram to
  // read or present. Escape or the toggle returns it to the preset box.
  const [locFull, setLocFull] = useState(false);
  useEffect(() => {
    // Refit once the box has actually resized (entering or leaving fullscreen),
    // not on the click — measuring before layout settles reframes to the wrong box.
    const raf = requestAnimationFrame(() => setFitToken((n) => (n ?? 0) + 1));
    if (!locFull) return () => cancelAnimationFrame(raf);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLocFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [locFull]);
  // Shell chrome state (presentation only): the home screen (the landing screen
  // before anything is loaded, and the route back out of a model), which of its
  // three levels it opens on, and the docked palette's collapse. The workbench
  // stays mounted behind it — hidden, not unmounted, so a loaded model's canvas
  // viewport survives a trip to the library.
  const [homeOpen, setHomeOpen] = useState(true);
  const [homeRoute, setHomeRoute] = useState<HomeRoute>({ view: "home" });
  // #77: gentle, skippable first-step type/name prompt on new-model creation.
  const [typePromptOpen, setTypePromptOpen] = useState(false);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  // #57: inspector focus mode. Pops the docked inspector to full width and hides
  // the palette + canvas so the active reading (Run / Formal / Review) gets the
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
  // Folder SAVE (File System Access): the picked working folder, the current
  // model's filename stem (so re-saving is one gesture into the same file), and
  // the SaveDialog toggle. Explicit-save only — nothing here fires without a
  // menu gesture. The matching "open a folder" browse path is gone: it was
  // Chrome-only, and the home screen's two libraries plus Open a file… cover
  // its job in every browser.
  const [dirHandle, setDirHandle] = useState<DirHandleLike | null>(null);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
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
    setLibraryTree(buildLibraryTree(await library.list()));
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
      if (homeOpen || saveDialogOpen || typePromptOpen) return;
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

  const runWith = (modelJson: string, csv: string, m: Manifest, dtv: number, tv: number, edited = false) => {
    try {
      const r = runForced(modelJson, csv, m, dtv, tv, today());
      setResult(r);
      setRanEdited(edited);
      setMarkovRun(null);
      setRunError(null);
      setTick(0);
    } catch (e) {
      setResult(null);
      setRunError(e instanceof Error ? e.message : String(e));
    }
  };

  /** ADR run-seam-canvas-document — the canvas is the document. A dirty
   *  canvas runs its PROJECTION through the same gate and forcing path (the
   *  kernel's content hash marks it as a different model); a clean canvas
   *  keeps the stored artifact, which sl_demos CI proves identical to the
   *  projection for every shipped demo. Null = nothing runnable (projection
   *  refused, or no bundle). */
  const modelForRun = (): { json: string; edited: boolean } | null => {
    if (dirty && canvasModel) {
      try {
        return { json: JSON.stringify(project(canvasModel)), edited: true };
      } catch (e) {
        setToast(e instanceof Error ? e.message : String(e));
        return null;
      }
    }
    return demo ? { json: demo.modelJson!, edited: false } : null;
  };

  // #67 J9: run a Klir state machine as a discrete-time Markov chain. The Run
  // action routes here when the lens is Klir — the model IS a labeled directed
  // graph (transitions), so `run_markov` evolves a distribution over its states
  // (T reused as the step horizon). No CSV/manifest: a state machine's dynamics
  // are its transition weights, not a forcing series.
  const runKlir = (model: CanvasModel, ticks: number) => {
    try {
      const r = runMarkov(model, ticks);
      setMarkovRun(r);
      setResult(null);
      setRunError(null);
      setTick(0);
    } catch (e) {
      setMarkovRun(null);
      setRunError(e instanceof Error ? e.message : String(e));
    }
  };

  // Guarded + flushed at the seam itself (#111), so every caller — the Switch
  // menu AND the OpenDialog gallery — gets the same discard discipline.
  const pick = async (d: Demo) => {
    // Runnable only — a structural entry has no run bundle and opens via
    // pickExample instead. The guard also narrows the optional fields (#148).
    if (d.modelJson == null || d.csv == null || d.manifest == null || d.t == null) return;
    if (!(await guardDiscard()) || !(await flushWalk())) return;
    setDemo(d);
    // An SL-authored demo opens from its `.sl` — the author's document, which
    // carries what projection loses (declared params, #18). The bundle stays
    // the run's model: sl_demos.rs pins it to the projection of this same
    // text, so the two cannot disagree about the system.
    // A compile THROW (kernel trap — seen live when Vite HMR drops the wasm
    // instance) must not dead-end the open; the bundle is the projection of
    // the same text and remains a legitimate way in.
    let compiled: ReturnType<typeof compileSl> | null = null;
    if (d.sl) {
      try {
        compiled = compileSl(d.sl);
      } catch {
        compiled = null;
      }
    }
    setCanvasModel(compiled && "ok" in compiled ? compiled.ok : spaceOut(openModel(d.modelJson)));
    setManifest(d.manifest);
    setDt(d.manifest.dt ?? 1);
    setT(d.t);
    setSelectedRelationId(null);
    setSelectedThingId(null);
    setArmed(null);
    setHomeOpen(false);
    setDirty(false);
    setWalk([]);
    // Frame the opened layout in the viewport — every open seam owes this fit
    // (#83): the default pan covered small demos by luck until the 21-node
    // llm-market opened to an empty corner.
    setFitToken((n) => (n ?? 0) + 1);
    // #297: opening is not executing. The model arrives at zero — Time is the
    // author's first decision, ▶ Run the authored act. Nothing is lost by
    // dropping the old auto-run: runs are deterministic and declared amounts
    // ARE the defaults, so Run on an untouched model reproduces the shipped
    // calibration exactly.
    setResult(null);
    setMarkovRun(null);
    setRunError(null);
    setTick(0);
  };

  // Source corpus → open: an author's own model, shipped as SL text. Reuses the
  // two existing seams and invents nothing — guardDiscard (which onSlCompiled
  // deliberately omits, because compiling in the pane is the author's stated
  // intent) then the SL compile seam itself.
  //
  // A corpus entry ships no CSV and no manifest, so the CSV-forced conservation
  // run stays dark. That is the File → Import case exactly (see the comment
  // there), not a new state: structure, lens, formal object and review still
  // light up, because they read the canvas model.
  //
  // But "the run path stays dark" is NOT true of every corpus entry (#216). A
  // Klir-pinned entry runs as a DTMC straight from the canvas via `klirRunnable`
  // below, with no bundle at all, so all eight Klir corpus entries have a live
  // Run button. Do not restate the blanket claim here; it was false for a third
  // of the corpus while this comment asserted it.
  const pickCorpus = async (e: CorpusEntry) => {
    if (!(await guardDiscard()) || !(await flushWalk())) return;
    const outcome = compileSl(e.sl);
    if ("errors" in outcome) {
      // Should be unreachable: the ship gate asserts every entry compiles with
      // zero faults. Report the first fault the way importModel reports a bad
      // file rather than failing silently.
      setToast(outcome.errors[0]?.message ?? "corpus entry failed to compile");
      return;
    }
    await onSlCompiled(outcome.ok, outcome.lens_explicit);
    setHomeOpen(false);
    setDirty(false);
  };

  // Examples gallery → open (#148): one card handler for both shapes. A runnable
  // entry runs (the demo path, unchanged); a structural one compiles its SL and
  // opens as a diagram (the corpus path, without a citation). onSlCompiled sets
  // demo to null, so the loaded-demo state stays a runnable Demo or null.
  const pickExample = async (d: Demo) => {
    if (isRunnable(d)) {
      await pick(d);
      return;
    }
    if (!d.sl) return;
    if (!(await guardDiscard()) || !(await flushWalk())) return;
    const outcome = compileSl(d.sl);
    if ("errors" in outcome) {
      setToast(outcome.errors[0]?.message ?? "example failed to compile");
      return;
    }
    await onSlCompiled(outcome.ok, outcome.lens_explicit);
    setHomeOpen(false);
    setDirty(false);
  };

  // File → Import: load a user-supplied model JSON onto the canvas via the same
  // kernel seam the demo picker uses (toCanvas). No demo bundle means no CSV /
  // manifest, so the run path stays dark for imports — structure, lens, formal
  // object, and review still light up (they read the canvas model).
  async function importModel(json: string) {
    if (!(await guardDiscard()) || !(await flushWalk())) return;
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
      setHomeOpen(false);
      setDirty(false);
      setWalk([]);
      setFitToken((n) => (n ?? 0) + 1); // same fit debt as `pick`
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
  async function onSlCompiled(cm: CanvasModel, lensExplicit: boolean, asPreview = false, turnId?: string) {
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
    setHomeOpen(false);
    setWalk([]);
    setFitToken((n) => (n ?? 0) + 1); // frame the compiled layout in the current viewport (#83)
    if (asPreview) {
      // If already previewing, keep the original stash so re-compiling an edited
      // draft never buries the author's base model.
      setPreview((p) => p ?? { stash: prior, priorDirty: dirty });
      setDirty(true); // uncommitted draft — guard against silent loss
      setNotice("SL compiled — previewing (Accept to keep, Discard to revert)");
      setActiveTurnId(turnId ?? null);
    } else {
      setPreview(null); // committing clears any stale preview
      setDirty(false);
      setNotice("SL compiled ✓");
      setActiveTurnId(null);
    }
  }

  // Accept the previewed draft: it becomes the working model (still unsaved). The
  // human-checks-meaning gate — the line between "LLM proposes" and "LLM authors".
  function acceptPreview() {
    setPreview(null);
    setNotice("Accepted onto the canvas ✓");
    if (activeTurnId) {
      const id = activeTurnId;
      setCoauthorTurns((ts) => ts.map((x) => (x.id === id ? { ...x, status: "accepted" } : x)));
      setActiveTurnId(null);
    }
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
    if (activeTurnId) {
      const id = activeTurnId;
      setCoauthorTurns((ts) => ts.map((x) => (x.id === id ? { ...x, status: "discarded" } : x)));
      setActiveTurnId(null);
    }
  }

  // #10 resident co-author, folded into the SL pane as a mode: description ->
  // draft -> compile -> Rung-0 preview, recorded as a turn in the pane's
  // history. Reuses the exact draftSlWithRetry + onSlCompiled path the pane's
  // manual Compile button rides — the co-author is an assist that writes into
  // the SAME SL text, never a separate write path. A failed compile or an
  // unreachable drafter still lands as a turn and still populates the text
  // (nothing hidden — the author can hand-fix a near-miss draft).
  async function coauthorDraft(description: string, onStage?: (stage: DraftStage) => void) {
    const id = newTurnId();
    const lens = canvasModel?.lens;
    let sl = "";
    try {
      sl = await draftSlWithRetry(description, lens, onStage);
    } catch (e) {
      setCoauthorTurns((ts) => [
        { id, description, sl: "", at: new Date().toISOString(), status: "network-error", errorText: e instanceof Error ? e.message : String(e) },
        ...ts,
      ]);
      return;
    }
    setSlText(sl);
    const outcome = compileSl(sl);
    if ("errors" in outcome) {
      const errorText = outcome.errors.map((e) => `line ${e.line}: ${e.message}`).join("\n");
      setSlErrors(outcome.errors);
      setCoauthorTurns((ts) => [
        { id, description, sl, at: new Date().toISOString(), status: "compile-error", errorText },
        ...ts,
      ]);
      return;
    }
    setSlErrors([]);
    await onSlCompiled(outcome.ok, outcome.lens_explicit, true, id);
    setCoauthorTurns((ts) => [{ id, description, sl, at: new Date().toISOString(), status: "previewing" }, ...ts]);
  }

  // File → New: a blank canvas to author a model from scratch (the #14 path — no
  // demo bundle, so the run stays dark until tethered; structure/lens/formal/review
  // read the empty model). Boundary defaults are neutral, editable via the popover.
  async function newModel() {
    if (!(await guardDiscard()) || !(await flushWalk())) return;
    setDemo(null);
    setCanvasModel({ lens: "Mobus", things: [], relations: [], boundary: { porosity: 0, perceptive_fuzziness: 0 } });
    setManifest({ model: "", data: "", t: 12, mapping: [] });
    setResult(null);
    setRunError(null);
    setSelectedRelationId(null);
    setSelectedThingId(null);
    setBoundaryAnchor(null);
    setArmed(null);
    setHomeOpen(false);
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
  // download. The run path uses the same projection when the canvas is dirty
  // (ADR run-seam-canvas-document); a clean canvas runs the stored artifact.
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
        await library.save(stem, json);
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

  // Home → My library: load one of the user's saved models onto the canvas —
  // same seam as import (toCanvas + reset), and it remembers the name so a
  // re-save overwrites the same library slot. Guarded here (#111), so the
  // direct load never bypasses the gate.
  async function loadFromLibrary(name: string) {
    if (!(await guardDiscard()) || !(await flushWalk())) return;
    try {
      const cm = openModel(await library.load(name));
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
      setHomeOpen(false);
      setDirty(false);
      setWalk([]);
      setFitToken((n) => (n ?? 0) + 1); // same fit debt as `pick`
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  }

  // Drop one model from the library and refresh the listing in place.
  async function removeFromLibrary(name: string) {
    try {
      await library.remove(name);
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
      await library.rename(from, target);
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
  // review panel read, so a missing or broken referent is as loud as any other
  // validation error. Effect-shaped (not memo) — a stale check is discarded.
  // Since step 5b the kernel also resolves each issue's canvas target
  // (check_decompositions_canvas), so seam rows navigate like any other issue.
  // `error` is the HOST's failure, deliberately not an issue (#233 §4): when
  // resolution itself dies (storage error, projection throw) the kernel never
  // judged anything, so there is no verdict to show. It used to be dressed as
  // one — a hand-built `ValidationIssue` concatenated onto the kernel's list,
  // under a panel that says every line is machine-checked. The provenance brand
  // makes that a compile error now; this field is where the truth goes instead.
  const [decomposition, setDecomposition] = useState<{
    issues: ValidationIssue[];
    targets: IssueTarget[];
    error: string | null;
  }>({ issues: [], targets: [], error: null });
  useEffect(() => {
    const refs = canvasModel
      ? canvasModel.things.flatMap((t) => (t.child_model ? [t.child_model.id] : []))
      : [];
    if (!canvasModel || refs.length === 0) {
      setDecomposition({ issues: [], targets: [], error: null });
      return;
    }
    let stale = false;
    (async () => {
      const resolved = await resolveModelRefs(refs, dirHandle);
      if (stale) return;
      const report = checkDecompositionsCanvas(canvasModel, resolved);
      if (!stale) setDecomposition({ issues: report.issues, targets: report.issue_targets, error: null });
    })().catch((e) => {
      // Resolution failing outright (storage error, projection throw) must
      // still surface on the review panel, never only the console — but as the
      // host failure it is, in its own region, outside the verdict list.
      if (!stale) {
        setDecomposition({
          issues: [],
          targets: [],
          error: `decomposition references could not be checked: ${
            e instanceof Error ? e.message : String(e)
          }`,
        });
      }
    });
    return () => {
      stale = true;
    };
  }, [canvasModel, dirHandle]);

  // The kernel's lens-gate verdict plus the resolution-time decomposition
  // issues, one list — the issues Pill, the review panel, and the dock all read
  // this. Both halves carry kernel-resolved canvas targets, index-parallel.
  // Both halves are also KERNEL output, which is the only reason they may share
  // a list at all (#233 §4); the host's own failures go to `decomposition.error`.
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

  // Refresh the library listing whenever the home screen opens, so "My library"
  // reflects what is actually stored.
  useEffect(() => {
    if (!homeOpen) return;
    refreshLibrary().catch((e) => setToast(e instanceof Error ? e.message : String(e)));
  }, [homeOpen]);

  const csvHeaders = useMemo(() => {
    if (!demo) return [];
    try {
      return parseCsv(demo.csv!).headers;
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

  // #67 J9: probability mass per state at the scrubbed tick — the row of the
  // distribution trajectory `history[tick]`, keyed by state name so the canvas
  // rides it on the matching node. Pure indexing (with the tick clamped into
  // range, like the Bunge marker); no dynamics computed here. Only under Klir,
  // so a stale run can never bleed mass onto another lens's diagram.
  const massFrame = useMemo<Record<string, number> | null>(() => {
    if (!markovRun || canvasModel?.lens !== "Klir") return null;
    const rows = markovRun.history;
    if (rows.length === 0) return null;
    const row = rows[Math.max(0, Math.min(rows.length - 1, tick))];
    const mass: Record<string, number> = {};
    markovRun.states.forEach((name, i) => {
      mass[name] = row[i] ?? 0;
    });
    return mass;
  }, [markovRun, canvasModel?.lens, tick]);

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
    // #67 J9: a Markov run belongs to the Klir reading of the model; leaving
    // Klir drops it so its scrubber/readout never lingers under another lens.
    if (lens !== "Klir") setMarkovRun(null);
    setCanvasModel((m) => (m ? { ...m, lens } : m));
  }

  function applyDrive(next: Manifest) {
    setManifest(next);
    setSelectedRelationId(null);
    if (demo) {
      const m = modelForRun();
      if (m) runWith(m.json, demo.csv!, next, dt, t, m.edited);
    }
  }

  // An inputs-panel edit (walkthrough #11): update the relation and RE-RUN
  // immediately from the edited document — the projection is computed from the
  // next model synchronously, so the run can never race the state update. The
  // simulation-tool loop: change a number, see the world change.
  function applyInputEdit(next: import("./kernel/types").Relation) {
    if (!canvasModel) return;
    commitInputModel({
      ...canvasModel,
      relations: canvasModel.relations.map((r) => (r.id === next.id ? next : r)),
    });
  }

  // The shared tail of every inputs-panel commit: the edited document becomes
  // the canvas model and the world re-runs from it synchronously.
  function commitInputModel(nextModel: CanvasModel) {
    setCanvasModel(nextModel);
    setDirty(true);
    if (demo && nextModel.lens !== "Klir") {
      try {
        runWith(JSON.stringify(project(nextModel)), demo.csv!, manifest, dt, t, true);
      } catch (e) {
        setToast(e instanceof Error ? e.message : String(e));
      }
    }
  }

  // A run-deck time commit (Δt/T relocation): store the new values and, when
  // a run is already on screen, re-run over the new slice immediately — the
  // same edit-and-the-world-re-runs grammar as the inputs card. Values arrive
  // as arguments so the re-run can never race the state update.
  function applyTime(nextDt: number, nextT: number) {
    setDt(nextDt);
    setT(nextT);
    // No run on screen yet = nothing to re-run (#297: zero-start honors this).
    // Both run kinds count — the guard read only `result`, so a Klir steps
    // edit never re-ran the DTMC despite the Time card's stated grammar.
    if ((result === null && markovRun === null) || !canvasModel) return;
    if (canvasModel.lens === "Klir") {
      if (canvasModel.things.length > 0) runKlir(canvasModel, nextT);
    } else if (demo) {
      const m = modelForRun();
      if (m) runWith(m.json, demo.csv!, manifest, nextDt, nextT, m.edited);
    }
  }

  // Reset the inputs to the model's declared amounts. The baseline is not
  // stored state — it is DERIVED by recompiling the demo's `.sl` (the author's
  // document), so it can never go stale or leak across documents. Relation ids
  // are deterministic per compile, so the map lands on the same flows.
  function resetInputs() {
    if (!canvasModel || !demo?.sl) return;
    const compiled = compileSl(demo.sl);
    if ("errors" in compiled) return;
    const declared = new Map(compiled.ok.relations.map((r) => [r.id, r.amount]));
    commitInputModel({
      ...canvasModel,
      relations: canvasModel.relations.map((r) =>
        declared.has(r.id) ? { ...r, amount: declared.get(r.id) } : r,
      ),
    });
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

  // #204: the review is an action the author takes, not a tab they may never
  // open. The kernel already judges continuously — invoking a review raises the
  // report and stamps when it was read. No new computation, and no LLM.
  const [reviewRequest, setReviewRequest] = useState(0);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const invokeReview = useCallback(() => {
    setReviewRequest((n) => n + 1);
    setReviewedAt(new Date().toLocaleTimeString());
  }, []);

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
  // Async since the in-app ConfirmDialog replaced `window.confirm` (which
  // cannot be themed and blocks browser automation cold). The dialog's
  // resolver parks in state; Discard/Cancel settles the promise.
  async function guardDiscard(): Promise<boolean> {
    const proceed =
      (!dirty && !walk.some((s) => s.dirty && !s.currentName)) ||
      (await new Promise<boolean>((resolve) => setDiscardAsk({ resolve })));
    // Any load that proceeds past this gate leaves a live SL preview behind;
    // clear the stash so the banner doesn't linger over an unrelated model.
    if (proceed) setPreview(null);
    return proceed;
  }

  // #140: the ONE place a model becomes stored text. Every storage write
  // funnels here, so the archive encoding is chosen once — the seam that was
  // spread across seven separate call sites before it had a name.
  const persist = (name: string, model: CanvasModel) => library.save(name, writeArchive(model));

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
    if (!(await guardDiscard()) || !(await flushWalk())) return;
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
    openHomeAt({ view: "home" });
  }

  // Open the home screen on a chosen level — the menu (Home) or straight into
  // the library browser (File → Open…, Switch → Open full library).
  function openHomeAt(route: HomeRoute) {
    setHomeRoute(route);
    setHomeOpen(true);
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
      const taken = new Set((await library.list()).map((m) => m.name));
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
          clean: decomposition.issues.length === 0 && decomposition.error === null,
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
      setHomeOpen(false);
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
        onOpen={() => openHomeAt({ view: "library" })}
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
        onOpenFull={() => openHomeAt({ view: "library" })}
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
        style={homeOpen ? { display: "none" } : undefined}
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
              <SeamGlyph clean={decomposition.issues.length === 0 && decomposition.error === null} />
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
            style={{ borderColor: "var(--hairline)", background: "var(--lens-chrome)" }}
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
                same describe() string the contract fixtures pin. Rendered with
                real presence (#7): display serif in the lens accent, settling
                briefly on each switch — the key re-mounts the span so the
                animation re-runs exactly when the question changes. */}
            {/* placeholder — the question moved to its own display band below */}
            {/* #204: the review as an action. The pill beside it is the standing
                reading; this button is the author asking for the report. */}
            <button
              onClick={invokeReview}
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]"
              style={{
                background: "var(--accent-strong)",
                color: "var(--text-on-accent)",
                borderRadius: "var(--radius-sm)",
              }}
              title={`Review this model against the kernel at ${MODE_BY_LENS[canvasModel.lens]} mode`}
            >
              Review
            </button>
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
            {/* Δt/T moved into the run deck (walkthrough queue): the run's time
                controls live with the run — RUN tab, above Inputs. */}
            <div className="ml-auto flex flex-wrap items-center gap-3">
              {(() => {
                // #282: the run wears its lens — the registry declares the run
                // kind and this button renders from the declaration. Klir's
                // behavior function runs as a DTMC straight from the canvas
                // (#67 J9); Mobus's work processes run the CSV-forced
                // conservation engine; Bunge declares no mechanism (⊘M), so
                // Run has nothing to execute and says so.
                const runKind = LensPalette[canvasModel.lens].run;
                const dtmcRunnable =
                  runKind === "dtmc" && !!canvasModel && canvasModel.things.length > 0;
                const runnable =
                  runKind === "dtmc" ? dtmcRunnable : runKind === "conservation" && !!demo;
                const onRun = () => {
                  if (runKind === "dtmc") {
                    if (dtmcRunnable) runKlir(canvasModel, t);
                  } else if (runKind === "conservation" && demo) {
                    const m = modelForRun();
                    if (m) runWith(m.json, demo.csv!, manifest, dt, t, m.edited);
                  }
                };
                const title =
                  runKind === "dtmc"
                    ? dtmcRunnable
                      ? "Run the state machine as a Markov chain"
                      : "Add at least one state to run"
                    : runKind === "conservation"
                      ? demo
                        ? "Run the forced simulation"
                        : "Run needs a demo bundle (model + CSV + mapping)"
                      : "no mechanism stated (⊘M) — structure alone gives Run nothing to execute";
                // #297: advance by one tick — a deterministic re-run one step
                // longer, scrubber landed on the new final tick. No incremental
                // engine state: the recorded-run architecture makes T+1 exact.
                const onStep = () => {
                  if (runKind === "dtmc") {
                    if (!dtmcRunnable) return;
                    // The Markov history carries the t0 row, so the current
                    // step count is history.length - 1; one more is length.
                    const next = markovRun ? markovRun.history.length : 1;
                    setT(next);
                    runKlir(canvasModel, next);
                    setTick(next);
                  } else if (runKind === "conservation" && demo) {
                    const m = modelForRun();
                    if (!m) return;
                    const nextT = result ? (result.ticks + 1) * dt : dt;
                    setT(nextT);
                    runWith(m.json, demo.csv!, manifest, dt, nextT, m.edited);
                    setTick(result ? result.ticks : 0);
                  }
                };
                return (
                  <>
                    <button
                      onClick={onStep}
                      disabled={!runnable}
                      title="Advance the run by one tick (starts one if none has run)"
                      className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
                      style={{
                        borderColor: "var(--accent)",
                        color: "var(--accent)",
                        background: "transparent",
                        opacity: runnable ? 1 : 0.45,
                        cursor: runnable ? "pointer" : "not-allowed",
                      }}
                    >
                      ⏭ Step
                    </button>
                    <button
                      onClick={onRun}
                      disabled={!runnable}
                      title={title}
                      className="rounded-full px-5 py-2 text-sm font-semibold transition-colors"
                      style={{ background: "var(--accent)", color: "var(--text-on-accent)", opacity: runnable ? 1 : 0.45, cursor: runnable ? "pointer" : "not-allowed" }}
                    >
                      ▶ Run
                    </button>
                  </>
                );
              })()}
            </div>
            {/* The lens's stance, declared (#7, boldened on review): a
                full-width display band under the controls — the strip is
                flex-wrap, so basis-full lands the question on its own line,
                where the display serif can run large without fighting the
                buttons. */}
            {desc && (
              <div key={canvasModel.lens} className="lens-question basis-full pb-1 pt-0.5">
                {desc.question}
              </div>
            )}
          </div>
        )}

        {discardAsk && (
          <ConfirmDialog
            message="Discard unsaved changes to the current model?"
            confirmLabel="Discard"
            onResolve={(ok) => {
              discardAsk.resolve(ok);
              setDiscardAsk(null);
            }}
          />
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
              // #10: the co-author, folded into the pane as a mode (locked
              // 2026-07-24) — not a dock tab. coauthorDraft owns the whole
              // draft->compile->preview->record sequence; the pane just
              // switches back to the SL view once it resolves.
              coauthor={{ turns: coauthorTurns, onDraft: coauthorDraft }}
            />
          )}

          {/* No null-model empty state here: the workbench is display:none
              whenever the home screen is open, and every path that closes the
              home screen loads a model in the same batch. */}
          {/* min-w-0: without it the canvas refuses to shrink (flex min-width:auto)
              and the whole shell row overflows the viewport at narrow widths (#17). */}
          <main
            className={`min-h-0 min-w-0 flex-1 overflow-y-auto ${inspectorFocused && canvasModel ? "hidden" : ""}`}
            style={{ background: "var(--lens-wash)" }}
          >
            {canvasModel && (
              <KernelErrorBoundary resetKeys={[canvasModel, demo?.key ?? "import"]}>
                <div className="flex min-h-full flex-col p-4">
                  {/* Canvas owns the viewport — fills the region (no more
                      height:440 cap), and its popovers/banners still anchor to
                      this relatively-positioned container. */}
                  <div
                    className="relative min-h-0 flex-1 overflow-hidden rounded-md"
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
                        onNotice={setNotice}
                        decomposeFor={decomposeFor}
                        placeName={canvasModel.name?.trim() || currentLabel}
                        // The kernel's ladder verdict (#100 harvest) — the
                        // register renders it as a collapsed complement chip.
                        ladder={desc?.lens === "Klir" ? desc.ladder : null}
                        // #154 P3: the run + scrubber tick feed the mask readout
                        // (f: Ḡ → G off the recorded trajectory). Same result/tick
                        // the InspectorDock's RunPanel reads; absent = empty state.
                        // #154: markovRun (#67) is the mask's other source — App
                        // keeps result/markovRun mutually exclusive, KlirRegister
                        // just forwards both and MaskTable picks the one present.
                        result={result}
                        markovRun={markovRun}
                        tick={tick}
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
                        onNotice={setNotice}
                        decomposeFor={decomposeFor}
                        placeName={canvasModel.name?.trim() || currentLabel}
                        onViewGraph={() => setBungeView("graph")}
                      />
                    )}
                    <div
                      className={
                        locFull
                          ? "fixed inset-0 z-50 overflow-hidden"
                          : registerActive
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
                        locFull
                          ? { background: "var(--bg-primary)" }
                          : registerActive
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
                      onNotice={setNotice}
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
                      mass={massFrame}
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
                          {!locFull &&
                            (["s", "m", "l"] as const).map((s) => (
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
                          <button
                            onClick={() => setLocFull((f) => !f)}
                            className="rounded px-1 text-[10px] leading-4"
                            style={{
                              fontFamily: "var(--font-mono)",
                              color: "var(--text-muted)",
                              background: "transparent",
                              border: "1px solid var(--hairline)",
                            }}
                            title={locFull ? "exit fullscreen (Esc)" : "expand diagram to fullscreen"}
                          >
                            {locFull ? "×" : "⛶"}
                          </button>
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
                        paramName={(canvasModel.params ?? [])
                          .find((p) => {
                            const a = p.anchor;
                            return (
                              ("Flow" in a && a.Flow.relation === selectedRelation.id) ||
                              ("Shares" in a && a.Shares.thing === selectedRelation.a)
                            );
                          })
                          ?.name}
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
                        on the review. Counting components is empty-state UI,
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
                          borderRadius: "var(--radius-pill)",
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
                      <SimScrubber steps={result.ticks} tick={tick} onTick={setTick} />
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

                  {/* #67 J9: the Markov run's scrubber + distribution readout.
                      Structure-primary — the mass rides the diagram above; this
                      is the secondary, noted reading. It carries no conservation
                      pill (a distribution run has no residual to show). */}
                  {markovRun && <MarkovReadout run={markovRun} tick={tick} onTick={setTick} />}

                  {/* The Run / Formal / Review panels no longer stack here — they
                      live in the right-docked InspectorDock (a sibling of this
                      <main>, below), so the canvas keeps the full viewport. */}
                </div>
              </KernelErrorBoundary>
            )}
          </main>

          {/* Right-edge instrument dock: Run / Formal / Review as tabs, one
              visible at a time, full height of the work region. Only mounts once
              a model is loaded. */}
          {canvasModel && (
            <InspectorDock
              result={result}
              markovRun={markovRun}
              ranEdited={ranEdited}
              runManifest={demo ? manifest : null}
              onInputEdit={applyInputEdit}
              onResetInputs={demo?.sl ? resetInputs : undefined}
              blurb={demo?.blurb}
              time={{ dt, t, klir: canvasModel.lens === "Klir", onCommit: applyTime }}
              runError={runError}
              desc={desc}
              verdict={verdict}
              issueTargets={issueTargets}
              analysisError={analysisError}
              hostError={decomposition.error}
              canvasModel={canvasModel}
              tick={tick}
              reviewRequest={reviewRequest}
              reviewedAt={reviewedAt}
              onReview={invokeReview}
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

      {/* The home screen takes the work region while it is open (the workbench
          above is hidden, not unmounted). Remounting on every open is what makes
          `initialRoute` land — File→Open… opens straight on the library. */}
      {homeOpen && (
        <HomeScreen
          initialRoute={homeRoute}
          onCreate={newModel}
          onOpenExample={pickExample}
          onOpenCorpus={pickCorpus}
          onOpenFile={() => importInputRef.current?.click()}
          libraryTree={libraryTree}
          onLoadFromLibrary={loadFromLibrary}
          onDeleteFromLibrary={removeFromLibrary}
          onRenameInLibrary={renameInLibrary}
          onClose={canvasModel !== null ? () => setHomeOpen(false) : null}
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
        style={{ borderColor: "var(--hairline)", background: "var(--lens-chrome)" }}
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
      style={{ borderColor: "var(--hairline)", background: "var(--lens-chrome)" }}
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
          borderRadius: "var(--radius-md)",
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

