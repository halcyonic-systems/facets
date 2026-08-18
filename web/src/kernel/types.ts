// Hand-written TS mirrors of the frozen kernel boundary (crates/bert-lenses-kernel/API.md).
// The wasm functions return `any`; these types are the contract the face reads
// against. THE INVARIANT: these describe shapes the Rust kernel computes — the
// face never derives a verdict, it only renders these.

export type Severity = "Error" | "Warning";

// The verdict channel's provenance brand (#233 §4).
//
// The non-negotiable: no generated prose ever sits in the same list as a
// machine-checked refusal. Until now that was comment-only — `ValidationIssue`
// was a plain record, so `{ issues: [...verdict.issues, llmSuggestion] }` was
// one line and compiled clean. This symbol is NOT exported, so no module
// outside this one can write the key: the only ways to hold a
// `ValidationIssue` are to receive one from the wasm boundary (`kernel/index`'s
// `call`, which casts the kernel's own reply) or from `testVerdict`, which
// `verdictChannel.test.ts` keeps out of production source.
//
// Phantom by construction: `declare` emits nothing, so the brand costs no
// bytes, crosses no wasm boundary, and leaves `API.md` and the contract
// fixtures untouched. It exists only for the compiler.
declare const KERNEL_VERDICT: unique symbol;

/** A verdict's fields, brand aside — the shape the kernel puts on the wire.
 *  Holding one of these is NOT holding a verdict; only the branded
 *  `ValidationIssue` may enter a `ValidationResult`. */
export interface VerdictFields {
  severity: Severity;
  /** The defect KIND this issue is one instance of, named by the kernel
   *  (`bert_core::validate::ValidationIssue::code`, #319). Two issues share a
   *  code iff the kernel says they are the same defect, which is what makes
   *  grouping repeats safe: the face groups on this and never on message text. */
  code: string;
  location: string;
  message: string;
  suggestion: string | null;
  /** Stable doc anchor for the precondition this issue cites (#129): a
   *  repo-relative docs path + heading anchor, chosen by the kernel
   *  (`bert_core::validate::doc`). The face only turns it into a link. */
  doc: string | null;
}

/** One kernel verdict. Unforgeable outside this directory — see
 *  `KERNEL_VERDICT` above for why, and what it is defending. */
export interface ValidationIssue extends VerdictFields {
  readonly [KERNEL_VERDICT]: true;
}

export interface ValidationResult {
  issues: ValidationIssue[];
}

/** validate_operational: either the executable spec, or the reasons it refused. */
export type OperationalOutcome =
  | { ok: unknown } // OperationalSpec (opaque to the face in Phase 0)
  | { errors: OperationalError[] };

export interface OperationalError {
  [key: string]: unknown;
}

/** Phase-0 authored-run result (no forcing). */
export interface RunResult {
  dt: number;
  history: number[][];
  ledger_history: [number, number, number, number][];
  final_balance: number;
}

/// A discrete-time Markov run (#67): the state labels and the distribution
/// trajectory. `kind` discriminates it from a conservation `RunResult` — a
/// Markov run has no `residual`/`conserved`, because it conserves probability,
/// not substance. `history[t]` is the state distribution after `t` steps, one
/// entry per `states` label; every row sums to 1.
export interface MarkovRunResult {
  kind: "markov";
  states: string[];
  history: number[][];
}

export interface CsvParse {
  headers: string[];
  rows: string[][];
}

// ---- Phase 1: the tether wizard + forced run --------------------------------

export interface FlowTarget {
  id: number;
  name: string;
  unit: string;
}
export interface ComponentTarget {
  id: number;
  name: string;
}
export interface Targets {
  flows: FlowTarget[];
  components: ComponentTarget[];
}

/** The CSV column roles the wizard assigns. */
export type Role = "time" | "flow" | "stock" | "param" | "ignore";

/** One column's mapping — the manifest's ColumnMapping shape. */
export interface ColumnMapping {
  column: string;
  as: Role;
  element?: string;
  unit?: string;
  force?: boolean;
  every?: number;
}

