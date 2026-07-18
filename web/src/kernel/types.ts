// Hand-written TS mirrors of the frozen kernel boundary (crates/bert-lenses-kernel/API.md).
// The wasm functions return `any`; these types are the contract the face reads
// against. THE INVARIANT: these describe shapes the Rust kernel computes — the
// face never derives a verdict, it only renders these.

export type Severity = "Error" | "Warning";

export interface ValidationIssue {
  severity: Severity;
  location: string;
  message: string;
  suggestion: string | null;
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
  value: number;
  category: "product" | "resource" | "internal";
}
export interface Trajectory {
  name: string;
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
}

// ---- Phase 2: the canvas editing model --------------------------------------
// Mirrors crates/bert-lenses-kernel/src/canvas.rs — the JSON shape that crosses
// the wasm boundary via `project` / `to_canvas` / `validate_connection`.

export type Lens = "Klir" | "Bunge" | "Mobus";
export type CanvasRole = "Component" | "Environment";
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

export interface Thing {
  id: number;
  name: string;
  x: number;
  y: number;
  role: CanvasRole;
  primitive?: ProcessPrimitive;
  /** Authored interface designation (I ⊆ C; flowless well-formed). */
  interface?: boolean;
}

export interface Relation {
  id: number;
  a: number;
  b: number;
  name: string;
  is_bond: boolean;
  kind: Kind;
  /** Klir's observer toggle: neutral ⇄ directed. View state; never projects. */
  klir_directed?: boolean;
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
  lens: Lens;
  things: Thing[];
  relations: Relation[];
  boundary: CanvasBoundaryProps;
  /** serde `default` on the Rust side — absent on pre-existing models. */
  system_type?: SystemType;
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

/** One canvas relation read through the flow→bond→relation ladder. */
export interface EdgeFact {
  id: number;
  a: number;
  b: number;
  /** Bunge's bond vs mere-relation predicate. */
  bond: boolean;
  kind: Kind;
  locus: EdgeLocus;
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

/** describe(model, lens): the model typeset as the active lens's own formal
 *  object — computed by the kernel; the FormalPanel only renders it. */
export type LensDescription =
  | {
      lens: "Klir";
      things: number;
      relations: number;
      directed: number;
      neutral: number;
      note: string;
    }
  | {
      lens: "Bunge";
      composition: string[];
      environment: string[];
      endostructure: number;
      exostructure: number;
      bondage: number;
      mere_relations: number;
      boundary_components: string[];
      verdict: string;
      /** Fixed kernel text: M is documented but formally UNbridged (CES, not CESM). */
      mechanism_note: string;
    }
  | {
      lens: "Mobus";
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
}
