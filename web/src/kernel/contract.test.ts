// serde↔TS contract tests: the web side of the boundary fixture gate.
//
// These load the SAME committed fixtures the Rust tests write (fixtures/
// contract/, generated from real kernel output by crates/bert-canvas's
// tests/contract.rs and the bert-lenses-kernel api.rs test module) and validate
// them against the TS mirrors in ./types.ts. The validation is REAL: each
// `parse*` helper walks every field, checks its runtime type, rejects any
// unexpected key (so a Rust-added field the TS types miss FAILS here), and
// narrows enums to their allowed members. A bare `as LensFacts` cast would catch
// none of that — the point is to fail on drift, not to launder it through a cast.
//
// If a fixture is missing, regenerate the whole set:
//   BLESS_FIXTURES=1 cargo test -p bert-canvas --test contract
//   BLESS_FIXTURES=1 cargo test -p bert-lenses-kernel --lib

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import type {
  CanvasAnalysis,
  CanvasModel,
  ChildRef,
  CsvParse,
  DecompositionReport,
  EdgeFact,
  LensDescription,
  LensFacts,
  LensResidue,
  MappingStatus,
  PortFact,
  Relation,
  RunResult,
  MarkovRunResult,
  RunResultRich,
  SlError,
  SystemType,
  Targets,
  Thing,
  ValidationIssue,
  ValidationResult,
} from "./types";

// ---- fixture loading --------------------------------------------------------

function fixture(name: string): unknown {
  const path = fileURLToPath(new URL(`../../../fixtures/contract/${name}.json`, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8"));
}

// ---- primitive assertions ---------------------------------------------------

function record(v: unknown, where: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    throw new Error(`${where}: expected an object, got ${JSON.stringify(v)}`);
  }
  return v as Record<string, unknown>;
}

/** Every key present must be known, every required key present — the drift gate.
 *  An unexpected key means Rust serialized a field these TS types do not model. */
function shape(v: unknown, where: string, required: string[], optional: string[] = []): Record<string, unknown> {
  const o = record(v, where);
  const known = new Set([...required, ...optional]);
  for (const k of Object.keys(o)) {
    if (!known.has(k)) throw new Error(`${where}: unexpected field "${k}" (types.ts is out of date)`);
  }
  for (const k of required) {
    if (!(k in o)) throw new Error(`${where}: missing required field "${k}"`);
  }
  return o;
}

function num(v: unknown, where: string): number {
  if (typeof v !== "number" || Number.isNaN(v)) throw new Error(`${where}: expected number, got ${JSON.stringify(v)}`);
  return v;
}
function str(v: unknown, where: string): string {
  if (typeof v !== "string") throw new Error(`${where}: expected string, got ${JSON.stringify(v)}`);
  return v;
}
function bool(v: unknown, where: string): boolean {
  if (typeof v !== "boolean") throw new Error(`${where}: expected boolean, got ${JSON.stringify(v)}`);
  return v;
}
function arr(v: unknown, where: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`${where}: expected array, got ${JSON.stringify(v)}`);
  return v;
}
function nullableStr(v: unknown, where: string): string | null {
  return v === null ? null : str(v, where);
}
function nullableNum(v: unknown, where: string): number | null {
  return v === null ? null : num(v, where);
}
function oneOf<T extends string>(v: unknown, where: string, allowed: readonly T[]): T {
  const s = str(v, where);
  if (!(allowed as readonly string[]).includes(s)) {
    throw new Error(`${where}: "${s}" not one of [${allowed.join(", ")}]`);
  }
  return s as T;
}

// ---- boundary-type parsers (walk every field) -------------------------------

const KINDS = ["Unspecified", "Energy", "Matter", "Field", "Informational"] as const;
const LENSES = ["Klir", "Bunge", "Mobus"] as const;
const ROLES = ["Component", "Environment"] as const;
const LOCI = ["Endo", "Exo"] as const;
const CHANNELS = ["Input", "Output", "Internuncial"] as const;
const PORT_DIRS = ["Receives", "Exports", "Hybrid"] as const;
const SEVERITIES = ["Error", "Warning"] as const;
const KINGDOMS = ["Conceptual", "Concrete"] as const;
const GENERA = ["Physical", "Chemical", "Biological", "Social", "Technical"] as const;

