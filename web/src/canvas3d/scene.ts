// The scene builder: CanvasModel + lens_facts in, a typed Scene3D out. Pure,
// deterministic, no three. The facts decide every population — which things
// are interfaces, which are environment, where the ports are — and this file
// only places them (invariant 1: the face indexes and renders).

import type { CanvasModel, Kind, LensFacts, PortDirection, ProcessPrimitive } from "../kernel/types";
import type { SimFrame } from "../canvas/types";
import { bundleLanes, exponentFor, placeBank, placeInterior, relaxDirections, shellSurface, type Shell } from "./layout";
import { add, norm, v3, type Vec3 } from "./vec3";

export type ShellStyle = "capsule" | "hull" | "none";

export type EntityKind = "component" | "interface" | "source" | "sink" | "neutral";

export interface Entity3D {
  id: number;
  name: string;
  kind: EntityKind;
  base: Vec3;
  /** Outward normal for bodies on the shell; undefined for interior and outside. */
  normal?: Vec3;
  radius: number;
  primitive?: ProcessPrimitive;
  orphan: boolean;
  hasChild: boolean;
  /** Stage 2: sim.nodes[name].frac at the scrubbed tick. */
  fill?: number;
}

export interface Port3D {
  key: string;
  component: number;
  env: number;
  at: Vec3;
  normal: Vec3;
  direction: PortDirection;
  protocol: string;
  relationIds: number[];
}

export interface FlowStop {
  ref: "entity" | "port";
  key: string;
}

export interface Flow3D {
  id: number;
  name: string;
  kind: Kind;
  a: number;
  b: number;
  path: FlowStop[];
  lane: number;
  selfLoop: boolean;
  bond: boolean;
  ample: boolean;
  amount?: string;
  unit?: string;
  /** Stage 2: sim.edges[name] at the scrubbed tick. */
  sim?: { value: number; unit: string };
}

export interface Scene3D {
  shell: ShellStyle;
  shape: Shell;
  rootName: string;
  entities: Entity3D[];
  ports: Port3D[];
  flows: Flow3D[];
}

export interface SceneOptions {
  /** The profile dial along the axis, 0 round to 1 square. Default 0.6, a capsule-like shell. */
  squareness?: number;
  /** The cross-section dial, 0 round to 1 square. Default 0, a round section. */
  crossSquareness?: number;
  /** A hard-edged box of the same extents, overriding both dials. */
  box?: boolean;
}

const GAP = 1.4;

/** What a flow says on its label: the name, then the declared rate, or the
 *  word "ample" in place of any number — availability is not a magnitude. */
export function flowLabel(f: Pick<Flow3D, "name" | "amount" | "unit" | "ample">): string {
  const rate = f.ample ? "ample" : f.amount ? `${f.amount}${f.unit ? " " + f.unit : ""}` : "";
  return [f.name, rate].filter(Boolean).join(" · ");
}

