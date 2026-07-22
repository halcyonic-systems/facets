// The one place the face touches the brain.
//
// THE LOAD-BEARING INVARIANT: this module loads the Rust kernel compiled to
// wasm and forwards calls to it. Every systemhood verdict, projection, and
// simulation below is computed IN RUST, in the browser. The face decides
// nothing about systems — it awaits `ready()` and calls these thin forwarders.
// If you find systems logic implemented in TypeScript, it is a bug.

import init, {
  validate as wasmValidate,
  validate_operational as wasmValidateOperational,
  run as wasmRun,
  parse_csv as wasmParseCsv,
  model_targets as wasmModelTargets,
  mapping_status as wasmMappingStatus,
  run_forced as wasmRunForced,
  to_canvas as wasmToCanvas,
  open_model as wasmOpenModel,
  write_archive as wasmWriteArchive,
  project as wasmProject,
  validate_mode as wasmValidateMode,
  validate_connection as wasmValidateConnection,
  lens_facts as wasmLensFacts,
  describe as wasmDescribe,
  analyze_canvas as wasmAnalyzeCanvas,
  compile_sl as wasmCompileSl,
  emit_sl as wasmEmitSl,
  model_identity as wasmModelIdentity,
  check_decompositions as wasmCheckDecompositions,
  decompose_component as wasmDecomposeComponent,
  check_decompositions_canvas as wasmCheckDecompositionsCanvas,
} from "bert-lenses-kernel";
import wasmUrl from "bert-lenses-kernel/bert_lenses_kernel_bg.wasm?url";

import type {
  ValidationResult,
  OperationalOutcome,
  RunResult,
  CsvParse,
  Targets,
  Manifest,
  MappingStatus,
  RunResultRich,
  CanvasModel,
  Relation,
  LensFacts,
  LensDescription,
  CanvasAnalysis,
  SlOutcome,
  DecomposeOutcome,
  DecompositionReport,
} from "./types";
import type { Lens } from "./types";

let readyPromise: Promise<void> | null = null;

/** Instantiate the wasm kernel once. Await before any call below. */
export function ready(): Promise<void> {
  if (!readyPromise) readyPromise = init(wasmUrl).then(() => undefined);
  return readyPromise;
}

/**
 * A typed failure from the kernel boundary. The Rust API (crates/bert-lenses-
 * kernel/API.md, "Error contract") guarantees every boundary function either
 * returns its documented shape or throws a `JsError` — never panics. This class
 * is how the face SEES that throw: `call` below catches the raw wasm exception
 * and rethrows it as a `KernelError` carrying the kernel's own message plus the
 * function name, so React state never receives `undefined` and the error
 * boundary can render the reason. `fn` is the boundary function that rejected.
 */
export class KernelError extends Error {
  readonly fn: string;
  constructor(fn: string, message: string) {
    super(message);
    this.name = "KernelError";
    this.fn = fn;
  }
}

/** True for any error the kernel boundary surfaced (vs. an unrelated JS error). */
export function isKernelError(e: unknown): e is KernelError {
  return e instanceof KernelError;
}

/**
 * The one call primitive: invoke a wasm boundary function and normalize any
 * throw into a `KernelError`. Every forwarder below routes through this so a
 * rejected boundary call surfaces as a typed error with the kernel's message,
 * not a raw wasm exception leaking `undefined` into the caller.
 */
function call<T>(fn: string, invoke: () => unknown): T {
  try {
    return invoke() as T;
  } catch (e) {
    if (e instanceof KernelError) throw e;
    const message = e instanceof Error ? e.message : String(e);
    throw new KernelError(fn, message);
  }
}

/** 4-layer systemhood report — computed by bert-core in wasm. */
export function validate(modelJson: string): ValidationResult {
  return call("validate", () => wasmValidate(modelJson));
}

