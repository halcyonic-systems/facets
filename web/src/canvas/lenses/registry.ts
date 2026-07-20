// The lens view table — one stateless renderer set per Lens. New palette node
// types get REGISTERED here (a new lens, or new views on a lens), never
// interleaved into `lens ===` conditionals in the canvas. Every view is
// stateless: kernel facts in (role, primitive, boundary membership, edge
// ladder, ports), SVG out. NO systems fact is decided in these files.
import type { ComponentType } from "react";
import type {
  CanvasModel,
  CanvasRole,
  EdgeFact,
  Lens,
  PortFact,
  ProcessPrimitive,
  Relation,
  Thing,
} from "../../kernel/types";
import type { Pt, Ring } from "../geometry";
import type { PointerEvent as ReactPointerEvent } from "react";
import { PRIMITIVE_BADGE } from "../types";
import { Klir } from "./klir";
import { Bunge } from "./bunge";
import { Mobus } from "./mobus";

export interface LensNodeProps {
  thing: Thing;
  /** Kernel verdict: this component has an external flow (∈ boundary_thing_ids). */
  isBoundary: boolean;
  /** Kernel verdict: env thing no bond touches (∈ orphan_env_thing_ids) —
   *  project() drops it, so it is not yet in ℰ. Rendered pending. */
  isOrphan: boolean;
  hovered: boolean;
  sim?: { value: number; unit: string; frac: number };
  onPointerDown: (e: ReactPointerEvent) => void;
  onHandlePointerDown: (e: ReactPointerEvent) => void;
}

export interface LensEdgeProps {
  model: CanvasModel;
  relation: Relation;
  /** The kernel's reading of this relation through the edge ladder. */
  fact?: EdgeFact;
  /** The Mobus membrane (null under Klir/Bunge); exo flows route through it. */
  ring: Ring | null;
  sigIndex: number;
  selected: boolean;
  driven: boolean;
  sim?: { value: number; unit: string };
  onSelect?: (id: number) => void;
}

export interface LensPortProps {
  port: PortFact;
  at: Pt;
  /** Outward normal of the membrane at `at` (rad) — orients the penetrating capsule. */
  angle?: number;
  /** Ports belong to B — clicking one opens the boundary inspector. */
  onSelect?: () => void;
}

export interface LensViews {
  NodeView: ComponentType<LensNodeProps>;
  EdgeView: ComponentType<LensEdgeProps>;
  PortView: ComponentType<LensPortProps>;
}

export const LensRegistry: Record<Lens, LensViews> = {
  Klir,
  Bunge,
  Mobus,
};

// ---- The authoring palette (#50 design, #51 slice 2) -------------------------
//
// Each lens's rail rows, grouped by birth mode (lens-palettes.md § The
// authoring palette). The rail renders LensPalette[lens] and nothing else —
// absence is ontology, so a lens without a row simply doesn't offer that verb.
// Legality stays a kernel verdict (validate_connection / analyze_canvas); this
// table only says what the lens's AUTHOR would recognize as an authoring act.

/** What a designate-tool stamps onto a component. An open union by design:
 *  interface membership arrives with #51 slice 3 (I ⊆ C, Boundary.lean), and
 *  agent-hood (archetype designation, Mobus ch. 10–11 — agents are decision
 *  processes WITHIN C) is a future member. New designations are new registry
 *  entries, not new mechanisms. */
export type Designation =
  | { type: "primitive"; primitive: ProcessPrimitive }
  | { type: "interface" };

export type PaletteTool =
  | { verb: "place"; id: string; label: string; tip: string; role: CanvasRole }
  | { verb: "designate"; id: string; label: string; tip: string; designation: Designation };

/** A non-armable rail row: connect-gesture hints and kernel-derived kinds. */
export interface PaletteHint {
  id: string;
  label: string;
  tip: string;
}

export interface LensPaletteSpec {
  place: PaletteTool[];
  designate: PaletteTool[];
  connect: PaletteHint[];
  derived: PaletteHint[];
}