/** The manifest-shaped object the wizard holds and hands to the kernel. */
export interface Manifest {
  model: string;
  data: string;
  t: number;
  dt?: number;
  mapping: ColumnMapping[];
}

export interface MappingStatus {
  t1_ok: boolean;
  t2_ok: boolean;
  t2_msg: string | null;
  t4_ok: boolean;
  t4_msg: string | null;
  can_finish: boolean;
  translations: string[];
  inferred_dt: number | null;
  apply_error: string | null;
}

export interface Comparison {
  element: string;
  kind: "stock" | "flow";
  unit: string;
  simulated: number[];
  actual: number[];
  declared: number[] | null;
  divergence_pct: number | null;
}
export interface Level {
  name: string;
  unit: string;
  /** #94: unit was derived from the inflow (inflow × Δt), not author-declared —
   *  the face marks its provenance. serde default false on the Rust side. */
  unit_derived: boolean;
  value: number;
  category: "product" | "resource" | "internal";
}
export interface Trajectory {
  name: string;
  unit: string;
  /** See Level.unit_derived. */
  unit_derived: boolean;
  series: number[];
}
/** One flow's executed per-tick delivery (#203) — the circuit's own recording
 *  (`wire_history`), domain-named. Declared metrics evaluate over these. */
export interface FlowSeries {
  name: string;
  from: string;
  to: string;
  unit: string;
  series: number[];
}
export interface RunResultRich {
  ticks: number;
  dt: number;
  residual: number;
  conserved: boolean;
  levels: Level[];
  comparisons: Comparison[];
  trajectories: Trajectory[];
  flows: FlowSeries[];
}

// ---- Phase 2: the canvas editing model --------------------------------------
// Mirrors crates/bert-lenses-kernel/src/canvas.rs — the JSON shape that crosses
// the wasm boundary via `project` / `to_canvas` / `validate_connection`.

export type Lens = "Klir" | "Bunge" | "Mobus";
export type CanvasRole = "Component" | "Environment";
/** The author's own word for an environment thing (#216): `source` and `sink`
 *  are directional claims the kernel gates on; `environment` (Neutral) says
 *  neither, and flows may run both ways. serde default Neutral — absent in old
 *  JSON reads as no claim, never a false one. */
export type EnvKind = "Source" | "Sink" | "Neutral";
export type Kind = "Unspecified" | "Energy" | "Matter" | "Field" | "Informational";

export type ProcessPrimitive =
  | "Combining"
  | "Splitting"
  | "Buffering"
  | "Impeding"
  | "Propelling"
  | "Copying"
  | "Sensing"
  | "Modulating"
  | "Amplifying"
  | "Inverting";

/** A component → child-model reference (SL's `decomposes`, #89): a human label
 *  plus the stable base58 model id. The id is the key — the label may drift. */
export interface ChildRef {
  name: string;
  id: string;
}

/** Klir's measurement scale for a variable's state set (§4, Table 4.1). serde
 *  serializes the Rust enum as its variant name, so these strings are exact. */
export type ScaleType = "Nominal" | "Ordinal" | "Interval" | "Ratio";

/** Klir's basic-vs-supporting partition (§4, Table 4.1). Basic = an observed
 *  quantity; support = a variable indexing the support set (time/space/pop). A
 *  SEMANTIC role the modeler declares — NOT read off R. Absent reads as Basic. */
export type KlirVarKind = "Basic" | "Support";

/** Klir's epistemological hierarchy (§4.5): the level a model DECLARES itself
 *  to stand at (#288). The modeling relation is defined only within a level
 *  (§5.4), which is what the kernel's cross-level refusal enforces. */
export type KlirLevel = "Source" | "Data" | "Generative" | "Structure" | "Metasystem";

