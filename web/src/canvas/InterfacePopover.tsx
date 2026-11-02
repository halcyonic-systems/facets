// The interface inspector — opened by clicking a flow-carrying capsule on the
// membrane. "Port" is the code's word; the UI says INTERFACE, Mobus's own term
// (interfaces are boundary subsystems: Receivers of inputs, Exporters of
// outputs — ch. 3 ontology). Clicking a capsule used to open the BOUNDARY
// editor, which answers a different question than the reader asked
// (2026-08-09 field report); the boundary editor now belongs to the membrane
// stroke alone. Each crossing flow is listed and clicks through to the flow
// itself, so the capsule is the index of what passes there, not a dead end.
import { useState } from "react";
import type { CanvasModel, PortFact, Thing } from "../kernel/types";
import { KIND_COLOR } from "./types";
import type { Pt } from "./geometry";
import { Input, InspectorRow as Row, InspectorTitle as Title, Select, ToolButton } from "../ui";
import { thingById } from "./geometry";
import { Icon } from "../icons";
import { PopoverDialog } from "./PopoverDialog";

export function InterfacePopover({
  port,
  model,
  anchor,
  onSelectRelation,
  onClose,
  onEditThing,
  onEditBehaviour,
}: {
  port: PortFact;
  model: CanvasModel;
  anchor: Pt;
  onSelectRelation: (id: number) => void;
  onClose: () => void;
  /** Writes the interface's own words (its protocol). Absent = read only. */
  onEditThing?: (next: Thing) => void;
  /** Writes what the door does in the run; re-runs when a run is showing. */
  onEditBehaviour?: (next: Thing) => void;
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
    <PopoverDialog x={anchor.x} y={anchor.y} width={280} label={`Interface${comp ? ` serving ${comp.name}` : ""}`} onClose={onClose}>
      <Title>interface{comp ? ` — serves ${comp.name}` : ""}</Title>
      <Row>
        <span style={{ color: "var(--text-secondary)" }}>{directionCopy}</span>
        {env && (
          <span style={{ color: "var(--text-muted)" }} className="flex items-center gap-1 text-xs">
            <Icon name="interface" size={16} title="across the membrane to" />
            {env.name}
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
            className="flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left text-xs hover:bg-[var(--bg-surface)]"
            title={`open this flow${inbound ? " (enters the system here)" : " (leaves the system here)"}`}
          >
            {/* The substance as its drawn mark in --kind-* (rule 9b), not a bar. */}
            <span className="flex shrink-0" style={{ color: KIND_COLOR[r.kind] }}>
              <Icon name={r.kind === "Unspecified" ? "flow" : (r.kind.toLowerCase() as "matter" | "energy" | "informational" | "field")} size={16} title={r.kind} />
            </span>
            <span className="min-w-0 flex-1 truncate" style={{ color: "var(--text-primary)" }}>
              {r.name || "(unnamed flow)"}
            </span>
            <span className="flex shrink-0 items-center gap-1" style={{ color: "var(--text-muted)" }}>
              {inbound ? (
                <>
                  <Icon name="forward" size={16} />
                  in
                </>
              ) : (
                <>
                  out
                  <Icon name="forward" size={16} />
                </>
              )}
            </span>
          </button>
        );
      })}
      {comp && comp.interface && onEditThing && (
        <DoorSettings thing={comp} onEditThing={onEditThing} onEditBehaviour={onEditBehaviour ?? onEditThing} />
      )}
      <div className="flex justify-end">
        <ToolButton onClick={onClose}>close</ToolButton>
      </div>
    </PopoverDialog>
  );
}

/** What a door is set to do (walk row 29, Shingai: set protocol rules where
 *  the interface is clicked). Two settings, kept apart because only one of
 *  them runs:
 *
 *  - **protocol**: the door's admission rule in the author's words (SL
 *    `protocol "…"`, #333, Mobus Listing 4.2). Prose the run never reads; the
 *    spec gives up per-element protocol logic for a checkable language.
 *  - **what it does here**: the run's side. A pass-way passes everything; a
 *    gate is the Modulating work process sited on the door (SL's merged form
 *    `component X primitive Modulating interface`), which passes everything
 *    until a message flow into it throttles it. Mobus ch. 4: an interface
 *    passes, gates or filters. Resisting (Impeding) is left out until its
 *    share has an SL word (walk row 18): offered now, it would lose half of
 *    what passes with no way to set or save the half.
 *
 *  A door that already runs another work process (a process sited on the
 *  membrane) is not reset from here; the line says what it runs. */
export function DoorSettings({
  thing,
  onEditThing,
  onEditBehaviour,
}: {
  thing: Thing;
  onEditThing: (next: Thing) => void;
  onEditBehaviour: (next: Thing) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const next = draft.trim();
    if (next !== (thing.protocol ?? "")) onEditThing({ ...thing, protocol: next });
    setDraft(null);
  };
  const behaviour = thing.passway && !thing.primitive ? "pass" : thing.primitive === "Modulating" ? "gate" : null;
  const other = behaviour === null && !thing.rule;
  return (
    <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--hairline)" }} data-testid="door-settings">
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        at this door
      </div>
      {behaviour !== null ? (
        <>
          <Row>
            <span style={{ color: "var(--text-secondary)" }}>what it does</span>
            <Select
              className="text-xs"
              value={behaviour}
              onChange={(e) => {
                const v = e.target.value;
                if (v === behaviour) return;
                if (v === "pass") {
                  const { primitive: _p, ...rest } = thing;
                  onEditBehaviour({ ...(rest as Thing), passway: true });
                } else {
                  onEditBehaviour({ ...thing, passway: false, primitive: "Modulating" });
                }
              }}
              data-testid="door-behaviour"
              aria-label={`what ${thing.name} does`}
            >
              <option value="pass">passes everything</option>
              <option value="gate">gates it</option>
            </Select>
          </Row>
          <p className="text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
            {behaviour === "pass"
              ? "Everything that arrives goes through, unchanged."
              : "Passes everything until a message flow into it closes the gate: draw one from a sensor or an agent. Edits re-run."}
          </p>
        </>
      ) : other && thing.primitive ? (
        <p className="text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
          {`It runs as ${thing.primitive}, a work process on the membrane; change that by clicking it.`}
        </p>
      ) : null}
      <label className="mt-1 block text-xs" style={{ color: "var(--text-secondary)" }}>
        protocol
        <Input
          className="mt-0.5 w-full text-xs"
          value={draft ?? thing.protocol ?? ""}
          placeholder="what this door admits, in your words"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setDraft(null);
          }}
          data-testid="door-protocol"
          aria-label={`protocol of ${thing.name}`}
        />
      </label>
      <p className="text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
        Written into the SL as the door's rule. The run does not read these words; what it does, above, is what runs.
      </p>
    </div>
  );
}

