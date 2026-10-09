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
import type { CanvasModel, EngineField, Manifest, ParamDecl, Relation, Thing } from "./kernel/types";
import { declaredRelations, forcedByColumn, resolveParamRows } from "./kernel/params";
import { AmountField, ParamControl, sliderStep, snapToStep, useCommitOnRelease } from "./ParamControl";
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

/** A field-anchored param (#343): a slider + number over one engine
 *  parameter the component line declared (release, capacity, time constant,
 *  setpoint, maintenance). Commits by editing the thing's own bag through the
 *  same document path as a flow amount; the app turns that into a session
 *  knob by the field's key. */
export function FieldControl({
  param,
  thing,
  field,
  onEdit,
}: {
  param: ParamDecl;
  thing: Thing;
  field: EngineField;
  onEdit: (next: Thing) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const current = Number(thing.cognitive_params?.[field] ?? 0);
  const min = Number(param.range?.min ?? 0);
  const max = Number(param.range?.max ?? 0);
  const step = sliderStep(min, max);
  const value = drag ?? current;
  const put = (v: number) => {
    if (Number.isFinite(v) && v >= 0 && v !== current) {
      onEdit({ ...thing, cognitive_params: { ...(thing.cognitive_params ?? {}), [field]: v } });
    }
  };
  const commit = () => {
    if (drag !== null) put(snapToStep(drag, step));
    setDrag(null);
  };
  useCommitOnRelease(drag !== null, commit);
  const unit = field === "capacity" || field === "maintenance" || field === "release_rate" ? thing.stock_unit ?? "" : "";
  return (
    <div className="py-0.5" data-testid={`field-param-${param.name}`}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="min-w-0 flex-1 truncate" style={{ color: "var(--text-primary)" }} title={`${thing.name} · ${field}`}>
          {param.name}
        </span>
        <input
          className="w-20 rounded border px-1.5 py-0.5 text-right font-mono text-xs"
          style={{ borderColor: "var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          value={draft ?? String(value)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== null && draft.trim() !== "") put(Number(draft));
            setDraft(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setDraft(null);
          }}
          aria-label={param.name}
        />
        <span className="w-16 shrink-0 text-[11px]" style={{ color: "var(--text-muted)" }}>
          {unit}
        </span>
      </div>
      {param.range && (
        <input
          type="range"
          className="mt-0.5 block w-full"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setDrag(Number(e.target.value))}
          onPointerUp={commit}
          onLostPointerCapture={commit}
          onBlur={commit}
          onKeyUp={commit}
          aria-label={`${param.name} slider`}
        />
      )}
    </div>
  );
}

/** The engine fields a component line can declare, in the order the
 *  sandbox inspector shows them. Keys are the session's own. */
const ENGINE_FIELDS: Array<[EngineField, string]> = [
  ["release_rate", "release"],
  ["capacity", "capacity"],
  ["time_constant", "time constant"],
  ["setpoint", "setpoint"],
  ["maintenance", "maintenance"],
];

/** One engine knob a component declares but no `param` line names (#463
 *  move 3, the floor): a number field over the thing's own value. Same
 *  commit as a field param — the thing's bag is edited and the app turns
 *  it into a session knob by key. */
function EngineRow({
  label,
  value,
  unit,
  onCommit,
}: {
  label: string;
  value: number;
  unit?: string;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft !== null && draft.trim() !== "") {
      const v = Number(draft);
      if (Number.isFinite(v) && v >= 0 && v !== value) onCommit(v);
    }
    setDraft(null);
  };
  return (
    <div className="flex items-center justify-between gap-2 py-0.5 text-xs">
      <span className="min-w-0 flex-1 truncate" style={{ color: "var(--text-primary)" }}>
        {label}
      </span>
      <input
        className="w-20 rounded border px-1.5 py-0.5 text-right font-mono text-xs"
        style={{ borderColor: "var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setDraft(null);
        }}
        aria-label={label}
      />
      <span className="w-16 shrink-0 text-[11px]" style={{ color: "var(--text-muted)" }}>
        {unit ?? ""}
      </span>
    </div>
  );
}

/** Every engine knob a component declares and no `param` line already
 *  names: the #112 fields in its bag, its primitive's own parameter
 *  (`agency_capacity`, labeled by the kernel's palette when the app passes
 *  it), and its initial stock. Declared values only — an undeclared field
 *  runs on the engine's default, which the document does not carry. */
