// The boundary inspector — authoring B's P = ⟨porosity, perceptive fuzziness⟩
// (Mobus only; opened by clicking the membrane or a port, which belong to B).
// An EDIT on an existing element, never a rail verb: the boundary itself stays
// kernel-computed; only its properties are authored (lens-palettes.md Q4).
// Writes flow through onUpdateBoundary → App → project() → the ring's dash
// density and edge blur re-render from the kernel's boundary_props.
import type { CanvasBoundaryProps } from "../kernel/types";
import type { Pt } from "./geometry";
import { InspectorRow as Row, InspectorTitle as Title, Popover } from "../ui";

export function BoundaryPopover({
  boundary,
  anchor,
  onUpdateBoundary,
  onClose,
}: {
  boundary: CanvasBoundaryProps;
  anchor: Pt;
  onUpdateBoundary: (b: CanvasBoundaryProps) => void;
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
    <Popover x={anchor.x} y={anchor.y} width={250} accent>
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
      <div className="flex justify-end">
        <button onClick={onClose} className="rounded-full px-3 py-1 text-xs" style={{ color: "var(--text-muted)" }}>
          close
        </button>
      </div>
    </Popover>
  );
}
