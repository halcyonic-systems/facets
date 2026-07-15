// The one place this spike touches the brain. Every systemhood verdict below
// (validate_mode, validate_connection) and every projection (project) is
// computed IN RUST, in the browser. The canvas decides nothing about legality
// — it awaits `ready()`, marshals its editing model to JSON, and forwards.
// If you find legality logic in the React tree, that's a bug.

import init, {
  project as wasmProject,
  validate_mode as wasmValidateMode,
  validate_connection as wasmValidateConnection,
} from "bert-lenses-kernel";
import wasmUrl from "bert-lenses-kernel/bert_lenses_kernel_bg.wasm?url";

import type { CanvasModel, Relation, ValidationResult } from "./types";

let readyPromise: Promise<void> | null = null;

export function ready(): Promise<void> {
  if (!readyPromise) readyPromise = init(wasmUrl).then(() => undefined);
  return readyPromise;
}

/** Project the canvas editing model into a bert-core WorldModel (JSON). */
export function project(model: CanvasModel): unknown {
  return wasmProject(JSON.stringify(model));
}

/** The lens gate: validate a projected model against a mode. */
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
