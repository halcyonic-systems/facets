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
  BungeCoupling,
  BungeMark,
  CellStatus,
  CouplingSlot,
  KlirCell,
  KlirIncidence,
  KlirMark,
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
  SandboxSnapshot,
  SandboxNode,
  SandboxWire,
  SandboxHistoryDelta,
  SandboxPaletteEntry,
  LadderStamp,
} from "./types";
import { kernelVerdict } from "./testVerdict";

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
  const o = shape(v, where, ["id", "name", "x", "y", "role"], [
    "primitive", "interface", "child_model", "stock_unit",
    // #216: the author's env word (always serialized since Wave 3) + the
    // opaque engine-parameter carriage; #154 Klir source metadata.
    "env_kind", "scale", "states", "variable_kind",
    "cognitive_params", "initial_state", "agency_capacity",
  ]);
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
    ...(o.env_kind === undefined
      ? {}
      : { env_kind: oneOf(o.env_kind, `${where}.env_kind`, ["Source", "Sink", "Neutral"] as const) }),
    ...(o.scale === undefined ? {} : { scale: str(o.scale, `${where}.scale`) as Thing["scale"] }),
    ...(o.states === undefined ? {} : { states: arr(o.states, `${where}.states`).map((x, i) => str(x, `${where}.states[${i}]`)) }),
    ...(o.variable_kind === undefined
      ? {}
      : { variable_kind: oneOf(o.variable_kind, `${where}.variable_kind`, ["Basic", "Support"] as const) }),
    ...(o.cognitive_params === undefined
      ? {}
      : { cognitive_params: o.cognitive_params as Thing["cognitive_params"] }),
    ...(o.initial_state === undefined ? {} : { initial_state: o.initial_state as Thing["initial_state"] }),
    ...(o.agency_capacity === undefined
      ? {}
      : { agency_capacity: num(o.agency_capacity, `${where}.agency_capacity`) }),
  };
}