const PRIMITIVES = Object.keys(PRIMITIVE_BADGE) as ProcessPrimitive[];

export const LensPalette: Record<Lens, LensPaletteSpec> = {
  Klir: {
    place: [
      {
        verb: "place",
        id: "thing",
        label: "thing",
        tip: "a member of T — S = (T, R), Facets Eq. 1.1; systemhood lives in R",
        role: "Component",
      },
    ],
    designate: [],
    connect: [
      {
        id: "relation",
        label: "relation",
        tip: "drag the handle between two things — neutral by default; direction is the observer's per-relation toggle (Facets ch. 4)",
      },
    ],
    derived: [],
  },
  Bunge: {
    place: [
      {
        verb: "place",
        id: "component",
        label: "component",
        tip: "a member of 𝒞 — Def 1.2(i)",
        role: "Component",
      },
      {
        verb: "place",
        id: "env-thing",
        label: "environment thing",
        tip: "in ℰ once bonded — Def 1.2(ii) admits only things that act on / are acted on by 𝒞; renders pending until a bond touches it",
        role: "Environment",
      },
    ],
    designate: [],
    connect: [
      {
        id: "bond",
        label: "bond / mere relation",
        tip: "drag the handle between things — a bond is action that changes a trajectory (Def 1.1); toggle bond ⇄ mere in the edge editor; drag to empty space to birth an environment thing with its bond",
      },
    ],
    derived: [
      {
        id: "boundary",
        label: "boundary ∂C",
        tip: "computed, not drawn — the set of components directly coupled to ℰ (Bunge 1992 Def 3: no shape, no surface)",
      },
      {
        id: "aggregate",
        label: "system ⁄ aggregate verdict",
        tip: "systemhood is earned: ≥1 bond among distinct components, else a heap (Def 1.1) — validate_mode(Structural)",
      },
    ],
  },
  Mobus: {
    place: [
      {
        verb: "place",
        id: "component",
        label: "component",
        tip: "a member of C — a subsystem one level down",
        role: "Component",
      },
      {
        verb: "place",
        id: "env-object",
        label: "environment object",
        tip: "E.O — Source vs Sink is derived from flow direction in project(); pending until a flow touches it",
        role: "Environment",
      },
    ],
    // Work processes are Economy-side content (ch. 10: agents are the decision
    // ovals INSIDE process ovals; agency on a primitive was a category error,
    // bert-compose circuit.rs). Agent designation is a future entry here.
    designate: [
      {
        verb: "designate" as const,
        id: "interface",
        label: "interface",
        tip: "designate a component into I (I ⊆ C, Tuple.lean; flowless is well-formed — no coverage constraint). Stamp again to undo.",
        designation: { type: "interface" as const },
      },
      ...PRIMITIVES.map((p) => ({
      verb: "designate" as const,
      id: `primitive-${p}`,
      label: PRIMITIVE_BADGE[p],
      tip: `work process: ${p.toLowerCase()} — stamp onto a leaf component (Mobus's atomic process vocabulary)`,
      designation: { type: "primitive" as const, primitive: p },
      })),
    ],
    connect: [
      {
        id: "flow",
        label: "typed flow",
        tip: "drag the handle — substance type set in the edge editor; crossing flows pass through interfaces (G bipartite, Tuple.lean); drag to empty space to birth an environment object with its flow",
      },
    ],
    derived: [
      {
        id: "boundary",
        label: "boundary B = ⟨P, I⟩",
        tip: "the reified membrane — drawn from the component set, properties P author in the inspector (slice 3)",
      },
      {
        id: "interfaces",
        label: "interface ports",
        tip: "from crossing flows today; direct designation (I ⊆ C, flowless legal — Boundary.lean, §4.3 Eq. 4.6) lands with slice 3",
      },
      {
        id: "src-snk",
        label: "source ⁄ sink identity",
        tip: "derived from first-flow direction in project() — one place-tool, not two",
      },
    ],
  },
};
