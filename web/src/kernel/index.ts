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
  run_markov as wasmRunMarkov,
  parse_csv as wasmParseCsv,
  model_targets as wasmModelTargets,
  mapping_status as wasmMappingStatus,
  run_forced as wasmRunForced,
  run_rich as wasmRunRich,
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
  splice_positions as wasmSplicePositions,
  model_identity as wasmModelIdentity,
  check_decompositions as wasmCheckDecompositions,
  decompose_component as wasmDecomposeComponent,
  check_decompositions_canvas as wasmCheckDecompositionsCanvas,
  klir_incidence_cells as wasmKlirIncidenceCells,
  bunge_coupling_cells as wasmBungeCouplingCells,
  to_canvas as wasmToCanvas,
  SandboxSession as WasmSandboxSession,
  sandbox_palette as wasmSandboxPalette,
  ladder_stamps as wasmLadderStamps,
} from "bert-lenses-kernel";
import wasmUrl from "bert-lenses-kernel/bert_lenses_kernel_bg.wasm?url";

import type {
  ValidationResult,
  OperationalOutcome,
  RunResult,
  MarkovRunResult,
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
  KlirIncidence,
  BungeCoupling,
  SandboxSnapshot,
  SandboxHistoryDelta,
  SandboxPaletteEntry,
  LadderStamp,
} from "./types";
import type { Lens } from "./types";

let readyPromise: Promise<void> | null = null;

/** Instantiate the wasm kernel once. Await before any call below.
 *
 *  The memo is deliberate and is NOT cleared after a trap, because clearing it
 *  would be theatre: wasm-pack's generated `__wbg_init` opens with
 *  `if (wasm !== undefined) return wasm;`, so a second `init()` on this module
 *  hands back the SAME instance. "Clear the promise and re-instantiate" reads
 *  like recovery and does nothing; genuine re-instantiation would need a fresh
 *  copy of the glue module (a cache-busted dynamic import), which the bundler
 *  inlines away in a production build and which the Tauri asset protocol would
 *  have to serve with a query string.
 *
 *  It is also not needed, which is the part that was never measured. This
 *  boundary holds no state between calls — every export deserializes its whole
 *  input (the ONE exception is `SandboxSession`, whose live circuit is an
 *  instrument's session state, never the document of record: on a trap the
 *  face discards it and rebuilds from its own mirror or the saved model; see
 *  API.md "The sandbox seam") — so a trap unwinds one call and the module
 *  keeps answering. The
 *  wasm-exec gate (`scripts/wasm_exec.mjs`, §E) drives 50 consecutive panics
 *  through a probe build and asserts the analysis computed after is identical
 *  to the one computed before. What a trap does cost is the JsValue heap slots
 *  and the linear-memory allocations of the call that died: a bounded leak, not
 *  a poisoned instance. If that ever stops being true the gate goes red, and
 *  the copy in `KernelErrorBoundary` has to change with it. */
export function ready(): Promise<void> {
  if (!readyPromise) readyPromise = init(wasmUrl).then(() => undefined);
  return readyPromise;
}

// Self-driving init (2026-07-29): when Vite HMR re-evaluates this module, the
// fresh glue instance has `wasm === undefined` and nothing re-runs init — the
// app awaited ready() once at boot, on the OLD module instance. Every kernel
// call then dies with "__wbindgen_malloc of undefined" and each click is
// silently dead (hit three times live). Kicking ready() at module scope makes
// a re-evaluated kernel re-instantiate itself; on the boot evaluation it is
// exactly the init the app awaits, and wasm-pack's own `if (wasm !== undefined)
// return` makes any later call a no-op. (An accept→invalidate HMR guard was
// tried first and did NOT force the reload — an accepting importer swallows
// the invalidation.) Guarded to the dev-serve context: under vitest's node
// environment the wasm ?url fetch throws (no base URL), and production never
// hot-swaps — the boot-time await covers both.
if (typeof window !== "undefined" && import.meta.hot) void ready();

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
 * The OTHER failure mode — the one API.md forbids (Error contract, mode 2).
 *
 * A Rust panic does not throw; it traps. The module executes `unreachable`, and
 * JS receives a `WebAssembly.RuntimeError` whose message is `unreachable` — no
 * fault, no location, nothing about the model. That is a kernel BUG, and the
 * face must not present it as a verdict: the distinction between "the kernel
 * refuses your model, and here is the precondition" and "the kernel broke" is
 * the whole of this tool's claim on the reader's trust.
 *
 * Since #233 the kernel installs `console_error_panic_hook` at init, so the
 * panic's message and Rust source location land on `console.error` immediately
 * before the trap. This class is how the face knows which of the two happened.
 */
export class KernelTrap extends Error {
  readonly fn: string;
  constructor(fn: string, message: string) {
    super(message);
    this.name = "KernelTrap";
    this.fn = fn;
  }
}