export interface Thing {
  id: number;
  name: string;
  /** What this thing IS, in the author's own words (#326). Prose the kernel
   *  never reads — no verdict depends on it. Absent when undeclared, so models
   *  authored before it stay byte-identical. */
  description?: string;
  x: number;
  y: number;
  role: CanvasRole;
  /** What the author declared an environment thing to be (#216). Meaningless on
   *  a component. Rust always serializes it; absent (old JSON) reads Neutral. */
  env_kind?: EnvKind;
  primitive?: ProcessPrimitive;
  /** Authored interface designation (I ⊆ C). Must carry a boundary-crossing flow —
   *  flowless is refused at Operational (`interfaces_carry_flow`, SSF #31). */
  interface?: boolean;
  /** The child model this component decomposes into, by reference. */
  child_model?: ChildRef;
  /** The stock's declared unit (#76/#94) — meaningful on a Buffering component.
   *  Written by the run panel's accept-derived-unit affordance (or SL's `stock`
   *  clause). serde skip-if-empty on the Rust side — absent = undeclared. */
  stock_unit?: string;
  /** Klir's source-system metadata (#154), authored in the Klir register and
   *  read only there — the kernel carries neither. serde skip-if-None on the
   *  Rust side, so absent = undeclared and old models stay byte-identical. */
  scale?: ScaleType;
  /** The variable's state set — enumerated value labels (`["Green", "Red"]`). */
  states?: string[];
  /** Klir's basic-vs-supporting standing (#154) — authored, not derived from R.
   *  Absent reads as Basic; serde skip-if-None keeps old models byte-identical. */
  variable_kind?: KlirVarKind;
  /** AgentModel.cognitive_params, carried OPAQUELY through the canvas (#216).
   *  The UI neither edits nor interprets these — an untyped bag until #112
   *  chooses the transition functor; dropping it is what broke round trips. */
  cognitive_params?: Record<string, number>;
  /** AgentModel.initial_state — same opaque carriage, same #112 boundary. */
  initial_state?: Record<string, unknown>;
  /** AgentModel.agency_capacity — the process's engine parameter (a Modulating
   *  valve's factor). Absent = unauthored; projection supplies the 0.5 default. */
  agency_capacity?: number;
}

export interface Relation {
  id: number;
  a: number;
  b: number;
  name: string;
  /** What this flow IS, in the author's own words (#326). Same standing as
   *  `Thing.description`: prose, never semantics. */
  description?: string;
  /** What this crossing IS to the system (#331) — Mobus's 2×2 of direction
   *  against value. Absent means UNDECLARED, never `Resource`: only projection
   *  supplies the default, so a surface must not render absence as an
   *  assertion the author never made. */
  usability?: "Resource" | "Disruption" | "Product" | "Waste";
  is_bond: boolean;
  kind: Kind;
  /** Klir's observer toggle: neutral ⇄ directed. View state; never projects. */
  klir_directed?: boolean;
  /** Per-transition DTMC count (#67); absent reads as the uniform default 1. */
  weight?: number;
  /** The flow's magnitude (#216, C1) — Interaction.amount, serialized as a
   *  decimal STRING ("1.5"). Absent = unauthored, a different statement from
   *  "declared 1"; only projection conflates them. */
  amount?: string;
  /** The magnitude's unit (#216, C1). Absent = undeclared. */
  unit?: string;
  /** What flows, named apart from the flow's label (#216, C4). */
  substance?: string;
  /** Availability assertion (#9): the signal is present and never the binding
   *  constraint — no magnitude. serde skip-if-false; absent on old models. */
  ample?: boolean;
}

/** Authored B properties for the root membrane — P = ⟨porosity, fuzziness⟩.
 *  0.0 = unauthored; the boundary inspector writes these, project() carries
 *  them onto the root boundary. */
export interface CanvasBoundaryProps {
  porosity: number;
  perceptive_fuzziness: number;
}

/** Bunge's two kingdoms (Postulate 6.4) + five concrete genera. The modeler's
 *  asserted ontological kind — semantic metadata, not a systemhood verdict.
 *  See systems-science-foundations/docs/reference/system-type-typologies.md. */
export type Kingdom = "Conceptual" | "Concrete";
export type Genus = "Physical" | "Chemical" | "Biological" | "Social" | "Technical";

/** Author-asserted system type. genus is meaningful when kingdom = Concrete;
 *  domain is the free-text subject area that frames the analyst's narration. */
export interface SystemType {
  kingdom?: Kingdom;
  genus?: Genus;
  domain?: string;
}