function parseChildRef(v: unknown, where: string): ChildRef {
  const o = shape(v, where, ["name", "id"], []);
  return { name: str(o.name, `${where}.name`), id: str(o.id, `${where}.id`) };
}

function parseThing(v: unknown, where: string): Thing {
  const o = shape(v, where, ["id", "name", "x", "y", "role"], ["primitive", "interface", "child_model", "stock_unit"]);
  return {
    id: num(o.id, `${where}.id`),
    name: str(o.name, `${where}.name`),
    x: num(o.x, `${where}.x`),
    y: num(o.y, `${where}.y`),
    role: oneOf(o.role, `${where}.role`, ROLES),
    ...(o.primitive === undefined ? {} : { primitive: str(o.primitive, `${where}.primitive`) as Thing["primitive"] }),
    ...(o.interface === undefined ? {} : { interface: bool(o.interface, `${where}.interface`) }),
    ...(o.child_model === undefined ? {} : { child_model: parseChildRef(o.child_model, `${where}.child_model`) }),
    ...(o.stock_unit === undefined ? {} : { stock_unit: str(o.stock_unit, `${where}.stock_unit`) }),
  };
}

function parseRelation(v: unknown, where: string): Relation {
  const o = shape(v, where, ["id", "a", "b", "name", "is_bond", "kind"], ["klir_directed"]);
  return {
    id: num(o.id, `${where}.id`),
    a: num(o.a, `${where}.a`),
    b: num(o.b, `${where}.b`),
    name: str(o.name, `${where}.name`),
    is_bond: bool(o.is_bond, `${where}.is_bond`),
    kind: oneOf(o.kind, `${where}.kind`, KINDS),
    ...(o.klir_directed === undefined ? {} : { klir_directed: bool(o.klir_directed, `${where}.klir_directed`) }),
  };
}

function parseSystemType(v: unknown, where: string): SystemType {
  const o = shape(v, where, [], ["kingdom", "genus", "domain"]);
  return {
    ...(o.kingdom === undefined ? {} : { kingdom: oneOf(o.kingdom, `${where}.kingdom`, KINGDOMS) }),
    ...(o.genus === undefined ? {} : { genus: oneOf(o.genus, `${where}.genus`, GENERA) }),
    ...(o.domain === undefined ? {} : { domain: str(o.domain, `${where}.domain`) }),
  };
}

function parseCanvasModel(v: unknown): CanvasModel {
  const o = shape(v, "CanvasModel", ["lens", "things", "relations", "boundary"], ["model_id", "system_type", "name", "time_unit"]);
  const b = shape(o.boundary, "CanvasModel.boundary", ["porosity", "perceptive_fuzziness"]);
  return {
    lens: oneOf(o.lens, "CanvasModel.lens", LENSES),
    ...(o.model_id === undefined ? {} : { model_id: str(o.model_id, "CanvasModel.model_id") }),
    things: arr(o.things, "CanvasModel.things").map((t, i) => parseThing(t, `Thing[${i}]`)),
    relations: arr(o.relations, "CanvasModel.relations").map((r, i) => parseRelation(r, `Relation[${i}]`)),
    boundary: {
      porosity: num(b.porosity, "boundary.porosity"),
      perceptive_fuzziness: num(b.perceptive_fuzziness, "boundary.perceptive_fuzziness"),
    },
    ...(o.system_type === undefined ? {} : { system_type: parseSystemType(o.system_type, "CanvasModel.system_type") }),
    ...(o.name === undefined ? {} : { name: str(o.name, "CanvasModel.name") }),
    ...(o.time_unit === undefined ? {} : { time_unit: str(o.time_unit, "CanvasModel.time_unit") }),
  };
}

function parseEdgeFact(v: unknown, where = "EdgeFact"): EdgeFact {
  const o = shape(v, where, ["id", "a", "b", "bond", "kind", "locus", "channel", "self_loop", "mobus_ok"]);
  return {
    id: num(o.id, `${where}.id`),
    a: num(o.a, `${where}.a`),
    b: num(o.b, `${where}.b`),
    bond: bool(o.bond, `${where}.bond`),
    kind: oneOf(o.kind, `${where}.kind`, KINDS),
    locus: oneOf(o.locus, `${where}.locus`, LOCI),
    channel: o.channel === null ? null : oneOf(o.channel, `${where}.channel`, CHANNELS),
    self_loop: bool(o.self_loop, `${where}.self_loop`),
    mobus_ok: bool(o.mobus_ok, `${where}.mobus_ok`),
  };
}

