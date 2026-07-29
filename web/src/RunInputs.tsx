// The run-inputs card (walkthrough #11) — every declared magnitude in the
// model, grouped by the role the kernel itself assigns, each editable with an
// immediate re-run through the canvas-is-the-document seam (ADR
// run-seam-canvas-document). Generated entirely from the canvas model +
// manifest, so it works for any model, not one. No systems fact is decided
// here: classification reads the things' kernel roles; editing routes through
// the same relation-update path as the edge editor.
//
// The taxonomy, in the kernel's own terms:
// - DRIVERS: physical flows out of Source env things — absolute rates. A
//   driver forced by a data column is labeled so and locked (the series, not
//   the scalar, is the truth of a forced run).
// - ALLOCATIONS: process-outflow amounts — RELATIVE weights for the fanout
//   split (Mobus Eq. 4.5), grouped under their allocating process.
// - SIGNALS: informational flows out of Source env things (e.g. llm-market's
//   ample released-weights signals).
import { useState } from "react";
import type { CanvasModel, Manifest, Relation } from "./kernel/types";
import { Card } from "./ui";

function AmountField({
  relation,
  onEdit,
}: {
  relation: Relation;
  onEdit: (next: Relation) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const v = Number(draft);
    if (Number.isFinite(v) && v >= 0 && draft.trim() !== "" && String(v) !== relation.amount) {
      onEdit({ ...relation, amount: String(v) });
    }
    setDraft(null);
  };
  return (
    <input
      className="w-20 rounded border px-1.5 py-0.5 text-right font-mono text-xs"
      style={{ borderColor: "var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
      value={draft ?? relation.amount ?? ""}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(null);
      }}
      aria-label={`amount of ${relation.name}`}
    />
  );
}

function InputRow({
  label,
  relation,
  forcedBy,
  onEdit,
}: {
  label: string;
  relation: Relation;
  forcedBy?: string;
  onEdit: (next: Relation) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5 text-xs">
      <span className="min-w-0 flex-1 truncate" style={{ color: "var(--text-primary)" }} title={relation.name}>
        {label}
      </span>
      {forcedBy ? (
        <span
          className="shrink-0 font-mono text-[11px]"
          style={{ color: "var(--text-muted)" }}
          title={`This flow is driven by the data column “${forcedBy}” — the series, not a scalar, is what runs.`}
        >
          driven by “{forcedBy}”
        </span>
      ) : (
        <AmountField relation={relation} onEdit={onEdit} />
      )}
      <span className="w-16 shrink-0 text-[11px]" style={{ color: "var(--text-muted)" }}>
        {relation.unit ?? ""}
      </span>
    </div>
  );
}

function GroupHeader({ children }: { children: string }) {
  return (
    <div className="mb-0.5 mt-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
      {children}
    </div>
  );
}

/** Inputs card for the RUN tab. Renders nothing when the model declares no
 *  magnitudes (nothing to adjust is a fact, not an empty box). */
export function RunInputs({
  model,
  manifest,
  onEdit,
}: {
  model: CanvasModel;
  manifest: Manifest | null;
  onEdit: (next: Relation) => void;
}) {
  const thing = (id: number) => model.things.find((t) => t.id === id);
  const declared = model.relations.filter((r) => r.is_bond && r.amount != null);
  const forcedBy = (r: Relation): string | undefined =>
    manifest?.mapping.find((m) => m.as === "flow" && m.force && m.element === r.name)?.column;

  const fromSource = (r: Relation) => {
    const a = thing(r.a);
    return a?.role === "Environment" && a.env_kind === "Source";
  };
  const drivers = declared.filter((r) => fromSource(r) && r.kind !== "Informational");
  const signals = declared.filter((r) => fromSource(r) && r.kind === "Informational");
  const allocations = declared.filter((r) => thing(r.a)?.role === "Component");
  if (drivers.length + signals.length + allocations.length === 0) return null;

  // Allocations group under their allocating process — the split they weight.
  const allocGroups = new Map<string, Relation[]>();
  for (const r of allocations) {
    const key = thing(r.a)?.name ?? "?";
    allocGroups.set(key, [...(allocGroups.get(key) ?? []), r]);
  }

  return (
    <Card title="Inputs" source="declared in the model · edits re-run">
      {drivers.length > 0 && (
        <>
          <GroupHeader>drivers · absolute rates</GroupHeader>
          {drivers.map((r) => (
            <InputRow
              key={r.id}
              label={`${thing(r.a)?.name ?? "?"} · ${r.name}`}
              relation={r}
              forcedBy={forcedBy(r)}
              onEdit={onEdit}
            />
          ))}
        </>
      )}
      {[...allocGroups.entries()].map(([group, rows]) => (
        <div key={group}>
          <GroupHeader>{`${group} · relative weights`}</GroupHeader>
          {rows.map((r) => (
            <InputRow key={r.id} label={thing(r.b)?.name ?? "?"} relation={r} forcedBy={forcedBy(r)} onEdit={onEdit} />
          ))}
        </div>
      ))}
      {signals.length > 0 && (
        <>
          <GroupHeader>signals · informational</GroupHeader>
          {signals.map((r) => (
            <InputRow
              key={r.id}
              label={`${thing(r.a)?.name ?? "?"} → ${thing(r.b)?.name ?? "?"}`}
              relation={r}
              forcedBy={forcedBy(r)}
              onEdit={onEdit}
            />
          ))}
        </>
      )}
    </Card>
  );
}