export interface CanvasModel {
  /** What the SYSTEM OF INTEREST is, in the author's words (#326). There is no
   *  "model" separate from the SOI here: `name` IS the root system's name, so
   *  this is that system's `Info.description`, not a second concept beside it. */
  description?: string;
  lens: Lens;
  /** The model's stable base58 self-identity, carried through the canvas seam
   *  (to_canvas copies it in, project writes it back) so a walked child
   *  re-projects under the id its parent references. Carried, never minted. */
  model_id?: string;
  things: Thing[];
  relations: Relation[];
  boundary: CanvasBoundaryProps;
  /** serde `default` on the Rust side — absent on pre-existing models. */
  system_type?: SystemType;
  /** Author-given SOI name (#84). serde `default`; absent on pre-existing models. */
  name?: string;
  /** The model's time-unit symbol (#94) — what one Δt is called ("h", "mo").
   *  Projects to the kernel model, where the run's derived-stock-unit display
   *  reads it (kW → kW·h instead of kW·Δt). serde skip-if-None — absent =
   *  undeclared (the abstract ·Δt rendering). */
  time_unit?: string;
  /** Declared parameters (walkthrough #18) — domain names over declared
   *  amounts. Presentation semantics: project() ignores them, the run panel
   *  reads them. serde skip-if-empty — absent on pre-existing models. */
  params?: ParamDecl[];
  /** Declared metrics (#203) — domain names over computed OUTPUTS of the
   *  trace, the output twin of `params`. Evaluated over the run recorder
   *  (`RunResultRich.flows`); serde skip-if-empty. */
  metrics?: MetricDecl[];
  /** The declared Klir epistemological level (#288) — authored metadata read
   *  in the Klir register only; never projects. serde skip-if-None — absent =
   *  undeclared, which gates nothing. */
  klir_level?: KlirLevel;
}

/** What a declared parameter anchors: one flow's declared amount, or a
 *  process's whole out-fanout presented as % shares. Externally-tagged serde
 *  enum. Anchors are by id so renames cannot orphan a param. */
export type ParamAnchor = { Flow: { relation: number } } | { Shares: { thing: number } };

/** Inclusive slider bounds, decimal STRINGS in the flow's own unit. */
export interface ParamRange {
  min: string;
  max: string;
}

/** An author-declared adjustable quantity, named in the model's domain
 *  vocabulary. Stores no value — the value IS the anchored declared amount.
 *  Names are unique: they are what scenario overrides (#202) will reference. */
export interface ParamDecl {
  name: string;
  anchor: ParamAnchor;
  range?: ParamRange;
}

/** What a declared metric computes (#203). The verb set is CLOSED and grows
 *  one checkable verb at a time (ADR 0006). Externally-tagged serde enum,
 *  anchored by id like ParamAnchor. */
export type MetricExpr = { ShareOfFlow: { relation: number } } | { SumInto: { thing: number } };

/** An author-declared readout over the run — the output twin of ParamDecl.
 *  A derived reading of kernel-executed values, never a new source of truth. */
export interface MetricDecl {
  name: string;
  expr: MetricExpr;
}

// ---- SL: the textual authoring surface ---------------------------------------

/** One parse fault, anchored to its 1-indexed source line. */
export interface SlError {
  line: number;
  message: string;
}

/** compile_sl: the compiled canvas model (plus whether the text pinned a lens
 *  via `@lens` — lens is view state, so without a pin the caller keeps the
 *  author's current lens), or every fault found. */
export type SlOutcome = { ok: CanvasModel; lens_explicit: boolean } | { errors: SlError[] };

// ---- Phase 3: the lens primitives --------------------------------------------
// Mirrors crates/bert-lenses-kernel/src/lenses.rs. Every field is a kernel
// verdict translated to canvas ids — the three lens renderings READ these,
// they never re-derive them.

/** Bunge endo/exostructure = Mobus N/G — kernel-computed, never stylistic. */
export type EdgeLocus = "Endo" | "Exo";

/** Bunge's coupling-matrix grammar (M₀ᵣ / Mₛ₀ / Mᵣₛ): environment acting on a
 *  component = input, component on environment = output, component on
 *  component = internuncial (#100 phase 2, F6). */