function parsePortFact(v: unknown, where = "PortFact"): PortFact {
  const o = shape(v, where, ["component", "env", "relation_ids", "direction", "protocol"]);
  return {
    component: num(o.component, `${where}.component`),
    env: num(o.env, `${where}.env`),
    relation_ids: arr(o.relation_ids, `${where}.relation_ids`).map((x, i) => num(x, `${where}.relation_ids[${i}]`)),
    direction: oneOf(o.direction, `${where}.direction`, PORT_DIRS),
    protocol: str(o.protocol, `${where}.protocol`),
  };
}

function parseLensFacts(v: unknown): LensFacts {
  const o = shape(v, "LensFacts", [
    "boundary_thing_ids",
    "environment_thing_ids",
    "orphan_env_thing_ids",
    "authored_interface_thing_ids",
    "boundary_props",
    "aggregate",
    "edges",
    "ports",
  ]);
  const props = shape(o.boundary_props, "LensFacts.boundary_props", ["porosity", "perceptive_fuzziness"]);
  return {
    boundary_thing_ids: arr(o.boundary_thing_ids, "LensFacts.boundary_thing_ids").map((x, i) =>
      num(x, `boundary_thing_ids[${i}]`),
    ),
    environment_thing_ids: arr(o.environment_thing_ids, "LensFacts.environment_thing_ids").map((x, i) =>
      num(x, `environment_thing_ids[${i}]`),
    ),
    orphan_env_thing_ids: arr(o.orphan_env_thing_ids, "LensFacts.orphan_env_thing_ids").map((x, i) =>
      num(x, `orphan_env_thing_ids[${i}]`),
    ),
    authored_interface_thing_ids: arr(o.authored_interface_thing_ids, "LensFacts.authored_interface_thing_ids").map(
      (x, i) => num(x, `authored_interface_thing_ids[${i}]`),
    ),
    boundary_props: {
      porosity: num(props.porosity, "boundary_props.porosity"),
      perceptive_fuzziness: num(props.perceptive_fuzziness, "boundary_props.perceptive_fuzziness"),
    },
    aggregate: bool(o.aggregate, "LensFacts.aggregate"),
    edges: arr(o.edges, "LensFacts.edges").map((e, i) => parseEdgeFact(e, `edges[${i}]`)),
    ports: arr(o.ports, "LensFacts.ports").map((p, i) => parsePortFact(p, `ports[${i}]`)),
  };
}

function parseValidationIssue(v: unknown, where: string): ValidationIssue {
  // `doc` is optional on the wire (serde default): absent means no doc link.
  const o = shape(v, where, ["severity", "location", "message", "suggestion"], ["doc"]);
  return {
    severity: oneOf(o.severity, `${where}.severity`, SEVERITIES),
    location: str(o.location, `${where}.location`),
    message: str(o.message, `${where}.message`),
    suggestion: nullableStr(o.suggestion, `${where}.suggestion`),
    doc: "doc" in o ? nullableStr(o.doc, `${where}.doc`) : null,
  };
}

function parseSlError(v: unknown, where: string): SlError {
  const o = shape(v, where, ["line", "message"]);
  return {
    line: num(o.line, `${where}.line`),
    message: str(o.message, `${where}.message`),
  };
}

function parseValidationResult(v: unknown): ValidationResult {
  const o = shape(v, "ValidationResult", ["issues"]);
  return { issues: arr(o.issues, "ValidationResult.issues").map((x, i) => parseValidationIssue(x, `issues[${i}]`)) };
}

