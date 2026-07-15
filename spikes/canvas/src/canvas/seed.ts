import type { CanvasModel } from "../kernel/types";

// The brief's seed model: a rainfall → reservoir → turbine → grid chain, on
// screen at start so the lens toggle has something to accrete over.
export const SEED_MODEL: CanvasModel = {
  lens: "Mobus",
  things: [
    { id: 1, name: "Rainfall", x: 140, y: 240, role: "Environment" },
    { id: 2, name: "Reservoir", x: 360, y: 240, role: "Component", primitive: "Buffering" },
    { id: 3, name: "Turbine", x: 580, y: 240, role: "Component", primitive: "Modulating" },
    { id: 4, name: "Grid", x: 800, y: 240, role: "Environment" },
  ],
  relations: [
    { id: 10, a: 1, b: 2, name: "inflow", is_bond: true, kind: "Matter" },
    { id: 11, a: 2, b: 3, name: "draw", is_bond: true, kind: "Matter" },
    { id: 12, a: 3, b: 4, name: "output", is_bond: true, kind: "Energy" },
  ],
};