export type BungeChannel = "Input" | "Output" | "Internuncial";

/** One canvas relation read through the flow→bond→relation ladder. */
export interface EdgeFact {
  id: number;
  a: number;
  b: number;
  /** Bunge's bond vs mere-relation predicate. */
  bond: boolean;
  kind: Kind;
  locus: EdgeLocus;
  /** null for mere relations (they do not act) and env–env couplings (outside 𝒮). */
  channel: BungeChannel | null;
  self_loop: boolean;
  /** false iff self-loop: no Mobus preimage (FlowNetwork.lean no_self_loops). */
  mobus_ok: boolean;
}

export type PortDirection = "Receives" | "Exports" | "Hybrid";

/** One Mobus interface r=(S,φ) per (boundary component, environment object). */
export interface PortFact {
  /** Always a member of boundary_thing_ids — the boundary identity, per-port. */
  component: number;
  env: number;
  relation_ids: number[];
  direction: PortDirection;
  protocol: string;
}

export interface BoundaryProps {
  porosity: number;
  perceptive_fuzziness: number;
}

export interface LensFacts {
  /** {c ∈ C : coupled to E} — Bunge marks these nodes, Mobus reifies them. */
  boundary_thing_ids: number[];
  /** O — the environment objects. */
  environment_thing_ids: number[];
  /** Env things no bond touches — project() drops these as orphan terminals;
   *  not yet in ℰ (Bunge Def 1.2 ii). Rendered pending, never re-derived. */
  orphan_env_thing_ids: number[];
  /** Authored members of I. Effective I = boundary_thing_ids ∪ this set;
   *  authored-flowless members are Mobus-visible and Bunge-blind. */
  authored_interface_thing_ids: number[];
  boundary_props: BoundaryProps;
  /** Bunge Def 1.1 verdict, surfaced from validate_mode(Structural). */
  aggregate: boolean;
  /** Every canvas relation, including mere relations. */
  edges: EdgeFact[];
  ports: PortFact[];
}

/** Klir's GSPS epistemological ladder (#100): the model's HONEST position on
 *  the E→D→G / S/M semilattice (Fig. 4.13), kernel-derived — ∅ | E | SE | S²E.
 *  D and G are unreachable from this surface by design (they need observed
 *  data; the compose seam) and `to_climb` says so. The face only typesets. */
export interface KlirLadder {
  position: string;
  claim: string;
  to_climb: string;
  /** Evidence for the S² step: decomposed elements, by name. */
  decomposed: string[];
}

/** describe(model, lens): the model typeset as the active lens's own formal
 *  object — computed by the kernel; the FormalPanel only renders it. Every
 *  variant leads with `question` — the tradition's guiding question, shown as
 *  the orientation line at lens switch (#100). */
export type LensDescription =
  | {
      lens: "Klir";
      question: string;
      things: number;
      relations: number;
      directed: number;
      neutral: number;
      /** R itself (#216): "x → y" when @directed, "x — y" (canonical order) when not. */
      dependencies: string[];
      note: string;
      /** Where this model stands on the ladder — the register's opt-in
       *  complement (#100 harvest), collapsed until asked for. */
      ladder: KlirLadder;
      /** The DECLARED level (#288) — the author's §4.5 claim, distinct from
       *  the ladder's derived position. serde skip-if-None; absent = undeclared. */
      level?: KlirLevel;
    }
  | {
      lens: "Bunge";
      question: string;
      composition: string[];
      environment: string[];
      endostructure: number;
      exostructure: number;
      /** The structure as a SET (#216): "a ▷ b" where direction is asserted,
       *  "a — b" (canonical name order) where it is not. */
      endo_bonds: string[];
      exo_bonds: string[];
      bondage: number;
      mere_relations: number;
      boundary_components: string[];
      verdict: string;
      /** Fixed kernel text: M is documented but formally UNbridged (CES, not CESM). */
      mechanism_note: string;
    }
  | {
      lens: "Mobus";
      question: string;
      c: string[];
      n: number;
      e_objects: string[];
      milieu_note: string;
      g: number;
      b_interfaces: string[];
      porosity: number;
      perceptive_fuzziness: number;
      t_note: string;
      h_note: string;
      dt_note: string;
      self_loop_conflicts: string[];
    };