function parseLensDescription(v: unknown): LensDescription {
  const o = record(v, "LensDescription");
  const lens = oneOf(o.lens, "LensDescription.lens", LENSES);
  const strs = (x: unknown, w: string) => arr(x, w).map((s, i) => str(s, `${w}[${i}]`));
  switch (lens) {
    case "Klir": {
      // "ladder" here is Klir's GSPS epistemological hierarchy (the surviving
      // sense, #90) — the field name on the wire, not mode-entry vocabulary.
      const k = shape(v, "LensDescription(Klir)", [
        "lens", "question", "things", "relations", "directed", "neutral", "note", "ladder", // GSPS
      ]);
      const l = shape(k.ladder, "Klir.ladder", ["position", "claim", "to_climb", "decomposed"]); // GSPS
      return {
        lens,
        question: str(k.question, "Klir.question"),
        things: num(k.things, "Klir.things"),
        relations: num(k.relations, "Klir.relations"),
        directed: num(k.directed, "Klir.directed"),
        neutral: num(k.neutral, "Klir.neutral"),
        note: str(k.note, "Klir.note"),
        ladder: {
          position: str(l.position, "Klir.ladder.position"), // GSPS
          claim: str(l.claim, "Klir.ladder.claim"), // GSPS
          to_climb: str(l.to_climb, "Klir.ladder.to_climb"), // GSPS
          decomposed: strs(l.decomposed, "Klir.ladder.decomposed"), // GSPS
        },
      };
    }
    case "Bunge": {
      const b = shape(v, "LensDescription(Bunge)", [
        "lens", "question", "composition", "environment", "endostructure", "exostructure",
        "bondage", "mere_relations", "boundary_components", "verdict", "mechanism_note",
      ]);
      return {
        lens,
        question: str(b.question, "Bunge.question"),
        composition: strs(b.composition, "Bunge.composition"),
        environment: strs(b.environment, "Bunge.environment"),
        endostructure: num(b.endostructure, "Bunge.endostructure"),
        exostructure: num(b.exostructure, "Bunge.exostructure"),
        bondage: num(b.bondage, "Bunge.bondage"),
        mere_relations: num(b.mere_relations, "Bunge.mere_relations"),
        boundary_components: strs(b.boundary_components, "Bunge.boundary_components"),
        verdict: str(b.verdict, "Bunge.verdict"),
        mechanism_note: str(b.mechanism_note, "Bunge.mechanism_note"),
      };
    }
    case "Mobus": {
      const m = shape(v, "LensDescription(Mobus)", [
        "lens", "question", "c", "n", "e_objects", "milieu_note", "g", "b_interfaces",
        "porosity", "perceptive_fuzziness", "t_note", "h_note", "dt_note", "self_loop_conflicts",
      ]);
      return {
        lens,
        question: str(m.question, "Mobus.question"),
        c: strs(m.c, "Mobus.c"),
        n: num(m.n, "Mobus.n"),
        e_objects: strs(m.e_objects, "Mobus.e_objects"),
        milieu_note: str(m.milieu_note, "Mobus.milieu_note"),
        g: num(m.g, "Mobus.g"),
        b_interfaces: strs(m.b_interfaces, "Mobus.b_interfaces"),
        porosity: num(m.porosity, "Mobus.porosity"),
        perceptive_fuzziness: num(m.perceptive_fuzziness, "Mobus.perceptive_fuzziness"),
        t_note: str(m.t_note, "Mobus.t_note"),
        h_note: str(m.h_note, "Mobus.h_note"),
        dt_note: str(m.dt_note, "Mobus.dt_note"),
        self_loop_conflicts: strs(m.self_loop_conflicts, "Mobus.self_loop_conflicts"),
      };
    }
  }
}

function parseLensResidue(v: unknown): LensResidue {
  const o = shape(v, "LensResidue", ["hidden", "unspecified"]);
  const entries = (x: unknown, w: string) =>
    arr(x, w).map((e, i) => {
      const ee = shape(e, `${w}[${i}]`, ["count", "label"]);
      return { count: num(ee.count, `${w}[${i}].count`), label: str(ee.label, `${w}[${i}].label`) };
    });
  return {
    hidden: entries(o.hidden, "LensResidue.hidden"),
    unspecified: entries(o.unspecified, "LensResidue.unspecified"),
  };
}

function parseCanvasAnalysis(v: unknown): CanvasAnalysis {
  const o = shape(v, "CanvasAnalysis", ["validation", "issue_targets", "facts", "description", "residue"]);
  const validation = parseValidationResult(o.validation);
  const issue_targets = arr(o.issue_targets, "CanvasAnalysis.issue_targets").map((t, i) => {
    const tt = shape(t, `issue_targets[${i}]`, ["thing", "relation"]);
    return {
      thing: nullableNum(tt.thing, `issue_targets[${i}].thing`),
      relation: nullableNum(tt.relation, `issue_targets[${i}].relation`),
    };
  });
  if (issue_targets.length !== validation.issues.length) {
    throw new Error("CanvasAnalysis: issue_targets must be index-parallel with validation.issues");
  }
  return {
    validation,
    issue_targets,
    facts: parseLensFacts(o.facts),
    description: parseLensDescription(o.description),
    residue: parseLensResidue(o.residue),
  };
}

