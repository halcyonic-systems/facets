// The interface inspector — opened by clicking a flow-carrying capsule on the
// membrane. "Port" is the code's word; the UI says INTERFACE, Mobus's own term
// (interfaces are boundary subsystems: Receivers of inputs, Exporters of
// outputs — ch. 3 ontology). Clicking a capsule used to open the BOUNDARY
// editor, which answers a different question than the reader asked
// (2026-08-09 field report); the boundary editor now belongs to the membrane
// stroke alone. Each crossing flow is listed and clicks through to the flow
// itself, so the capsule is the index of what passes there, not a dead end.
import type { CanvasModel, PortFact } from "../kernel/types";
import { KIND_COLOR } from "./types";
import type { Pt } from "./geometry";
import { InspectorRow as Row, InspectorTitle as Title, Popover } from "../ui";
import { thingById } from "./geometry";

export function InterfacePopover({
  port,
  model,
  anchor,
  onSelectRelation,
  onClose,
}: {
  port: PortFact;
  model: CanvasModel;
  anchor: Pt;
  onSelectRelation: (id: number) => void;
  onClose: () => void;
}) {
  const comp = thingById(model, port.component);
  const env = thingById(model, port.env);
  const flows = port.relation_ids
    .map((id) => model.relations.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => r != null);
  const directionCopy =
    port.direction === "Receives"
      ? "receives — flow enters here"
      : port.direction === "Exports"
        ? "exports — flow leaves here"
        : "receives and exports";

  return (
    <Popover x={anchor.x} y={anchor.y} width={280} accent>
      <Title>interface{comp ? ` — serves ${comp.name}` : ""}</Title>
      <Row>
        <span style={{ color: "var(--text-secondary)" }}>{directionCopy}</span>
        {env && (
          <span style={{ color: "var(--text-muted)" }} className="text-xs">
            ↔ {env.name}
          </span>
        )}
      </Row>
      <div className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {flows.length === 1 ? "crossing flow" : `${flows.length} crossing flows`}
      </div>
      {flows.map((r) => {
        const inbound = env && r.a === env.id;
        return (
          <button
            key={r.id}
            onClick={() => {
              onSelectRelation(r.id);
              onClose();
            }}
            className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-[var(--bg-secondary)]"
            title={`open this flow${inbound ? " (enters the system here)" : " (leaves the system here)"}`}
          >
            <span
              aria-hidden
              className="inline-block h-[3px] w-4 shrink-0 rounded-full"
              style={{ background: KIND_COLOR[r.kind] }}
            />
            <span className="min-w-0 flex-1 truncate" style={{ color: "var(--text-primary)" }}>
              {r.name || "(unnamed flow)"}
            </span>
            <span className="shrink-0" style={{ color: "var(--text-muted)" }}>
              {inbound ? "→ in" : "out →"}
            </span>
          </button>
        );
      })}
      <div className="flex justify-end">
        <button onClick={onClose} className="rounded-full px-3 py-1 text-xs" style={{ color: "var(--text-muted)" }}>
          close
        </button>
      </div>
    </Popover>
  );
}
