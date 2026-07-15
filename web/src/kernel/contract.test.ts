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
  CsvParse,
  EdgeFact,
  LensDescription,
  LensFacts,
  MappingStatus,
  PortFact,
  Relation,
  RunResult,
  RunResultRich,
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
const PORT_DIRS = ["Receives", "Exports", "Hybrid"] as const;
const SEVERITIES = ["Error", "Warning"] as const;

function parseThing(v: unknown, where: string): Thing {
  const o = shape(v, where, ["id", "name", "x", "y", "role"], ["primitive"]);
  return {
    id: num(o.id, `${where}.id`),
    name: str(o.name, `${where}.name`),
    x: num(o.x, `${where}.x`),
    y: num(o.y, `${where}.y`),
    role: oneOf(o.role, `${where}.role`, ROLES),
    ...(o.primitive === undefined ? {} : { primitive: str(o.primitive, `${where}.primitive`) as Thing["primitive"] }),
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

function parseCanvasModel(v: unknown): CanvasModel {
  const o = shape(v, "CanvasModel", ["lens", "things", "relations"]);
  return {
    lens: oneOf(o.lens, "CanvasModel.lens", LENSES),
    things: arr(o.things, "CanvasModel.things").map((t, i) => parseThing(t, `Thing[${i}]`)),
    relations: arr(o.relations, "CanvasModel.relations").map((r, i) => parseRelation(r, `Relation[${i}]`)),
  };
}

function parseEdgeFact(v: unknown, where = "EdgeFact"): EdgeFact {
  const o = shape(v, where, ["id", "a", "b", "bond", "kind", "locus", "self_loop", "mobus_ok"]);
  return {
    id: num(o.id, `${where}.id`),
    a: num(o.a, `${where}.a`),
    b: num(o.b, `${where}.b`),
    bond: bool(o.bond, `${where}.bond`),
    kind: oneOf(o.kind, `${where}.kind`, KINDS),
    locus: oneOf(o.locus, `${where}.locus`, LOCI),
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
  const o = shape(v, where, ["severity", "location", "message", "suggestion"]);
  return {
    severity: oneOf(o.severity, `${where}.severity`, SEVERITIES),
    location: str(o.location, `${where}.location`),
    message: str(o.message, `${where}.message`),
    suggestion: nullableStr(o.suggestion, `${where}.suggestion`),
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
      const k = shape(v, "LensDescription(Klir)", ["lens", "things", "relations", "directed", "neutral", "note"]);
      return {
        lens,
        things: num(k.things, "Klir.things"),
        relations: num(k.relations, "Klir.relations"),
        directed: num(k.directed, "Klir.directed"),
        neutral: num(k.neutral, "Klir.neutral"),
        note: str(k.note, "Klir.note"),
      };
    }
    case "Bunge": {
      const b = shape(v, "LensDescription(Bunge)", [
        "lens", "composition", "environment", "endostructure", "exostructure",
        "bondage", "mere_relations", "boundary_components", "verdict", "mechanism_note",
      ]);
      return {
        lens,
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
        "lens", "c", "n", "e_objects", "milieu_note", "g", "b_interfaces",
        "porosity", "perceptive_fuzziness", "t_note", "h_note", "dt_note", "self_loop_conflicts",
      ]);
      return {
        lens,
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

function parseCanvasAnalysis(v: unknown): CanvasAnalysis {
  const o = shape(v, "CanvasAnalysis", ["validation", "facts", "description"]);
  return {
    validation: parseValidationResult(o.validation),
    facts: parseLensFacts(o.facts),
    description: parseLensDescription(o.description),
  };
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

function parseRunResultRich(v: unknown): RunResultRich {
  const o = shape(v, "RunResultRich", ["ticks", "dt", "residual", "conserved", "levels", "comparisons", "trajectories"]);
  const nums = (x: unknown, w: string) => arr(x, w).map((n, i) => num(n, `${w}[${i}]`));
  return {
    ticks: num(o.ticks, "ticks"),
    dt: num(o.dt, "dt"),
    residual: num(o.residual, "residual"),
    conserved: bool(o.conserved, "conserved"),
    levels: arr(o.levels, "levels").map((l, i) => {
      const ll = shape(l, `levels[${i}]`, ["name", "unit", "value", "category"]);
      return {
        name: str(ll.name, "level.name"),
        unit: str(ll.unit, "level.unit"),
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
      const tt = shape(t, `trajectories[${i}]`, ["name", "unit", "series"]);
      return { name: str(tt.name, "traj.name"), unit: str(tt.unit, "traj.unit"), series: nums(tt.series, "traj.series") };
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

  it("CanvasAnalysis composes validation + facts + description", () => {
    const a = parseCanvasAnalysis(fixture("canvas_analysis"));
    expect(a.validation.issues.length).toBeGreaterThan(0);
    expect(a.facts.edges.length).toBeGreaterThan(0);
    expect(a.description.lens).toBe("Mobus");
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

  it("RunResultRich validates", () => {
    const r = parseRunResultRich(fixture("run_result_rich"));
    expect(r.conserved).toBeTypeOf("boolean");
    expect(r.comparisons.length).toBeGreaterThan(0);
  });
});
