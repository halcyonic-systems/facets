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
import { useState } from "react";
import type { CanvasModel, Manifest, Relation } from "./kernel/types";
import { declaredRelations, forcedByColumn, resolveParamRows } from "./kernel/params";
import { AmountField, ParamControl, useCommitOnRelease } from "./ParamControl";
import { Card } from "./ui";



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

/** Inputs card for Run mode. Renders nothing when the model declares no
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
  const declared = declaredRelations(model);
  const forcedBy = (r: Relation): string | undefined => forcedByColumn(manifest, r);

  // Declared params claim their relations away from the taxonomy fallback —
  // a magnitude appears once, under its domain name when it has one. The
  // resolution itself is shared with the canvas EdgePopover (kernel/params.ts),
  // so a param can never mean different flows on different surfaces.
  const paramRows = resolveParamRows(model);
  const covered = new Set<number>(
    paramRows.flatMap((row) => (row.relation ? [row.relation.id] : row.group!.map((r) => r.id))),
  );

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
          <ParamControl key={param.name} param={param} relation={relation} forcedBy={forcedBy(relation)} onEdit={onEdit} />
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
          {/* The box needed to say what it IS (design sweep 2026-08-15):
              these rows are not rates and mostly not knobs. */}
          <p className="mb-1 text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
            information entering from outside — a signal gates or informs a
            process rather than supplying quantity; one marked <em>ample</em>{" "}
            asserts availability and never binds.
          </p>
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
