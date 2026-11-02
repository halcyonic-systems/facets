// The milieu — M in E = ⟨O, M⟩ (the lifecycle-paper revision): ambient
// conditions that bathe the system. Since 2026-11-02 it is authored here as
// well as in SL (Shingai: the boundary opened, the milieu could not be reached
// at all). The variables cross the canvas seam verbatim (`project` writes
// them back, `emit_sl` prints `milieu <name> value <n> unit <u>`), so an edit
// here is an edit to the model's text. What does not change: a milieu value
// is a declared snapshot, not a dynamical input; the paper leaves coupling M
// to the running system open, and this panel still says so.
import type { MilieuVar } from "../kernel/types";
import type { Pt } from "./geometry";
import { Input, InspectorTitle as Title, ToolButton } from "../ui";
import { PopoverDialog } from "./PopoverDialog";

/** A fresh variable's name: "variable", then "variable 2", … — never a
 *  duplicate, which the SL parser refuses. */
export function freshMilieuName(milieu: MilieuVar[]): string {
  const taken = new Set(milieu.map((m) => m.name));
  if (!taken.has("variable")) return "variable";
  let n = 2;
  while (taken.has(`variable ${n}`)) n++;
  return `variable ${n}`;
}

export function MilieuPopover({
  milieu,
  anchor,
  onUpdateMilieu,
  onClose,
}: {
  milieu: MilieuVar[];
  anchor: Pt;
  /** Absent, the panel reads only (a register or a walked view that cannot
   *  write the model). */
  onUpdateMilieu?: (next: MilieuVar[]) => void;
  onClose: () => void;
}) {
  const set = (i: number, patch: Partial<MilieuVar>) =>
    onUpdateMilieu?.(milieu.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  return (
    <PopoverDialog x={anchor.x} y={anchor.y} width={320} label="The milieu: ambient variables" onClose={onClose}>
      <Title>milieu — M in E = ⟨O, M⟩</Title>
      {milieu.length === 0 && (
        <p className="mb-2 text-xs leading-snug" style={{ color: "var(--text-secondary)" }}>
          No ambient conditions declared yet.
        </p>
      )}
      {milieu.map((m, i) =>
        onUpdateMilieu ? (
          <div key={i} className="mb-2 flex items-center gap-1.5" data-milieu-row>
            <Input
              aria-label="variable name"
              value={m.name}
              onChange={(e) => set(i, { name: e.target.value })}
              className="min-w-0 flex-1"
            />
            <Input
              aria-label="value"
              type="number"
              value={m.value ?? ""}
              placeholder="value"
              onChange={(e) => set(i, { value: e.target.value === "" ? undefined : Number(e.target.value) })}
              className="w-20 tabular"
            />
            <Input
              aria-label="unit"
              value={m.unit ?? ""}
              placeholder="unit"
              onChange={(e) => set(i, { unit: e.target.value || undefined })}
              className="w-12"
            />
            <ToolButton
              icon="delete"
              aria-label={`remove ${m.name || "this variable"}`}
              title="Remove this variable"
              onClick={() => onUpdateMilieu(milieu.filter((_, j) => j !== i))}
            />
          </div>
        ) : (
          <div key={i} className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span style={{ color: "var(--text-primary)" }}>{m.name}</span>
            <span className="tabular" style={{ color: "var(--text-secondary)" }}>
              {m.value != null ? `${m.value}${m.unit ? ` ${m.unit}` : ""}` : "declared, no value"}
            </span>
          </div>
        ),
      )}
      {onUpdateMilieu && (
        <div className="mb-2">
          <ToolButton
            icon="plus"
            onClick={() => onUpdateMilieu([...milieu, { name: freshMilieuName(milieu) }])}
          >
            add a variable
          </ToolButton>
        </div>
      )}
      <div
        className="mt-2 border-t pt-1.5 text-[11px] leading-snug"
        style={{ borderColor: "var(--hairline)", color: "var(--text-muted)" }}
      >
        Ambient conditions that bathe the system, such as temperature, pH, or
        a policy climate: no source, no interface, no flows. Declared, not
        coupled to the run; how the bath acts on the system is the paper's open
        question.
      </div>
      <div className="flex justify-end">
        <ToolButton onClick={onClose}>close</ToolButton>
      </div>
    </PopoverDialog>
  );
}
