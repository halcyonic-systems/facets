// The boundary inspector — authoring B's P = ⟨porosity, perceptive fuzziness⟩,
// with a door to the milieu M that bathes it (2026-11-02)
// (Mobus only; opened by clicking the membrane or a port, which belong to B).
// An EDIT on an existing element, never a rail verb: the boundary itself stays
// kernel-computed; only its properties are authored (lens-palettes.md Q4).
// Writes flow through onUpdateBoundary → App → project() → the ring's dash
// density and edge blur re-render from the kernel's boundary_props.
import type { CanvasBoundaryProps } from "../kernel/types";
import type { Pt } from "./geometry";
import { InspectorRow as Row, InspectorTitle as Title, ToolButton } from "../ui";
import { PopoverDialog } from "./PopoverDialog";

export function BoundaryPopover({
  boundary,
  anchor,
  onUpdateBoundary,
  milieuCount,
  onOpenMilieu,
  onClose,
}: {
  boundary: CanvasBoundaryProps;
  anchor: Pt;
  onUpdateBoundary: (b: CanvasBoundaryProps) => void;
  /** How many milieu variables the system declares; absent, no milieu row
   *  (a lens that does not draw M). */
  milieuCount?: number;
  /** The door to M from B (2026-11-02): the membrane is where the system
   *  meets its bath, so the bath is one click from it. */
  onOpenMilieu?: () => void;
  onClose: () => void;
}) {
  const range = (
    label: string,
    value: number,
    set: (v: number) => void,
    title: string,
  ) => (
    <Row>
      <span title={title} style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={value}
          onChange={(e) => set(parseFloat(e.target.value))}
          className="w-24"
          style={{ accentColor: "var(--lens-accent)" }}
        />
        <span className="tabular w-8 text-right" style={{ color: "var(--text-primary)" }}>
          {value.toFixed(2)}
        </span>
      </span>
    </Row>
  );

  // Shared viewport-clamped Popover (walkthrough #16 family): same primitive
  // as the edge editor, so a membrane click near the fold stays reachable.
  return (
    <PopoverDialog x={anchor.x} y={anchor.y} width={250} label="Edit the boundary: porosity and fuzziness" onClose={onClose}>
      <Title>boundary — P = ⟨porosity, fuzziness⟩</Title>
      {range(
        "porosity",
        boundary.porosity,
        (v) => onUpdateBoundary({ ...boundary, porosity: v }),
        "0 = solid membrane → 1 = fully permeable; renders as dash density",
      )}
      {range(
        "fuzziness",
        boundary.perceptive_fuzziness,
        (v) => onUpdateBoundary({ ...boundary, perceptive_fuzziness: v }),
        "perceptive fuzziness: 0 = crisp → 1 = fuzzy; renders as edge blur",
      )}
      {milieuCount !== undefined && onOpenMilieu && (
        <Row>
          <span
            title="Ambient conditions that bathe the system: M in E = ⟨O, M⟩"
            style={{ color: "var(--text-secondary)" }}
          >
            milieu
          </span>
          <ToolButton onClick={onOpenMilieu} title="Read and edit the ambient conditions around this system">
            {milieuCount === 0 ? "add" : `${milieuCount} variable${milieuCount === 1 ? "" : "s"}`}
          </ToolButton>
        </Row>
      )}
      <div className="flex justify-end">
        <ToolButton onClick={onClose}>close</ToolButton>
      </div>
    </PopoverDialog>
  );
}