function parseDecompositionReport(v: unknown): DecompositionReport {
  const o = shape(v, "DecompositionReport", ["issues", "issue_targets"]);
  const issues = arr(o.issues, "DecompositionReport.issues").map((x, i) =>
    parseValidationIssue(x, `issues[${i}]`),
  );
  const issue_targets = arr(o.issue_targets, "DecompositionReport.issue_targets").map((t, i) => {
    const tt = shape(t, `issue_targets[${i}]`, ["thing", "relation"]);
    return {
      thing: nullableNum(tt.thing, `issue_targets[${i}].thing`),
      relation: nullableNum(tt.relation, `issue_targets[${i}].relation`),
    };
  });
  if (issue_targets.length !== issues.length) {
    throw new Error("DecompositionReport: issue_targets must be index-parallel with issues");
  }
  return { issues, issue_targets };
}

function parseCsvParse(v: unknown): CsvParse {
  const o = shape(v, "CsvParse", ["headers", "rows"]);
  return {
    headers: arr(o.headers, "CsvParse.headers").map((h, i) => str(h, `headers[${i}]`)),
    rows: arr(o.rows, "CsvParse.rows").map((r, i) =>
      arr(r, `rows[${i}]`).map((c, j) => str(c, `rows[${i}][${j}]`)),
    ),
  };
}

function parseTargets(v: unknown): Targets {
  const o = shape(v, "Targets", ["flows", "components"]);
  return {
    flows: arr(o.flows, "Targets.flows").map((f, i) => {
      const ff = shape(f, `flows[${i}]`, ["id", "name", "unit"]);
      return { id: num(ff.id, "flow.id"), name: str(ff.name, "flow.name"), unit: str(ff.unit, "flow.unit") };
    }),
    components: arr(o.components, "Targets.components").map((c, i) => {
      const cc = shape(c, `components[${i}]`, ["id", "name"]);
      return { id: num(cc.id, "component.id"), name: str(cc.name, "component.name") };
    }),
  };
}

function parseMappingStatus(v: unknown): MappingStatus {
  const o = shape(v, "MappingStatus", [
    "t1_ok", "t2_ok", "t2_msg", "t4_ok", "t4_msg", "can_finish", "translations", "inferred_dt", "apply_error",
  ]);
  return {
    t1_ok: bool(o.t1_ok, "t1_ok"),
    t2_ok: bool(o.t2_ok, "t2_ok"),
    t2_msg: nullableStr(o.t2_msg, "t2_msg"),
    t4_ok: bool(o.t4_ok, "t4_ok"),
    t4_msg: nullableStr(o.t4_msg, "t4_msg"),
    can_finish: bool(o.can_finish, "can_finish"),
    translations: arr(o.translations, "translations").map((t, i) => str(t, `translations[${i}]`)),
    inferred_dt: nullableNum(o.inferred_dt, "inferred_dt"),
    apply_error: nullableStr(o.apply_error, "apply_error"),
  };
}

function parseRunResult(v: unknown): RunResult {
  const o = shape(v, "RunResult", ["dt", "history", "ledger_history", "final_balance"]);
  return {
    dt: num(o.dt, "RunResult.dt"),
    history: arr(o.history, "history").map((row, i) => arr(row, `history[${i}]`).map((x, j) => num(x, `history[${i}][${j}]`))),
    ledger_history: arr(o.ledger_history, "ledger_history").map((row, i) => {
      const cells = arr(row, `ledger_history[${i}]`).map((x, j) => num(x, `ledger_history[${i}][${j}]`));
      if (cells.length !== 4) throw new Error(`ledger_history[${i}]: expected 4 cells, got ${cells.length}`);
      return cells as [number, number, number, number];
    }),
    final_balance: num(o.final_balance, "RunResult.final_balance"),
  };
}