/** analyze_canvas: the lens gate + facts + formal object, one deserialization.
 *  The atomic replacement for the validate_mode → lens_facts → describe waterfall
 *  the canvas ran on every model change; the kernel projects the model ONCE. */
/** The canvas element a validation issue points at (both null = no subject). */
export interface IssueTarget {
  thing: number | null;
  relation: number | null;
  /** How many canvas relations touch `thing` that this verdict did not consider,
   *  because the author drew them `mere` and mere relations do not bond (#320).
   *  Kernel-computed in `bert_canvas::lenses::analyze` off the same predicate
   *  `EdgeFact.bond` carries; the face only says the number out loud. */
  disregarded_relations: number;
}

/** decompose_component: the newborn child as the store layer needs it — the
 *  model text to save, the base58 identity to stamp, the default label — or the
 *  kernel's refusal issues (v1 interface narrowing, non-component selection). */
export type DecomposeOutcome =
  | { ok: { child_json: string; child_id: string; child_name: string } }
  | { issues: ValidationIssue[] };

/** check_decompositions_canvas: seam issues paired with canvas navigation
 *  targets (index-parallel), the same shape family as CanvasAnalysis. */
export interface DecompositionReport {
  issues: ValidationIssue[];
  issue_targets: IssueTarget[];
}

/** One residue line: count + number-agreed noun phrase — render
 *  `${count} ${label}` verbatim, never re-pluralize. `count === 0` is the
 *  uncountable line (Bunge's ⊘M): render the label alone. */
export interface ResidueEntry {
  count: number;
  label: string;
}

/** The residue register (#100): what the active lens is NOT showing. Two
 *  flavors, rendered distinctly — hidden: the model has it, this lens does not
 *  ask that question; unspecified: the lens asks a question the model has not
 *  answered. Per-lens, not nested (the mode poset is a tree). Kernel judgment;
 *  the face only typesets counts. */
export interface LensResidue {
  hidden: ResidueEntry[];
  unspecified: ResidueEntry[];
}

export interface CanvasAnalysis {
  /** validate_mode at the canvas lens's mode (Klir→Core / Bunge→Structural /
   *  Mobus→Operational). */
  validation: ValidationResult;
  /** Index-parallel with validation.issues — kernel-resolved navigation
   *  targets for the audit panel; never derived from location strings. */
  issue_targets: IssueTarget[];
  facts: LensFacts;
  description: LensDescription;
  residue: LensResidue;
}

// ---- The register matrices (#233) -------------------------------------------
// Klir's incidence matrix and Bunge's coupling matrix M are WRITE surfaces —
// their empty cells author relations — so which cell a relation occupies, and
// which cell may be authored into, is a reading of the tradition and is decided
// in `crates/bert-canvas/src/notation.rs`. These mirrors carry that reading; the
// face maps marks onto glyphs and colors and decides nothing.

/** What an author may do with one cell. `forbidden` names the precondition, so
 *  a dead cell can say why it is dead. */
export type CellStatus =
  | { status: "occupied" }
  | { status: "authorable" }
  | { status: "forbidden"; reason: string };

/** How an occupied Klir incidence cell reads (● ↔ neutral, → directed, ↺ the
 *  diagonal). Which one a cell earns is the kernel's call. */
export type KlirMark =
  | { mark: "empty" }
  | { mark: "neutral" }
  | { mark: "directed" }
  | { mark: "self_loop" };

export interface KlirCell {
  row: number;
  col: number;
  /** Relation ids standing in this cell, in model order. */
  relations: number[];
  mark: KlirMark;
  status: CellStatus;
}

export interface KlirIncidence {
  /** Row/column order, by thing id — Klir draws no composition/environment cut. */
  things: number[];
  cells: KlirCell[];
}

/** A row/column of M: a named thing, or Bunge's index 0 — the environment en
 *  bloc (1979 §2.1). `env` marks the environment side under the itemized
 *  reading, where the cut is an ordering rather than a lumped index. */