/** Executable-projection gate — computed by bert-core in wasm. */
export function validateOperational(modelJson: string): OperationalOutcome {
  return call("validate_operational", () => wasmValidateOperational(modelJson));
}

/** Simulate an authored model — computed by bert-compose in wasm. */
export function run(modelJson: string, dt: number, ticks: number): RunResult {
  return call("run", () => wasmRun(modelJson, dt, ticks));
}

/** Parse CSV text — the first step of the tether, in wasm. */
export function parseCsv(text: string): CsvParse {
  return call("parse_csv", () => wasmParseCsv(text));
}

// ---- Phase 1: the tether wizard + forced run --------------------------------

/** The mapping targets (flows / components) read from a model — for the wizard. */
export function modelTargets(modelJson: string): Targets {
  return call("model_targets", () => wasmModelTargets(modelJson));
}

/** Live wizard status (gates, translations, inferred Δt) for a mapping. */
export function mappingStatus(
  modelJson: string,
  csvText: string,
  manifest: Manifest,
): MappingStatus {
  return call("mapping_status", () =>
    wasmMappingStatus(modelJson, csvText, JSON.stringify(manifest)),
  );
}

/** Run a model forced by an imported CSV, read back in domain terms. Throws a
 *  KernelError with a legible reason if the mapping is incomplete or the model
 *  is not executable. */
export function runForced(
  modelJson: string,
  csvText: string,
  manifest: Manifest,
  dt: number,
  t: number,
  today: string,
): RunResultRich {
  return call("run_forced", () =>
    wasmRunForced(modelJson, csvText, JSON.stringify(manifest), dt, t, today),
  );
}

// ---- Phase 2: the canvas seam ------------------------------------------------

/** Load an executable WorldModel onto the canvas as an editing model — the
 *  display-faithful inverse of `project`. Structure only; the run always uses
 *  the original model + CSV + manifest, never a re-projection of the canvas. */
export function toCanvas(modelJson: string): CanvasModel {
  return call("to_canvas", () => wasmToCanvas(modelJson));
}

/** Open a STORED model onto the canvas, whichever generation wrote it (#140,
 *  ADR 0004) — the neutral archive or a legacy WorldModel. Shape decides in
 *  Rust; the face never sniffs a format. Use this for storage; `toCanvas` stays
 *  the explicit conversion for a model known to be a projection (a bundled
 *  demo, an imported executable model). */
export function openModel(text: string): CanvasModel {
  return call("open_model", () => wasmOpenModel(text));
}

/** The text to PERSIST for a canvas model — the neutral model plus its format
 *  marker. Every storage write goes through here; `project` is export + run. */
export function writeArchive(model: CanvasModel): string {
  return call("write_archive", () => wasmWriteArchive(JSON.stringify(model)));
}

/** Project the canvas editing model into a bert-core WorldModel (JSON) — the
 *  Mobus export and the executable projection `run` consumes. NOT the archive
 *  (#140): it is lossy on Bunge's `mere`/`field` and Klir's `@directed`. */
export function project(model: CanvasModel): unknown {
  return call("project", () => wasmProject(JSON.stringify(model)));
}

/** The lens gate: validate a projected model against its mode, in Rust. */
export function validateMode(
  model: CanvasModel,
  mode: "Core" | "Structural" | "Operational" | "Full",
): ValidationResult {
  const worldModel = project(model);
  return call("validate_mode", () => wasmValidateMode(JSON.stringify(worldModel), mode));
}

/** Ask the kernel whether a candidate relation is legal to add. Empty issues = legal. */
export function validateConnection(model: CanvasModel, candidate: Relation): ValidationResult {
  return call("validate_connection", () =>
    wasmValidateConnection(JSON.stringify(model), JSON.stringify(candidate)),
  );
}

// ---- Phase 3: the lens primitives ----------------------------------------------

/** The two lens primitives, canvas-keyed: boundary identity set + edge ladder,
 *  plus Mobus ports and the Bunge aggregate verdict — everything the three lens
 *  renderings read. Computed in Rust from the projected model. */
