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
  project as wasmProject,
  validate_mode as wasmValidateMode,
  validate_connection as wasmValidateConnection,
  lens_facts as wasmLensFacts,
  describe as wasmDescribe,
  analyze_canvas as wasmAnalyzeCanvas,
  compile_sl as wasmCompileSl,
  emit_sl as wasmEmitSl,
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

/** Project the canvas editing model into a bert-core WorldModel (JSON). */
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