/** True when a boundary call trapped — a kernel bug, not a verdict. */
export function isKernelTrap(e: unknown): e is KernelTrap {
  return e instanceof KernelTrap;
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
    if (e instanceof KernelError || e instanceof KernelTrap) throw e;
    // A trap is the contract violation, not a refusal — classify it before it
    // can be rendered as one. `WebAssembly.RuntimeError` is the only thing a
    // Rust panic can arrive as; a `JsError` arrives as a plain `Error`.
    if (isTrap(e)) {
      throw new KernelTrap(
        fn,
        `the kernel aborted inside ${fn}() — a panic, which its own contract forbids. ` +
          `The panic message and its Rust source location are in the browser console.`,
      );
    }
    const message = e instanceof Error ? e.message : String(e);
    throw new KernelError(fn, message);
  }
}

/** A wasm trap (a Rust panic), as distinct from a thrown `JsError`. */
function isTrap(e: unknown): boolean {
  return typeof WebAssembly !== "undefined" && e instanceof WebAssembly.RuntimeError;
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

/** Run a Klir state machine as a discrete-time Markov chain (#67) — the
 *  distribution `vₙ₊₁ = vₙ P` evolution, computed by bert-compose in wasm.
 *  Reads edge weights off the canvas model (uniform by default), starts from a
 *  point mass on the first state, and returns the `kind:"markov"` trajectory.
 *  Bypasses the Operational gate, so a state that stays put (a self-loop) is a
 *  legal transition. */
export function runMarkov(model: CanvasModel, ticks: number): MarkovRunResult {
  return call("run_markov", () => wasmRunMarkov(JSON.stringify(model), ticks));
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

/** Run a model from its DECLARED amounts alone — no CSV, no forcing — with the
 *  same rich, domain-named readout as runForced (interactive params,
 *  2026-08-16). `comparisons` comes back empty by construction. */
export function runRich(modelJson: string, dt: number, t: number): RunResultRich {
  return call("run_rich", () => wasmRunRich(modelJson, dt, t));
}

// ---- Phase 2: the canvas seam ------------------------------------------------

/** Open a STORED model onto the canvas, whichever generation wrote it (#140,
 *  ADR 0004) — the neutral archive or a legacy WorldModel. Shape decides in
 *  Rust; the face never sniffs a format. This is the ONLY read a stored model
 *  needs: it is a superset of the WorldModel-only conversion, so there is no
 *  second reader to reach for by mistake. */
export function openModel(text: string): CanvasModel {
  return call("open_model", () => wasmOpenModel(text));
}

/** Text that is known to be a neutral archive (#140, ADR 0004).
 *
 *  The brand is the seam's enforcement: storage accepts only this type, and
 *  only `writeArchive` produces it. A projection — `JSON.stringify(project(m))`
 *  — is a plain `string` and will not type-check at a storage call, so the
 *  defect this issue fixed (persisting Mobus's lossy lens format) is now a
 *  compile error rather than a convention someone has to remember. */
export type ArchiveText = string & { readonly __archive: unique symbol };

/** The text to PERSIST for a canvas model — the neutral model plus its format
 *  marker. The only way to make an `ArchiveText`; `project` is export + run. */
export function writeArchive(model: CanvasModel): ArchiveText {
  return call("write_archive", () => wasmWriteArchive(JSON.stringify(model))) as ArchiveText;
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

/** Rewrite only the `@pos` lines of an SL source, leaving every other byte
 *  alone (#327) — how a canvas drag gets saved back into a file someone wrote.
 *
 *  `emitSl` is the wrong call for that: it reproduces the MODEL, and a model
 *  carries no comments, so saving a moved node through it trades a documented
 *  file for its four position numbers (#262). Positions are the one part of an
 *  SL text purely derived from the model, so they alone are safe to replace in
 *  place. Everything else in `source` comes back untouched. */
export function splicePositions(source: string, model: CanvasModel): string {
  return call("splice_positions", () => wasmSplicePositions(source, JSON.stringify(model)));
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

// ---- The register matrices (#233) ---------------------------------------------

/** Klir's |T|×|T| incidence matrix, read by the kernel: row/column order and
 *  every cell's occupants, mark, and authorability. The register authors
 *  relations out of its empty cells, so the symmetric-closure rule that decides
 *  which cell a neutral relation marks is a reading of Klir and lives in Rust —
 *  the face only chooses glyphs. Memoize on the canvas model. */
export function klirIncidenceCells(model: CanvasModel): KlirIncidence {
  return call("klir_incidence_cells", () => wasmKlirIncidenceCells(JSON.stringify(model)));
}

/** Bunge's coupling matrix M, read by the kernel: the slot order under either
 *  environment reading (`enBloc` = his own (m+1)×(m+1) with 0 for the
 *  environment en bloc), where the cut falls, and every cell. Cells the
 *  tradition closes come back `forbidden` with the precondition in words.
 *  Memoize on (model, enBloc). */
export function bungeCouplingCells(model: CanvasModel, enBloc: boolean): BungeCoupling {
  return call("bunge_coupling_cells", () => wasmBungeCouplingCells(JSON.stringify(model), enBloc));
}

// ---- The sandbox seam: the boundary's ONE stateful export -------------------

/** Node parameter knobs the engine accepts (`session.rs::set_node_param`). */
export type SandboxNodeField =
  | "param"
  | "release_rate"
  | "initial_storage"
  | "capacity"
  | "setpoint"
  | "time_constant"
  | "maintenance"
  | "back_pressure";

/**
 * A live circuit under authoring and continuous stepping — the face's typed
 * handle on the wasm `SandboxSession`. Everything it means is computed engine-
 * side; this class only routes every method through `call` so refusals arrive
 * as `KernelError`s with the kernel's own message.
 *
 * Lifecycle: the session is wasm-owned memory — `free()` it on teardown. It is
 * an instrument's live state, never the document of record: persist through
 * `toModelJson()` (a WorldModel, the same artifact the Model surface opens)
 * and rebuild via `Sandbox.fromModel` after a trap or a reload.
 */
export class Sandbox {
  private inner: WasmSandboxSession;

  private constructor(inner: WasmSandboxSession) {
    this.inner = inner;
  }

  /** An empty canvas. */
  static empty(): Sandbox {
    return call("SandboxSession.new", () => new Sandbox(new WasmSandboxSession()));
  }

  /** A canvas opened on a stamped Troncale process (`ladderStamps()` names). */
  static fromStamp(name: string): Sandbox {
    return call("SandboxSession.from_stamp", () => new Sandbox(WasmSandboxSession.from_stamp(name)));
  }

  /** A session over a saved model JSON. */
  static fromModel(modelJson: string): Sandbox {
    return call("SandboxSession.from_model", () => new Sandbox(WasmSandboxSession.from_model(modelJson)));
  }

  addNode(kind: string, x: number, y: number): number {
    return call("sandbox.add_node", () => this.inner.add_node(kind, x, y));
  }
  removeNode(i: number): void {
    call("sandbox.remove_node", () => this.inner.remove_node(i));
  }
  addWire(from: number, to: number, mode: "pushed" | "gradient"): number {
    return call("sandbox.add_wire", () => this.inner.add_wire(from, to, mode));
  }
  removeWire(k: number): void {
    call("sandbox.remove_wire", () => this.inner.remove_wire(k));
  }
  /** Stamp a Troncale process into the live canvas; returns the first stamped node. */
  stamp(name: string, x: number, y: number): number {
    return call("sandbox.stamp", () => this.inner.stamp(name, x, y));
  }

  setNodeParam(i: number, field: SandboxNodeField, v: number): void {
    call("sandbox.set_node_param", () => this.inner.set_node_param(i, field, v));
  }
  setNodePos(i: number, x: number, y: number): void {
    call("sandbox.set_node_pos", () => this.inner.set_node_pos(i, x, y));
  }
  setNodeName(i: number, name: string): void {
    call("sandbox.set_node_name", () => this.inner.set_node_name(i, name));
  }
  setSubstance(i: number, name: string, base: "Energy" | "Material" | "Message", unit: string): void {
    call("sandbox.set_substance", () => this.inner.set_substance(i, name, base, unit));
  }
  setWireParam(k: number, field: "conductance" | "rate", v: number): void {
    call("sandbox.set_wire_param", () => this.inner.set_wire_param(k, field, v));
  }
  /** Declare the state invariant (axis D): the conservation ledger on or off. */
  setInvariant(conserved: boolean): void {
    call("sandbox.set_invariant", () => this.inner.set_invariant(conserved));
  }

  /** Advance `n` steps of `dt` each. An algebraic cycle makes this a refused
   *  no-op — read `snapshot().algebraic_cycle` for the loop. */
  step(n: number, dt: number): void {
    call("sandbox.step", () => this.inner.step(n, dt));
  }
  reset(): void {
    call("sandbox.reset", () => this.inner.reset());
  }

  snapshot(): SandboxSnapshot {
    return call("sandbox.snapshot", () => this.inner.snapshot());
  }
  historySince(fromTick: number): SandboxHistoryDelta {
    return call("sandbox.history_since", () => this.inner.history_since(fromTick));
  }
  /** The sandbox document: a WorldModel JSON. Graduation is a save. */
  toModelJson(name: string): string {
    return call("sandbox.to_model_json", () => this.inner.to_model_json(name));
  }

  /** Release the wasm-owned memory. The handle is dead afterwards. */
  free(): void {
    this.inner.free();
  }
}

/** Reconstruct a canvas from a kernel `WorldModel` JSON — the explicit
 *  projection-side read (storage reads go through `openModel` instead). Used
 *  by the sandbox's graduation path: session → WorldModel → canvas → archive. */
export function toCanvas(modelJson: string): CanvasModel {
  return call("to_canvas", () => wasmToCanvas(modelJson));
}

/** The 12-kind primitive palette, declared by the engine. */
export function sandboxPalette(): SandboxPaletteEntry[] {
  return call("sandbox_palette", () => wasmSandboxPalette());
}

/** The stampable Troncale processes (name, blurb, composition honesty line). */
export function ladderStamps(): LadderStamp[] {
  return call("ladder_stamps", () => wasmLadderStamps());
}