export function lensFacts(model: CanvasModel): LensFacts {
  return call("lens_facts", () => wasmLensFacts(JSON.stringify(model)));
}

/** The formal face: the model typeset as the lens's own formal object (Klir
 *  (T,R) / Bunge ⟨C,E,S,M⟩ + verdict / Mobus 8-tuple), computed by the kernel.
 *  The FormalPanel renders this — the math is never assembled in JS. */
export function describeLens(model: CanvasModel, lens: Lens): LensDescription {
  return call("describe", () => wasmDescribe(JSON.stringify(model), lens));
}

/** The atomic author-view verdict: the lens gate, lens facts, and formal object
 *  from ONE kernel call (one deserialization, one projection). Uses the canvas
 *  model's own lens. Supersedes the validateMode → lensFacts → describeLens
 *  waterfall — memoize on the canvas model. */
export function analyzeCanvas(model: CanvasModel): CanvasAnalysis {
  return call("analyze_canvas", () => wasmAnalyzeCanvas(JSON.stringify(model)));
}

// ---- SL: the textual authoring surface ----------------------------------------

/** Compile SL text into a canvas editing model, or the parse-fault list —
 *  `{ ok }` | `{ errors }`. Deterministic (the parser is a compiler, never an
 *  LLM) and judgment-free: the returned model goes through the same
 *  `analyzeCanvas` path as any canvas edit, so every verdict stays kernel-side. */
export function compileSl(text: string): SlOutcome {
  return call("compile_sl", () => wasmCompileSl(text));
}

/** Serialize the canvas model to canonical SL text (the model→text direction).
 *  Throws a KernelError for the few shapes SL v1 cannot express (names with
 *  quotes/newlines, genus without kingdom). Round-trip is golden-tested
 *  kernel-side. */
export function emitSl(model: CanvasModel): string {
  return call("emit_sl", () => wasmEmitSl(JSON.stringify(model)));
}

// ---- Decomposition: store-layer resolution (#89 step 5a) -----------------------

/** A model's stable self-identity (canonical base58) read off its JSON — null
 *  when the model never minted one. Reading never mints. The store layer's
 *  decoder: it stamps records and matches `decomposes @id` references with
 *  this, never by reading model JSON itself. */
export function modelIdentity(modelJson: string): string | null {
  return call<string | undefined>("model_identity", () => wasmModelIdentity(modelJson)) ?? null;
}

/** Judge every decomposition seam in a model against its store-resolved
 *  referents (base58 id → child model JSON). Missing and unparseable referents
 *  come back as defined issues in the result — computed in Rust; the store
 *  only resolves ids to text. */
export function checkDecompositions(
  modelJson: string,
  resolved: Record<string, string>,
): ValidationResult {
  return call("check_decompositions", () =>
    wasmCheckDecompositions(modelJson, JSON.stringify(resolved)),
  );
}

/** The decomposition door (#89 step 5b): derive the newborn child of the canvas
 *  component `thingId` — G′, minted identity, empty interior — or the kernel's
 *  refusal issues. The caller saves the child text and stamps the reference;
 *  derivation and judgment happen in Rust. */
export function decomposeComponent(model: CanvasModel, thingId: number): DecomposeOutcome {
  return call("decompose_component", () =>
    wasmDecomposeComponent(JSON.stringify(model), thingId),
  );
}

/** Judge every decomposition seam in the CANVAS model against store-resolved
 *  referents, with each issue's canvas navigation target resolved kernel-side —
 *  seam violations navigate on the audit panel like any other issue. */
export function checkDecompositionsCanvas(
  model: CanvasModel,
  resolved: Record<string, string>,
): DecompositionReport {
  return call("check_decompositions_canvas", () =>
    wasmCheckDecompositionsCanvas(JSON.stringify(model), JSON.stringify(resolved)),
  );
}