export function engineRows(
  thing: Thing,
  covered: Set<string>,
  engineLabels?: Record<string, string>,
): Array<{ key: string; label: string; value: number; unit?: string; put: (v: number) => Thing }> {
  const rows: Array<{ key: string; label: string; value: number; unit?: string; put: (v: number) => Thing }> = [];
  if (thing.agency_capacity !== undefined && !covered.has("param")) {
    const label = (thing.primitive && engineLabels?.[thing.primitive]) || "parameter";
    rows.push({
      key: "param",
      label,
      value: thing.agency_capacity,
      put: (v) => ({ ...thing, agency_capacity: v }),
    });
  }
  const storage = thing.initial_state?.["storage"];
  if (typeof storage === "number" && !covered.has("initial_storage")) {
    rows.push({
      key: "initial_storage",
      label: "initial stock",
      value: storage,
      unit: thing.stock_unit,
      put: (v) => ({ ...thing, initial_state: { ...(thing.initial_state ?? {}), storage: v } }),
    });
  }
  for (const [key, label] of ENGINE_FIELDS) {
    const v = thing.cognitive_params?.[key];
    if (v === undefined || covered.has(key)) continue;
    rows.push({
      key,
      label,
      value: v,
      unit: key === "setpoint" || key === "time_constant" ? undefined : thing.stock_unit,
      put: (nv) => ({ ...thing, cognitive_params: { ...(thing.cognitive_params ?? {}), [key]: nv } }),
    });
  }
  return rows;
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
  onEditThing,
  engineLabels,
  onReset,
}: {
  model: CanvasModel;
  manifest: Manifest | null;
  onEdit: (next: Relation) => void;
  /** #343: a field-anchored param edits its component's own bag. */
  onEditThing?: (next: Thing) => void;
  /** The kernel palette's label for each primitive's own knob (kind → label). */
  engineLabels?: Record<string, string>;
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
    paramRows.flatMap((row) => (row.relation ? [row.relation.id] : row.group ? row.group.map((r) => r.id) : [])),
  );

  const rest = declared.filter((r) => !covered.has(r.id));
  const fromSource = (r: Relation) => {
    const a = thing(r.a);
    return a?.role === "Environment" && a.env_kind === "Source";
  };
  const drivers = rest.filter((r) => fromSource(r) && r.kind !== "Informational");
  const signals = rest.filter((r) => fromSource(r) && r.kind === "Informational");
  const allocations = rest.filter((r) => thing(r.a)?.role === "Component");
  // The floor for engine knobs: every field a component line declares and
  // no `param` names, grouped under the component.
  const fieldCovered = new Map<number, Set<string>>();
  for (const row of paramRows) {
    if (row.thing && row.field) {
      fieldCovered.set(row.thing.id, new Set([...(fieldCovered.get(row.thing.id) ?? []), row.field]));
    }
  }
  const engineGroups = onEditThing
    ? model.things
        .filter((t) => t.role === "Component" && !t.passway)
        .map((t) => ({ thing: t, rows: engineRows(t, fieldCovered.get(t.id) ?? new Set(), engineLabels) }))
        .filter((g) => g.rows.length > 0)
    : [];
  if (paramRows.length + drivers.length + signals.length + allocations.length + engineGroups.length === 0) return null;

  // Allocations group under their allocating process — the split they weight.
  const allocGroups = new Map<string, Relation[]>();
  for (const r of allocations) {
    const key = thing(r.a)?.name ?? "?";
    allocGroups.set(key, [...(allocGroups.get(key) ?? []), r]);
  }

  return (
    <Card title="Inputs" source="declared · edits re-run">
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
      {paramRows.map(({ param, relation, group, thing: fieldThing, field }) =>
        relation ? (
          <ParamControl key={param.name} param={param} relation={relation} forcedBy={forcedBy(relation)} onEdit={onEdit} />
        ) : fieldThing && field ? (
          onEditThing ? (
            <FieldControl key={param.name} param={param} thing={fieldThing} field={field} onEdit={onEditThing} />
          ) : null
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
      {engineGroups.map(({ thing: t, rows }) => (
        <div key={`engine-${t.id}`} data-testid={`engine-${t.name}`}>
          <GroupHeader>{`${t.name} · engine`}</GroupHeader>
          {rows.map((row) => (
            <EngineRow
              key={row.key}
              label={row.label}
              value={row.value}
              unit={row.unit}
              onCommit={(v) => onEditThing?.(row.put(v))}
            />
          ))}
        </div>
      ))}
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