function parseMarkovRunResult(v: unknown): MarkovRunResult {
  const o = shape(v, "MarkovRunResult", ["kind", "states", "history"]);
  return {
    kind: oneOf(o.kind, "MarkovRunResult.kind", ["markov"] as const),
    states: arr(o.states, "states").map((s, i) => str(s, `states[${i}]`)),
    history: arr(o.history, "history").map((row, i) => arr(row, `history[${i}]`).map((x, j) => num(x, `history[${i}][${j}]`))),
  };
}

function parseRunResultRich(v: unknown): RunResultRich {
  const o = shape(v, "RunResultRich", ["ticks", "dt", "residual", "conserved", "levels", "comparisons", "trajectories"]);
  const nums = (x: unknown, w: string) => arr(x, w).map((n, i) => num(n, `${w}[${i}]`));
  return {
    ticks: num(o.ticks, "ticks"),
    dt: num(o.dt, "dt"),
    residual: num(o.residual, "residual"),
    conserved: bool(o.conserved, "conserved"),
    levels: arr(o.levels, "levels").map((l, i) => {
      const ll = shape(l, `levels[${i}]`, ["name", "unit", "unit_derived", "value", "category"]);
      return {
        name: str(ll.name, "level.name"),
        unit: str(ll.unit, "level.unit"),
        unit_derived: bool(ll.unit_derived, "level.unit_derived"),
        value: num(ll.value, "level.value"),
        category: oneOf(ll.category, "level.category", ["product", "resource", "internal"] as const),
      };
    }),
    comparisons: arr(o.comparisons, "comparisons").map((c, i) => {
      const cc = shape(c, `comparisons[${i}]`, ["element", "kind", "unit", "simulated", "actual", "declared", "divergence_pct"]);
      return {
        element: str(cc.element, "comparison.element"),
        kind: oneOf(cc.kind, "comparison.kind", ["stock", "flow"] as const),
        unit: str(cc.unit, "comparison.unit"),
        simulated: nums(cc.simulated, "comparison.simulated"),
        actual: nums(cc.actual, "comparison.actual"),
        declared: cc.declared === null ? null : nums(cc.declared, "comparison.declared"),
        divergence_pct: nullableNum(cc.divergence_pct, "comparison.divergence_pct"),
      };
    }),
    trajectories: arr(o.trajectories, "trajectories").map((t, i) => {
      const tt = shape(t, `trajectories[${i}]`, ["name", "unit", "unit_derived", "series"]);
      return {
        name: str(tt.name, "traj.name"),
        unit: str(tt.unit, "traj.unit"),
        unit_derived: bool(tt.unit_derived, "traj.unit_derived"),
        series: nums(tt.series, "traj.series"),
      };
    }),
  };
}

// ---- the tests --------------------------------------------------------------

