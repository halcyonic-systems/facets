// The lens view table — one stateless renderer set per Lens. New palette node
// types get REGISTERED here (a new lens, or new views on a lens), never
// interleaved into `lens ===` conditionals in the canvas. Every view is
// stateless: kernel facts in (role, primitive, boundary membership, edge
// ladder, ports), SVG out. NO systems fact is decided in these files.
import type { ComponentType } from "react";
import type { CanvasModel, EdgeFact, Lens, PortFact, Relation, Thing } from "../../kernel/types";
import type { Pt, Ring } from "../geometry";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Klir } from "./klir";
import { Bunge } from "./bunge";
import { Mobus } from "./mobus";

export interface LensNodeProps {
  thing: Thing;
  /** Kernel verdict: this component has an external flow (∈ boundary_thing_ids). */
  isBoundary: boolean;
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