export function sceneFromCanvasModel(
  model: CanvasModel,
  facts: LensFacts | null,
  sim: SimFrame | null,
  shell: ShellStyle,
  opts: SceneOptions = {},
): Scene3D {
  const authored = new Set(facts?.authored_interface_thing_ids ?? []);
  const orphans = new Set(facts?.orphan_env_thing_ids ?? []);
  const ports = facts?.ports ?? [];

  // Degenerate guard, as on the 2D canvas: a model whose only component is an
  // authored interface is the walk's opaque box for the system itself. It is
  // the centre, not an opening in its own shell.
  const components = model.things.filter((t) => t.role === "Component");
  const soleSelf = components.length === 1 && authored.has(components[0].id);
  const interiorThings = soleSelf ? components : components.filter((t) => !authored.has(t.id));
  const interfaceThings = soleSelf ? [] : components.filter((t) => authored.has(t.id));
  const envThings = model.things.filter((t) => t.role === "Environment");

  // Shell size follows the interior: enough radius for the cross-section, a
  // half-length that keeps the caps clear of the outermost body.
  const n = interiorThings.length;
  const bodyR = Math.min(0.6, Math.max(0.22, 1.3 / Math.sqrt(Math.max(n, 1))));
  const reach = 1.6 + 0.35 * Math.sqrt(n);
  const interior = placeInterior(interiorThings, reach);
  let maxAxial = 0, maxRadial = 0;
  for (const p of interior) {
    maxAxial = Math.max(maxAxial, Math.abs(p.x));
    maxRadial = Math.max(maxRadial, Math.hypot(p.y, p.z));
  }
  const shape: Shell = {
    radius: Math.max(1.6, maxRadial + bodyR + 0.8),
    halfLength: Math.max(1.4, maxAxial + bodyR + 0.9),
    e: exponentFor(opts.squareness ?? 0.6),
    e2: exponentFor(opts.crossSquareness ?? 0),
    box: !!opts.box,
  };

  const entities: Entity3D[] = interiorThings.map((t, i) => ({
    id: t.id,
    name: t.name,
    kind: "component",
    base: interior[i],
    radius: bodyR,
    primitive: t.primitive,
    orphan: false,
    hasChild: !!t.child_model,
    fill: sim?.nodes[t.name]?.frac,
  }));

  // Environment things bank by the author's word; a neutral thing that only
  // feeds the system sits with the sources, one that only drains it with the
  // sinks, and the rest crown the shell.
  const sideOf = (id: number, envKind: string | undefined): -1 | 0 | 1 => {
    if (envKind === "Source") return -1;
    if (envKind === "Sink") return 1;
    const mine = ports.filter((p) => p.env === id);
    if (mine.length && mine.every((p) => p.direction === "Receives")) return -1;
    if (mine.length && mine.every((p) => p.direction === "Exports")) return 1;
    return 0;
  };
  const banks: Record<-1 | 0 | 1, typeof envThings> = { [-1]: [], 0: [], 1: [] };
  for (const t of envThings) banks[sideOf(t.id, t.env_kind)].push(t);
  const envAt = new Map<number, Vec3>();
  for (const side of [-1, 0, 1] as const) {
    const placed = placeBank(banks[side].length, side, shape, GAP);
    banks[side].forEach((t, i) => {
      envAt.set(t.id, placed[i]);
      entities.push({
        id: t.id,
        name: t.name,
        kind: side === -1 ? "source" : side === 1 ? "sink" : "neutral",
        base: placed[i],
        radius: Math.min(0.5, Math.max(0.18, 1.0 / Math.sqrt(Math.max(banks[side].length, 1)))),
        orphan: orphans.has(t.id),
        hasChild: false,
        fill: sim?.nodes[t.name]?.frac,
      });
    });
  }

  // Ports face the mean direction of their counterparts, then relax apart and
  // land on the shell. An authored interface is a body ON the shell at the
  // same place its ports would sit, so its ports coincide with it.
  const dirFor = (component: number, envIds: number[]): Vec3 => {
    let d = v3();
    for (const e of envIds) {
      const at = envAt.get(e);
      if (at) d = add(d, norm(at));
    }
    if (Math.hypot(d.x, d.y, d.z) < 1e-6) {
      const t = model.things.find((x) => x.id === component);
      d = t ? v3(t.x, -t.y, 0.2) : v3(0, 1, 0);
    }
    return norm(d);
  };

  const interfaceDirs = interfaceThings.map((t) =>
    dirFor(t.id, ports.filter((p) => p.component === t.id).map((p) => p.env)),
  );
  const relaxedInterfaces = relaxDirections(
    interfaceDirs,
    Math.min(0.5, 1.6 / Math.sqrt(Math.max(interfaceThings.length, 1))),
  );
  const interfaceAt = new Map<number, Vec3>();
  interfaceThings.forEach((t, i) => {
    const s = shellSurface(shape, relaxedInterfaces[i]);
    interfaceAt.set(t.id, s.at);
    entities.push({
      id: t.id,
      name: t.name,
      kind: "interface",
      base: s.at,
      normal: s.normal,
      radius: bodyR * 0.8,
      primitive: t.primitive,
      orphan: false,
      hasChild: !!t.child_model,
      fill: sim?.nodes[t.name]?.frac,
    });
  });

  const onShell = (id: number) => authored.has(id) && !soleSelf;
  const plainPorts = ports.filter((p) => !onShell(p.component));
  const plainDirs = relaxDirections(
    plainPorts.map((p) => dirFor(p.component, [p.env])),
    Math.min(0.35, 1.2 / Math.sqrt(Math.max(plainPorts.length, 1))),
  );
  const ports3d: Port3D[] = [];
  ports.forEach((p) => {
    const key = `${p.component}:${p.env}`;
    if (onShell(p.component)) {
      const at = interfaceAt.get(p.component) ?? v3();
      ports3d.push({ key, component: p.component, env: p.env, at, normal: norm(at), direction: p.direction, protocol: p.protocol, relationIds: p.relation_ids });
      return;
    }
    const i = plainPorts.indexOf(p);
    const s = shellSurface(shape, plainDirs[i]);
    ports3d.push({ key, component: p.component, env: p.env, at: s.at, normal: s.normal, direction: p.direction, protocol: p.protocol, relationIds: p.relation_ids });
  });
  const portByPair = new Map(ports3d.map((p) => [p.key, p]));

  const isEnv = (id: number) => envAt.has(id);
  const pairs: [number, number][] = model.relations.map((r) => [r.a, r.b]);
  const lanes = bundleLanes(pairs);
  const flows: Flow3D[] = model.relations.map((r, i) => {
    const path: FlowStop[] = [{ ref: "entity", key: String(r.a) }];
    const crossing =
      isEnv(r.a) && !isEnv(r.b) ? portByPair.get(`${r.b}:${r.a}`) :
      isEnv(r.b) && !isEnv(r.a) ? portByPair.get(`${r.a}:${r.b}`) : undefined;
    // A port owned by an interface IS the interface body, so the path already
    // passes through it; only a plain port adds a stop.
    if (crossing && !onShell(crossing.component)) path.push({ ref: "port", key: crossing.key });
    path.push({ ref: "entity", key: String(r.b) });
    return {
      id: r.id,
      name: r.name,
      kind: r.kind,
      a: r.a,
      b: r.b,
      path,
      lane: lanes[i],
      selfLoop: r.a === r.b,
      bond: r.is_bond,
      ample: !!r.ample,
      amount: r.amount,
      unit: r.unit,
      sim: r.name ? sim?.edges[r.name] : undefined,
    };
  });

  return {
    shell,
    shape,
    rootName: model.name?.trim() || "System",
    entities,
    ports: ports3d,
    flows,
  };
}