describe("serde↔TS boundary fixtures", () => {
  it("CanvasModel round-trips its editing shape", () => {
    const m = parseCanvasModel(fixture("canvas_model"));
    expect(m.things).toHaveLength(3);
    expect(m.relations.map((r) => r.is_bond)).toContain(false); // a mere relation is present
  });

  it("CanvasModel carries an asserted system_type when present", () => {
    const m = parseCanvasModel(fixture("canvas_model"));
    expect(m.system_type).toEqual({
      kingdom: "Concrete",
      genus: "Social",
      domain: "U.S. legislative process",
    });
  });

  it("CanvasModel carries the SOI name when present, omits it when absent (#84)", () => {
    const m = parseCanvasModel(fixture("canvas_model"));
    expect(m.name).toBe("Pump Station");
    const legacy = { ...(fixture("canvas_model") as Record<string, unknown>) };
    delete legacy.name;
    expect(parseCanvasModel(legacy).name).toBeUndefined();
  });

  it("CanvasModel omits system_type on a pre-existing model (serde default)", () => {
    const legacy = { ...(fixture("canvas_model") as Record<string, unknown>) };
    delete legacy.system_type;
    const m = parseCanvasModel(legacy);
    expect(m.system_type).toBeUndefined();
  });

  it("LensFacts + its EdgeFact/PortFact elements validate", () => {
    const f = parseLensFacts(fixture("lens_facts"));
    expect(f.edges.length).toBeGreaterThan(0);
    expect(f.ports.length).toBeGreaterThan(0);
    // standalone element fixtures (the web validates the element shapes directly)
    expect(parseEdgeFact(fixture("edge_fact")).id).toBeTypeOf("number");
    expect(parsePortFact(fixture("port_fact")).direction).toBeTypeOf("string");
    // a self-loop edge must report mobus_ok=false somewhere in the ladder
    expect(f.edges.some((e) => e.self_loop && !e.mobus_ok)).toBe(true);
  });

  it("SlError list validates (compile_sl's { errors } arm)", () => {
    const errors = arr(fixture("sl_errors"), "sl_errors").map((x, i) =>
      parseSlError(x, `sl_errors[${i}]`),
    );
    expect(errors.length).toBeGreaterThan(1);
    expect(errors[0].line).toBe(1);
  });

  it("ValidationResult validates (with a real issue)", () => {
    const r = parseValidationResult(fixture("validation_result"));
    expect(r.issues.length).toBeGreaterThan(0);
    expect(r.issues[0].severity).toBe("Error");
  });

  it("all three LensDescription variants validate", () => {
    expect(parseLensDescription(fixture("lens_description_klir")).lens).toBe("Klir");
    expect(parseLensDescription(fixture("lens_description_bunge")).lens).toBe("Bunge");
    expect(parseLensDescription(fixture("lens_description_mobus")).lens).toBe("Mobus");
  });

  it("CanvasModel carries the stable model_id when present (#89 step 5b)", () => {
    const m = parseCanvasModel(fixture("canvas_model"));
    expect(m.model_id).toBe("Hrs6K91KnZZsiPcWzftv8U");
    const legacy = { ...(fixture("canvas_model") as Record<string, unknown>) };
    delete legacy.model_id;
    expect(parseCanvasModel(legacy).model_id).toBeUndefined();
  });

  it("DecompositionReport pairs seam issues with canvas targets (#89 step 5b)", () => {
    const r = parseDecompositionReport(fixture("decomposition_report"));
    expect(r.issues.length).toBeGreaterThan(0);
    expect(r.issue_targets[0].thing).toBe(1);
  });

  it("CanvasAnalysis composes validation + facts + description", () => {
    const a = parseCanvasAnalysis(fixture("canvas_analysis"));
    expect(a.validation.issues.length).toBeGreaterThan(0);
    expect(a.facts.edges.length).toBeGreaterThan(0);
    expect(a.description.lens).toBe("Mobus");
  });

  it("LensResidue carries both flavors, number-agreed (#100)", () => {
    const r = parseLensResidue(fixture("lens_residue"));
    expect(r.hidden.length).toBeGreaterThan(0);
    expect(r.unspecified.length).toBeGreaterThan(0);
    // The sample's one mere relation arrives singular — labels never re-pluralize.
    expect(r.hidden[0]).toEqual({ count: 1, label: "mere relation" });
  });

  it("CsvParse validates", () => {
    const c = parseCsvParse(fixture("csv_parse"));
    expect(c.headers).toContain("inflow");
    expect(c.rows.length).toBeGreaterThan(0);
  });

  it("Targets validates", () => {
    const t = parseTargets(fixture("targets"));
    expect(t.flows.length).toBeGreaterThan(0);
  });

  it("MappingStatus validates", () => {
    const s = parseMappingStatus(fixture("mapping_status"));
    expect(s.can_finish).toBe(true);
    expect(s.translations.length).toBeGreaterThan(0);
  });

  it("RunResult validates", () => {
    const r = parseRunResult(fixture("run_result"));
    expect(r.history.length).toBeGreaterThan(0);
    expect(r.ledger_history[0]).toHaveLength(4);
  });

  it("MarkovRunResult validates", () => {
    const r = parseMarkovRunResult(fixture("markov_run_result"));
    expect(r.kind).toBe("markov");
    expect(r.states).toEqual(["Even", "Odd"]);
    // Uniform parity mixes in one step: every row after the first is [½, ½].
    expect(r.history[0]).toEqual([1, 0]);
    expect(r.history[1]).toEqual([0.5, 0.5]);
  });

  it("RunResultRich validates", () => {
    const r = parseRunResultRich(fixture("run_result_rich"));
    expect(r.conserved).toBeTypeOf("boolean");
    expect(r.comparisons.length).toBeGreaterThan(0);
  });
});
