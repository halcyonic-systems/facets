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
// Declared parameters (walkthrough #18) render FIRST, in the model's own
// domain vocabulary — "Developer demand", not "drivers · absolute rates" —
// with sliders where the author declared a range, and fanouts presented as %
// shares. Normalization is presentation: a share drag edits exactly one raw
// weight (the one you touched); the other rows' %s shift only because Σw
// changed. The taxonomy groups below remain the floor for every undeclared
// magnitude, so declaring params is enrichment, never a requirement.
import { useEffect, useState } from "react";
import type { CanvasModel, Manifest, ParamDecl, Relation } from "./kernel/types";
import { Card } from "./ui";

/** While a slider drag preview is live, ANY pointer release commits it — the
 *  element's own events miss a release that lands outside it, and a missed
 *  commit leaves a phantom preview value on screen (several rows can then show
 *  impossible percentages at once, which is how this was caught). Re-registers
 *  every render so the handler always closes over the current drag value. */
function useCommitOnRelease(active: boolean, commit: () => void) {
  useEffect(() => {
    if (!active) return;
    window.addEventListener("pointerup", commit);
    return () => window.removeEventListener("pointerup", commit);
  });
}

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
      ) : relation.ample ? (
        <span
          className="shrink-0 text-[11px] italic"
          style={{ color: "var(--text-muted)" }}
          title="Declared ample (#9): availability never binds — there is no number to adjust."
        >
          ample
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

/** A range slider + number field over one flow-anchored param. The slider
 *  commits on release (not per-tick), routing through the same relation-update
 *  path as every other edit. */
function ParamSlider({
  param,
  relation,
  forcedBy,
  onEdit,
}: {
  param: ParamDecl;
  relation: Relation;
  forcedBy?: string;
  onEdit: (next: Relation) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const min = Number(param.range?.min ?? 0);
  const max = Number(param.range?.max ?? 0);
  const value = drag ?? Number(relation.amount ?? 0);
  const commit = () => {
    if (drag !== null && String(drag) !== relation.amount) {
      onEdit({ ...relation, amount: String(drag) });
    }
    setDrag(null);
  };
  useCommitOnRelease(drag !== null, commit);
  return (
    <div className="py-0.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="min-w-0 flex-1 truncate" style={{ color: "var(--text-primary)" }} title={relation.name}>
          {param.name}
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
      {!forcedBy && param.range && (
        <input
          type="range"
          className="mt-0.5 block w-full"
          min={min}
          max={max}
          step={(max - min) / 200 || 1}
          value={value}
          onChange={(e) => setDrag(Number(e.target.value))}
          onPointerUp={commit}
          onLostPointerCapture={commit}
          onBlur={commit}
          onKeyUp={commit}
          aria-label={param.name}
        />
      )}
    </div>
  );
}

/** One row of a % shares group. The slider position is this row's share of
 *  the group's raw-weight sum; releasing it edits ONLY this row's raw weight
 *  (solved so the released position is honored: w′ = s·rest/(1−s)). */
function ShareRow({
  label,
  relation,
  rest,
  forcedBy,
  onEdit,
}: {
  label: string;
  relation: Relation;
  rest: number;
  forcedBy?: string;
  onEdit: (next: Relation) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const w = Number(relation.amount ?? 0);
  const share = drag ?? (w + rest > 0 ? (w / (w + rest)) * 100 : 0);
  const commit = () => {
    if (drag !== null) {
      const s = Math.min(Math.max(drag, 0.5), 95) / 100;
      const next = (s * rest) / (1 - s);
      const rounded = Number(next.toPrecision(4));
      if (String(rounded) !== relation.amount) {
        onEdit({ ...relation, amount: String(rounded) });
      }
    }
    setDrag(null);
  };
  useCommitOnRelease(drag !== null, commit);
  return (
    <div className="flex items-center gap-2 py-0.5 text-xs">
      <span className="w-24 min-w-0 shrink-0 truncate" style={{ color: "var(--text-primary)" }} title={relation.name}>
        {label}
      </span>
      {forcedBy ? (
        <span className="flex-1 font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
          driven by “{forcedBy}”
        </span>
      ) : (
        <input
          type="range"
          className="min-w-0 flex-1"
          min={0}
          max={100}
          step={0.5}
          value={share}
          onChange={(e) => setDrag(Number(e.target.value))}
          onPointerUp={commit}
          onLostPointerCapture={commit}
          onBlur={commit}
          onKeyUp={commit}
          aria-label={`share of ${label}`}
        />
      )}
      <span className="w-12 shrink-0 text-right font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
        {share.toFixed(1)}%
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
  onReset,
}: {
  model: CanvasModel;
  manifest: Manifest | null;
  onEdit: (next: Relation) => void;
  /** Restore every declared amount to the model's own declaration (derived
   *  from the demo's `.sl`, never stored state). Absent = no reset baseline. */
  onReset?: () => void;
}) {
  const thing = (id: number) => model.things.find((t) => t.id === id);
  const declared = model.relations.filter((r) => r.is_bond && (r.amount != null || r.ample));
  const forcedBy = (r: Relation): string | undefined =>
    manifest?.mapping.find((m) => m.as === "flow" && m.force && m.element === r.name)?.column;

  // Declared params claim their relations away from the taxonomy fallback —
  // a magnitude appears once, under its domain name when it has one.
  const params = model.params ?? [];
  const covered = new Set<number>();
  const paramRows: { param: ParamDecl; relation?: Relation; group?: Relation[] }[] = [];
  for (const p of params) {
    const anchor = p.anchor;
    if ("Flow" in anchor) {
      const r = declared.find((r) => r.id === anchor.Flow.relation);
      if (!r) continue;
      covered.add(r.id);
      paramRows.push({ param: p, relation: r });
    } else {
      const group = declared.filter((r) => r.a === anchor.Shares.thing);
      if (group.length < 2) continue;
      for (const r of group) covered.add(r.id);
      paramRows.push({ param: p, group });
    }
  }

  const rest = declared.filter((r) => !covered.has(r.id));
  const fromSource = (r: Relation) => {
    const a = thing(r.a);
    return a?.role === "Environment" && a.env_kind === "Source";
  };
  const drivers = rest.filter((r) => fromSource(r) && r.kind !== "Informational");
  const signals = rest.filter((r) => fromSource(r) && r.kind === "Informational");
  const allocations = rest.filter((r) => thing(r.a)?.role === "Component");
  if (paramRows.length + drivers.length + signals.length + allocations.length === 0) return null;

  // Allocations group under their allocating process — the split they weight.
  const allocGroups = new Map<string, Relation[]>();
  for (const r of allocations) {
    const key = thing(r.a)?.name ?? "?";
    allocGroups.set(key, [...(allocGroups.get(key) ?? []), r]);
  }

  return (
    <Card title="Inputs" source="declared in the model · edits re-run">
      {onReset && (
        <button
          onClick={onReset}
          className="mb-1 text-[11px]"
          style={{ color: "var(--text-muted)" }}
          title="Restore every amount to what the model declares"
        >
          ↺ reset to declared
        </button>
      )}
      {paramRows.map(({ param, relation, group }) =>
        relation ? (
          <ParamSlider key={param.name} param={param} relation={relation} forcedBy={forcedBy(relation)} onEdit={onEdit} />
        ) : (
          <div key={param.name}>
            <GroupHeader>{`${param.name} · % of split`}</GroupHeader>
            {group!.map((r) => (
              <ShareRow
                key={r.id}
                label={thing(r.b)?.name ?? "?"}
                relation={r}
                rest={group!.filter((o) => o.id !== r.id).reduce((s, o) => s + Number(o.amount ?? 0), 0)}
                forcedBy={forcedBy(r)}
                onEdit={onEdit}
              />
            ))}
          </div>
        ),
      )}
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
