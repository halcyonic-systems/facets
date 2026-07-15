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
