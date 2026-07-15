// The one place this spike touches the brain.
//
// THE LOAD-BEARING INVARIANT: the kernel is compiled Rust (bert-core +
// bert-compose) running as wasm in the page. Every systemhood verdict, every
// projection, every connection legality check below is computed IN RUST. This
// module only marshals JSON in and forwards the wasm result out — if you find
// yourself computing a verdict in TypeScript, that is a bug, not a shortcut.

import init, {
  project as wasmProject,
  validate_mode as wasmValidateMode,
  validate_connection as wasmValidateConnection,
} from "bert-lenses-kernel";
import wasmUrl from "bert-lenses-kernel/bert_lenses_kernel_bg.wasm?url";

import type { CanvasModel, Relation, ValidationResult } from "./types";

let readyPromise: Promise<void> | null = null;

/** Instantiate the wasm kernel once. Await before any call below. */
export function ready(): Promise<void> {
  if (!readyPromise) readyPromise = init(wasmUrl).then(() => undefined);
  return readyPromise;
}

/** Project the canvas editing model into a bert-core WorldModel (mode-stamped by lens). */
export function project(model: CanvasModel): unknown {
  return wasmProject(JSON.stringify(model));
}

/** The kernel-side lens gate: Core | Structural | Operational | Full. */
export function validateMode(
  model: CanvasModel,
  mode: "Core" | "Structural" | "Operational" | "Full",
): ValidationResult {
  const worldModel = wasmProject(JSON.stringify(model));
  return wasmValidateMode(JSON.stringify(worldModel), mode) as ValidationResult;
}

/** Validate a proposed Relation at the model's current lens. Empty issues = legal. */
export function validateConnection(model: CanvasModel, candidate: Relation): ValidationResult {
  return wasmValidateConnection(JSON.stringify(model), JSON.stringify(candidate)) as ValidationResult;
}
