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
} from "./types";

let readyPromise: Promise<void> | null = null;

/** Instantiate the wasm kernel once. Await before any call below. */
export function ready(): Promise<void> {
  if (!readyPromise) readyPromise = init(wasmUrl).then(() => undefined);
  return readyPromise;
}

/** 4-layer systemhood report — computed by bert-core in wasm. */
export function validate(modelJson: string): ValidationResult {
  return wasmValidate(modelJson) as ValidationResult;
}

/** Executable-projection gate — computed by bert-core in wasm. */
export function validateOperational(modelJson: string): OperationalOutcome {
  return wasmValidateOperational(modelJson) as OperationalOutcome;
}

/** Simulate an authored model — computed by bert-compose in wasm. */
export function run(modelJson: string, dt: number, ticks: number): RunResult {
  return wasmRun(modelJson, dt, ticks) as RunResult;
}

/** Parse CSV text — the first step of the tether, in wasm. */
export function parseCsv(text: string): CsvParse {
  return wasmParseCsv(text) as CsvParse;
}

// ---- Phase 1: the tether wizard + forced run --------------------------------

/** The mapping targets (flows / components) read from a model — for the wizard. */
export function modelTargets(modelJson: string): Targets {
  return wasmModelTargets(modelJson) as Targets;
}

/** Live wizard status (gates, translations, inferred Δt) for a mapping. */
export function mappingStatus(
  modelJson: string,
  csvText: string,
  manifest: Manifest,
): MappingStatus {
  return wasmMappingStatus(modelJson, csvText, JSON.stringify(manifest)) as MappingStatus;
}

/** Run a model forced by an imported CSV, read back in domain terms. Throws with
 *  a legible reason if the mapping is incomplete or the model is not executable. */
export function runForced(
  modelJson: string,
  csvText: string,
  manifest: Manifest,
  dt: number,
  t: number,
  today: string,
): RunResultRich {
  return wasmRunForced(modelJson, csvText, JSON.stringify(manifest), dt, t, today) as RunResultRich;
}

// ---- Phase 2: the canvas seam ------------------------------------------------

/** Load an executable WorldModel onto the canvas as an editing model — the
 *  display-faithful inverse of `project`. Structure only; the run always uses
 *  the original model + CSV + manifest, never a re-projection of the canvas. */
export function toCanvas(modelJson: string): CanvasModel {
  return wasmToCanvas(modelJson) as CanvasModel;
}

/** Project the canvas editing model into a bert-core WorldModel (JSON). */
export function project(model: CanvasModel): unknown {
  return wasmProject(JSON.stringify(model));
}

/** The lens gate: validate a projected model against its mode, in Rust. */
export function validateMode(
  model: CanvasModel,
  mode: "Core" | "Structural" | "Operational" | "Full",
): ValidationResult {
  const worldModel = project(model);
  return wasmValidateMode(JSON.stringify(worldModel), mode) as ValidationResult;
}

/** Ask the kernel whether a candidate relation is legal to add. Empty issues = legal. */
export function validateConnection(model: CanvasModel, candidate: Relation): ValidationResult {
  return wasmValidateConnection(JSON.stringify(model), JSON.stringify(candidate)) as ValidationResult;
}

// ---- Phase 3: the lens primitives ----------------------------------------------

/** The two lens primitives, canvas-keyed: boundary identity set + edge ladder,
 *  plus Mobus ports and the Bunge aggregate verdict — everything the three lens
 *  renderings read. Computed in Rust from the projected model. */
export function lensFacts(model: CanvasModel): LensFacts {
  return wasmLensFacts(JSON.stringify(model)) as LensFacts;
}