function parseRelation(v: unknown, where: string): Relation {
  const o = shape(v, where, ["id", "a", "b", "name", "is_bond", "kind"], [
    "klir_directed", "weight",
    // #216 C1/C4: flow quantity — amount is a decimal STRING on the wire.
    "amount", "unit", "substance",
  ]);
  return {
    id: num(o.id, `${where}.id`),
    a: num(o.a, `${where}.a`),
    b: num(o.b, `${where}.b`),
    name: str(o.name, `${where}.name`),
    is_bond: bool(o.is_bond, `${where}.is_bond`),
    kind: oneOf(o.kind, `${where}.kind`, KINDS),
    ...(o.klir_directed === undefined ? {} : { klir_directed: bool(o.klir_directed, `${where}.klir_directed`) }),
    ...(o.weight === undefined ? {} : { weight: num(o.weight, `${where}.weight`) }),
    ...(o.amount === undefined ? {} : { amount: str(o.amount, `${where}.amount`) }),
    ...(o.unit === undefined ? {} : { unit: str(o.unit, `${where}.unit`) }),
    ...(o.substance === undefined ? {} : { substance: str(o.substance, `${where}.substance`) }),
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
  // `doc` and `code` are optional on the wire (serde default): an absent `doc`
  // means no doc link, an absent `code` means an unnamed defect kind, which the
  // face degrades to an ungroupable singleton rather than guessing from text.
  const o = shape(v, where, ["severity", "location", "message", "suggestion"], ["doc", "code"]);
  return kernelVerdict({
    severity: oneOf(o.severity, `${where}.severity`, SEVERITIES),
    code: "code" in o ? str(o.code, `${where}.code`) : "",
    location: str(o.location, `${where}.location`),
    message: str(o.message, `${where}.message`),
    suggestion: nullableStr(o.suggestion, `${where}.suggestion`),
    doc: "doc" in o ? nullableStr(o.doc, `${where}.doc`) : null,
  });
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
        "lens", "question", "things", "relations", "directed", "neutral", "dependencies", "note", "ladder", // GSPS
      ]);
      const l = shape(k.ladder, "Klir.ladder", ["position", "claim", "to_climb", "decomposed"]); // GSPS
      return {
        lens,
        question: str(k.question, "Klir.question"),
        things: num(k.things, "Klir.things"),
        relations: num(k.relations, "Klir.relations"),
        directed: num(k.directed, "Klir.directed"),
        neutral: num(k.neutral, "Klir.neutral"),
        dependencies: strs(k.dependencies, "Klir.dependencies"),
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
        "endo_bonds", "exo_bonds", "bondage", "mere_relations", "boundary_components", "verdict", "mechanism_note",
      ]);
      return {
        lens,
        question: str(b.question, "Bunge.question"),
        composition: strs(b.composition, "Bunge.composition"),
        environment: strs(b.environment, "Bunge.environment"),
        endostructure: num(b.endostructure, "Bunge.endostructure"),
        exostructure: num(b.exostructure, "Bunge.exostructure"),
        endo_bonds: strs(b.endo_bonds, "Bunge.endo_bonds"),
        exo_bonds: strs(b.exo_bonds, "Bunge.exo_bonds"),
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


// ---- the register matrices (#233) -------------------------------------------

const CELL_STATUSES = ["occupied", "authorable", "forbidden"] as const;

function parseCellStatus(v: unknown, where: string): CellStatus {
  const tag = oneOf(record(v, where).status, `${where}.status`, CELL_STATUSES);
  if (tag === "forbidden") {
    const o = shape(v, where, ["status", "reason"]);
    const reason = str(o.reason, `${where}.reason`);
    if (reason.trim() === "") throw new Error(`${where}: a forbidden cell must name its precondition`);
    return { status: "forbidden", reason };
  }
  shape(v, where, ["status"]);
  return { status: tag };
}

function parseKlirMark(v: unknown, where: string): KlirMark {
  shape(v, where, ["mark"]);
  return { mark: oneOf(record(v, where).mark, `${where}.mark`, ["empty", "neutral", "directed", "self_loop"] as const) };
}

function parseKlirCell(v: unknown, where: string): KlirCell {
  const o = shape(v, where, ["row", "col", "relations", "mark", "status"]);
  return {
    row: num(o.row, `${where}.row`),
    col: num(o.col, `${where}.col`),
    relations: arr(o.relations, `${where}.relations`).map((r, i) => num(r, `${where}.relations[${i}]`)),
    mark: parseKlirMark(o.mark, `${where}.mark`),
    status: parseCellStatus(o.status, `${where}.status`),
  };
}

function parseKlirIncidence(v: unknown): KlirIncidence {
  const o = shape(v, "KlirIncidence", ["things", "cells"]);
  const things = arr(o.things, "KlirIncidence.things").map((t, i) => num(t, `KlirIncidence.things[${i}]`));
  const cells = arr(o.cells, "KlirIncidence.cells").map((c, i) => parseKlirCell(c, `KlirIncidence.cells[${i}]`));
  if (cells.length !== things.length * things.length) {
    throw new Error("KlirIncidence: the matrix must be |T|×|T| — every pair owes a cell");
  }
  return { things, cells };
}

function parseCouplingSlot(v: unknown, where: string): CouplingSlot {
  const tag = oneOf(record(v, where).kind, `${where}.kind`, ["env", "thing"] as const);
  if (tag === "env") {
    shape(v, where, ["kind"]);
    return { kind: "env" };
  }
  const o = shape(v, where, ["kind", "id", "env"]);
  return { kind: "thing", id: num(o.id, `${where}.id`), env: bool(o.env, `${where}.env`) };
}

function parseBungeMark(v: unknown, where: string): BungeMark {
  const tag = oneOf(record(v, where).mark, `${where}.mark`, ["empty", "self_loop", "bond", "mere"] as const);
  if (tag === "bond") {
    const o = shape(v, where, ["mark", "kind"]);
    return { mark: "bond", kind: oneOf(o.kind, `${where}.kind`, KINDS) };
  }
  shape(v, where, ["mark"]);
  return { mark: tag };
}

function parseBungeCoupling(v: unknown): BungeCoupling {
  const o = shape(v, "BungeCoupling", ["slots", "cut_at", "cells"]);
  const slots = arr(o.slots, "BungeCoupling.slots").map((s, i) => parseCouplingSlot(s, `BungeCoupling.slots[${i}]`));
  const cells = arr(o.cells, "BungeCoupling.cells").map((c, i) => {
    const cc = shape(c, `BungeCoupling.cells[${i}]`, ["row", "col", "relations", "mark", "status"]);
    return {
      row: num(cc.row, `BungeCoupling.cells[${i}].row`),
      col: num(cc.col, `BungeCoupling.cells[${i}].col`),
      relations: arr(cc.relations, `BungeCoupling.cells[${i}].relations`).map((r, j) =>
        num(r, `BungeCoupling.cells[${i}].relations[${j}]`),
      ),
      mark: parseBungeMark(cc.mark, `BungeCoupling.cells[${i}].mark`),
      status: parseCellStatus(cc.status, `BungeCoupling.cells[${i}].status`),
    };
  });
  const cut_at = num(o.cut_at, "BungeCoupling.cut_at");
  if (cut_at < 0 || cut_at > slots.length) throw new Error("BungeCoupling: cut_at must index into slots");
  if (cells.length !== slots.length * slots.length) {
    throw new Error("BungeCoupling: M must be square over its slots");
  }
  return { slots, cut_at, cells };
}

function parseCanvasAnalysis(v: unknown): CanvasAnalysis {
  const o = shape(v, "CanvasAnalysis", ["validation", "issue_targets", "facts", "description", "residue"]);
  const validation = parseValidationResult(o.validation);
  const issue_targets = arr(o.issue_targets, "CanvasAnalysis.issue_targets").map((t, i) => {
    const tt = shape(t, `issue_targets[${i}]`, ["thing", "relation", "disregarded_relations"]);
    return {
      thing: nullableNum(tt.thing, `issue_targets[${i}].thing`),
      relation: nullableNum(tt.relation, `issue_targets[${i}].relation`),
      disregarded_relations: num(tt.disregarded_relations, `issue_targets[${i}].disregarded_relations`),
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
    const tt = shape(t, `issue_targets[${i}]`, ["thing", "relation", "disregarded_relations"]);
    return {
      thing: nullableNum(tt.thing, `issue_targets[${i}].thing`),
      relation: nullableNum(tt.relation, `issue_targets[${i}].relation`),
      disregarded_relations: num(tt.disregarded_relations, `issue_targets[${i}].disregarded_relations`),
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
  const o = shape(v, "RunResultRich", ["ticks", "dt", "residual", "conserved", "levels", "comparisons", "trajectories", "flows"]);
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
    flows: arr(o.flows, "flows").map((f, i) => {
      const ff = shape(f, `flows[${i}]`, ["name", "from", "to", "unit", "series"]);
      return {
        name: str(ff.name, "flow.name"),
        from: str(ff.from, "flow.from"),
        to: str(ff.to, "flow.to"),
        unit: str(ff.unit, "flow.unit"),
        series: nums(ff.series, "flow.series"),
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

  it("KlirIncidence validates, and every cell of |T|×|T| is present", () => {
    const inc = parseKlirIncidence(fixture("klir_incidence"));
    expect(inc.things.length).toBeGreaterThan(0);
    // The sample orients one relation, so the directed reading is exercised.
    expect(inc.cells.some((c) => c.mark.mark === "directed")).toBe(true);
  });

  it("BungeCoupling validates under both environment readings", () => {
    const enBloc = parseBungeCoupling(fixture("bunge_coupling_en_bloc"));
    // Bunge prints index 0 first, and the cut falls immediately after it.
    expect(enBloc.slots[0]).toEqual({ kind: "env" });
    expect(enBloc.cut_at).toBe(1);
    const itemized = parseBungeCoupling(fixture("bunge_coupling_itemized"));
    expect(itemized.slots.every((s) => s.kind === "thing")).toBe(true);
  });

  it("a closed cell arrives forbidden, carrying the precondition in words (#233)", () => {
    const enBloc = parseBungeCoupling(fixture("bunge_coupling_en_bloc"));
    const m00 = enBloc.cells.find((c) => c.row === 0 && c.col === 0);
    expect(m00?.status.status).toBe("forbidden");
    // Not a bare flag: the reason is what a dead cell says when hovered.
    expect(m00?.status.status === "forbidden" && m00.status.reason).toContain("M₀₀ = 0");
    expect(m00?.relations).toEqual([]);
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

// ---- the sandbox seam (SandboxSession DTOs) ---------------------------------

const SUBSTANCE_BASES = ["Energy", "Material", "Message"] as const;
const WIRE_MODES = ["pushed", "gradient"] as const;

function numArr(v: unknown, where: string): number[] {
  return arr(v, where).map((x, i) => num(x, `${where}[${i}]`));
}

function ledgerRow(v: unknown, where: string): [number, number, number, number] {
  const r = numArr(v, where);
  if (r.length !== 4) throw new Error(`${where}: expected 4 ledger columns, got ${r.length}`);
  return r as [number, number, number, number];
}

function parseSandboxNode(v: unknown, where: string): SandboxNode {
  const o = shape(v, where, [
    "kind", "name", "x", "y", "param", "release_rate", "initial_storage",
    "capacity", "setpoint", "time_constant", "maintenance", "back_pressure",
    "substance", "substance_base", "activity", "storage", "total", "spark",
    "process",
  ]);
  return {
    kind: str(o.kind, `${where}.kind`),
    name: str(o.name, `${where}.name`),
    x: num(o.x, `${where}.x`),
    y: num(o.y, `${where}.y`),
    param: num(o.param, `${where}.param`),
    release_rate: num(o.release_rate, `${where}.release_rate`),
    initial_storage: num(o.initial_storage, `${where}.initial_storage`),
    capacity: num(o.capacity, `${where}.capacity`),
    setpoint: num(o.setpoint, `${where}.setpoint`),
    time_constant: num(o.time_constant, `${where}.time_constant`),
    maintenance: num(o.maintenance, `${where}.maintenance`),
    back_pressure: bool(o.back_pressure, `${where}.back_pressure`),
    substance: str(o.substance, `${where}.substance`),
    substance_base: oneOf(o.substance_base, `${where}.substance_base`, SUBSTANCE_BASES),
    activity: num(o.activity, `${where}.activity`),
    storage: num(o.storage, `${where}.storage`),
    total: num(o.total, `${where}.total`),
    spark: numArr(o.spark, `${where}.spark`),
    process: nullableStr(o.process, `${where}.process`),
  };
}

function parseSandboxWire(v: unknown, where: string): SandboxWire {
  const o = shape(v, where, ["from", "to", "mode", "conductance", "rate", "ample", "last_amount"]);
  return {
    from: num(o.from, `${where}.from`),
    to: num(o.to, `${where}.to`),
    mode: oneOf(o.mode, `${where}.mode`, WIRE_MODES),
    conductance: num(o.conductance, `${where}.conductance`),
    rate: nullableNum(o.rate, `${where}.rate`),
    ample: bool(o.ample, `${where}.ample`),
    last_amount: num(o.last_amount, `${where}.last_amount`),
  };
}

function parseSandboxSnapshot(v: unknown): SandboxSnapshot {
  const o = shape(v, "SandboxSnapshot", [
    "tick", "time", "invariant", "balance", "emitted", "sunk", "dissipated",
    "stored", "algebraic_cycle", "nodes", "wires",
  ]);
  return {
    tick: num(o.tick, "tick"),
    time: num(o.time, "time"),
    invariant: oneOf(o.invariant, "invariant", ["conserved", "none"] as const),
    balance: nullableNum(o.balance, "balance"),
    emitted: num(o.emitted, "emitted"),
    sunk: num(o.sunk, "sunk"),
    dissipated: num(o.dissipated, "dissipated"),
    stored: num(o.stored, "stored"),
    algebraic_cycle: o.algebraic_cycle === null ? null : numArr(o.algebraic_cycle, "algebraic_cycle"),
    nodes: arr(o.nodes, "nodes").map((n, i) => parseSandboxNode(n, `nodes[${i}]`)),
    wires: arr(o.wires, "wires").map((w, i) => parseSandboxWire(w, `wires[${i}]`)),
  };
}

function parseSandboxHistoryDelta(v: unknown): SandboxHistoryDelta {
  const o = shape(v, "SandboxHistoryDelta", ["rows", "ledger", "wires"]);
  return {
    rows: arr(o.rows, "rows").map((r, i) => numArr(r, `rows[${i}]`)),
    ledger: arr(o.ledger, "ledger").map((r, i) => ledgerRow(r, `ledger[${i}]`)),
    wires: arr(o.wires, "wires").map((r, i) => numArr(r, `wires[${i}]`)),
  };
}

function parseSandboxPaletteEntry(v: unknown, where: string): SandboxPaletteEntry {
  const o = shape(v, where, ["kind", "param_spec", "emits_signal", "inherits_substance", "default_out"]);
  let spec: [string, number] | null = null;
  if (o.param_spec !== null) {
    const pair = arr(o.param_spec, `${where}.param_spec`);
    if (pair.length !== 2) throw new Error(`${where}.param_spec: expected [label, max]`);
    spec = [str(pair[0], `${where}.param_spec[0]`), num(pair[1], `${where}.param_spec[1]`)];
  }
  return {
    kind: str(o.kind, `${where}.kind`),
    param_spec: spec,
    emits_signal: bool(o.emits_signal, `${where}.emits_signal`),
    inherits_substance: bool(o.inherits_substance, `${where}.inherits_substance`),
    default_out: oneOf(o.default_out, `${where}.default_out`, SUBSTANCE_BASES),
  };
}

function parseLadderStamp(v: unknown, where: string): LadderStamp {
  const o = shape(v, where, ["slug", "name", "blurb", "composition", "provenance"]);
  return {
    slug: str(o.slug, `${where}.slug`),
    name: str(o.name, `${where}.name`),
    blurb: str(o.blurb, `${where}.blurb`),
    composition: str(o.composition, `${where}.composition`),
    provenance: str(o.provenance, `${where}.provenance`),
  };
}

describe("serde↔TS sandbox fixtures", () => {
  it("SandboxSnapshot validates", () => {
    const s = parseSandboxSnapshot(fixture("sandbox_snapshot"));
    expect(s.tick).toBeGreaterThan(0);
    expect(s.nodes.length).toBeGreaterThan(0);
    expect(s.wires.length).toBeGreaterThan(0);
    // The fixture is a conserved Flows stamp: residual present and ≈ 0.
    expect(s.invariant).toBe("conserved");
    expect(Math.abs(s.balance ?? NaN)).toBeLessThan(1e-3);
  });

  it("SandboxHistoryDelta validates", () => {
    const d = parseSandboxHistoryDelta(fixture("sandbox_history_delta"));
    expect(d.rows.length).toBeGreaterThan(0);
    expect(d.ledger.length).toBe(d.rows.length);
  });

  it("sandbox palette validates and carries the 12 kinds", () => {
    const entries = arr(fixture("sandbox_palette"), "sandbox_palette")
      .map((e, i) => parseSandboxPaletteEntry(e, `palette[${i}]`));
    expect(entries).toHaveLength(12);
    expect(entries.map((e) => e.kind)).toContain("Buffering");
  });

  it("Troncale process stamps validate", () => {
    const stamps = arr(fixture("ladder_stamps"), "ladder_stamps")
      .map((s, i) => parseLadderStamp(s, `stamps[${i}]`));
    expect(stamps.length).toBeGreaterThan(0);
    for (const s of stamps) expect(s.composition.length).toBeGreaterThan(0);
  });
});
