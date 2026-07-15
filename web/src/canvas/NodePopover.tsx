// Per-lens node editing — the element inspector's popover form (harvest of the
// egui blind-pick's inspector organ, #5). Rename everywhere; the work-process
// row is Mobus-only and READ/EDIT (the rail's stamp is write-only by design —
// this is where a stamped primitive becomes editable/clearable). Every edit
// flows through onUpdateThing → App re-runs analyze_canvas in Rust; nothing
// here decides a systems fact. Work processes are Economy-side content — the
// row deliberately says "work process", not "agent" (Mobus ch. 10: agents are
// the decision ovals INSIDE process ovals; agent designation is future work).
import type { Lens, ProcessPrimitive, Thing } from "../kernel/types";
import type { Pt } from "./geometry";
import { InspectorRow as Row, InspectorTitle as Title } from "../ui";

const PRIMITIVES: ProcessPrimitive[] = [
  "Combining",
  "Splitting",
  "Buffering",
  "Impeding",
  "Propelling",
  "Copying",
  "Sensing",
  "Modulating",
  "Amplifying",
  "Inverting",
];

export function NodePopover({
  thing,
  lens,
  anchor,
  onUpdateThing,
  onClose,
}: {
  thing: Thing;
  lens: Lens;
  anchor: Pt;
  onUpdateThing: (t: Thing) => void;
  onClose: () => void;
}) {
  const isComponent = thing.role === "Component";
  return (
    <div
      className="absolute z-10 -translate-x-1/2 rounded-xl p-3"
      style={{
        left: anchor.x,
        top: anchor.y + 20,
        width: 230,
        background: "var(--bg-secondary)",
        border: "1px solid var(--lens-accent)",
        boxShadow: "var(--shadow-card-hover)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <Title>
        {lens === "Klir" ? "thing" : isComponent ? "component" : lens === "Mobus" ? "environment object" : "environment thing"}
        &nbsp;&ldquo;{thing.name || "unnamed"}&rdquo;
      </Title>
      <Row>
        <span style={{ color: "var(--text-secondary)" }}>name</span>
        <input
          value={thing.name}
          onChange={(e) => onUpdateThing({ ...thing, name: e.target.value })}
          className="w-28 rounded-md px-1.5 py-0.5 text-xs"
          style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
        />
      </Row>
      {lens === "Mobus" && isComponent && (
        <Row>
          <span style={{ color: "var(--text-secondary)" }}>work process</span>
          <select
            value={thing.primitive ?? ""}
            onChange={(e) => {
              const v = e.target.value as ProcessPrimitive | "";
              const next = { ...thing };
              if (v === "") delete next.primitive;
              else next.primitive = v;
              onUpdateThing(next);
            }}
            className="rounded-md px-1.5 py-0.5 text-xs"
            style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          >
            <option value="">none</option>
            {PRIMITIVES.map((p) => (
              <option key={p} value={p}>
                {p.toLowerCase()}
              </option>
            ))}
          </select>
        </Row>
      )}
      <div className="flex justify-end">
        <button onClick={onClose} className="rounded-full px-3 py-1 text-xs" style={{ color: "var(--text-muted)" }}>
          close
        </button>
      </div>
    </div>
  );
}
