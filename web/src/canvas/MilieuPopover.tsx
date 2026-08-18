// The milieu inspector — reading M in E = ⟨O, M⟩ (the lifecycle-paper
// revision). READ-ONLY by doctrine: milieu variables are authored in SL, and
// their values are snapshots of ambient conditions, not dynamical inputs —
// the paper marks the coupling of M to the running system an open research
// area, and this panel says so rather than faking an affordance.
import type { MilieuVar } from "../kernel/types";
import type { Pt } from "./geometry";
import { InspectorRow as Row, InspectorTitle as Title, Popover } from "../ui";

export function MilieuPopover({
  milieu,
  anchor,
  onClose,
}: {
  milieu: MilieuVar[];
  anchor: Pt;
  onClose: () => void;
}) {
  return (
    <Popover x={anchor.x} y={anchor.y} width={280} accent>
      <Title>milieu — M in E = ⟨O, M⟩</Title>
      {milieu.map((m) => (
        <div key={m.name} className="mb-1">
          <Row>
            <span style={{ color: "var(--text-primary)" }}>{m.name}</span>
            <span className="tabular" style={{ color: "var(--text-secondary)" }}>
              {m.value != null ? `${m.value}${m.unit ? ` ${m.unit}` : ""}` : "declared, no value"}
            </span>
          </Row>
          {m.description && (
            <div className="px-1 text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
              {m.description}
            </div>
          )}
        </div>
      ))}
      <div
        className="mt-2 border-t pt-1.5 text-[10px] leading-snug"
        style={{ borderColor: "var(--hairline)", color: "var(--text-muted)" }}
      >
        Ambient conditions that bathe the system — no point source, no
        interface, no flows. Declared, not dynamically coupled: how the bath
        influences the running system is the paper's open research area.
        Authored in SL: <code>milieu &lt;name&gt; value &lt;n&gt; unit &lt;u&gt;</code>
      </div>
      <div className="flex justify-end">
        <button onClick={onClose} className="rounded-full px-3 py-1 text-xs" style={{ color: "var(--text-muted)" }}>
          close
        </button>
      </div>
    </Popover>
  );
}