export type CouplingSlot = { kind: "env" } | { kind: "thing"; id: number; env: boolean };

/** How an occupied coupling cell reads. The kind of action is what makes a bond
 *  a bond (F7), so an acting cell carries its kind. */
export type BungeMark =
  | { mark: "empty" }
  | { mark: "self_loop" }
  | { mark: "bond"; kind: Kind }
  | { mark: "mere" };

export interface BungeCell {
  /** Slot indices — slots carry no id under en bloc. */
  row: number;
  col: number;
  /** Relation ids gathered into this cell, deduplicated: index 0 stands for
   *  every environment thing at once, so one relation can be reachable from two
   *  directions and must still be counted once. */
  relations: number[];
  mark: BungeMark;
  status: CellStatus;
}

export interface BungeCoupling {
  slots: CouplingSlot[];
  /** The slot index the composition/environment rule is drawn before. */
  cut_at: number;
  cells: BungeCell[];
}

// ---- The sandbox seam (the boundary's one stateful export) ------------------
// Mirrors crates/bert-compose/src/session.rs DTOs, marshaled by
// crates/bert-lenses-kernel/src/sandbox.rs. See API.md "SandboxSession".

/** One frame's read of a live sandbox circuit. */
export interface SandboxSnapshot {
  tick: number;
  time: number;
  /** The declared state invariant (axis D). */
  invariant: "conserved" | "none";
  /** Conservation residual — present only while the ledger is declared. */
  balance: number | null;
  emitted: number;
  sunk: number;
  dissipated: number;
  stored: number;
  /** The unanchored loop's node indices when the wiring has one — the step
   *  is a refused no-op until it's broken (#259). */
  algebraic_cycle: number[] | null;
  nodes: SandboxNode[];
  wires: SandboxWire[];
}

export interface SandboxNode {
  kind: string;
  name: string;
  x: number;
  y: number;
  param: number;
  release_rate: number;
  initial_storage: number;
  capacity: number;
  setpoint: number;
  time_constant: number;
  maintenance: number;
  back_pressure: boolean;
  /** Display label ("money (Material)" / "Material"). */
  substance: string;
  substance_base: "Energy" | "Material" | "Message";
  activity: number;
  storage: number;
  total: number;
  /** The node's last SPARK_CAP ticks (trace, not transition state). */
  spark: number[];
  /** The Troncale process this node was stamped from, if any. */
  process: string | null;
}

export interface SandboxWire {
  from: number;
  to: number;
  mode: "pushed" | "gradient";
  conductance: number;
  rate: number | null;
  ample: boolean;
  /** What the wire delivered this tick — drives the flow animation. */
  last_amount: number;
}

/** A `history_since(fromTick)` delta pull. */
export interface SandboxHistoryDelta {
  /** `[tick, n0.activity, n0.storage, n0.total, n1…]` per row. */
  rows: number[][];
  /** `[emitted, delivered, stored, dissipated]` per row — empty when the
   *  invariant is declined. */
  ledger: [number, number, number, number][];
  /** Executed wire deliveries per row. */
  wires: number[][];
}

/** One primitive palette entry — the face renders what the engine declares. */
export interface SandboxPaletteEntry {
  kind: string;
  /** The tunable scalar knob, when the primitive has one: [label, max]. */
  param_spec: [string, number] | null;
  emits_signal: boolean;
  inherits_substance: boolean;
  default_out: "Energy" | "Material" | "Message";
  /** The teaching card — progressive disclosure, engine-authored. */
  card: PrimitiveCard;
}

/** Per-primitive teaching card (plain English first, then the drill-down). */
export interface PrimitiveCard {
  plain: string;
  everyday: string;
  math: string;
  substance: string;
  theory: string;
  code: string;
}

/** One stampable Troncale process (a ladder rung offered as a macro). */
export interface LadderStamp {
  slug: string;
  name: string;
  /** What the run shows. */
  blurb: string;
  /** The honesty line: how it's wired from primitives. */
  composition: string;
  /** Troncale provenance (citation / dependency statement). */
  provenance: string;
}
