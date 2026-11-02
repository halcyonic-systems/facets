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
import type { CanvasModel, EngineField, EngineKnob, Manifest, ParamDecl, Relation, Thing } from "./kernel/types";
import { declaredRelations, forcedByColumn, resolveParamRows } from "./kernel/params";
import {
  AmountField,
  ParamControl,
  RAIL_LABEL,
  RAIL_LOCK,
  RAIL_ROW,
  RAIL_VALUE,
  SetByAgent,
  sliderStep,
  snapToStep,
  useCommitOnRelease,
} from "./ParamControl";
import { Button, Card, Input } from "./ui";



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
    <div className={`${RAIL_ROW} py-0.5`}>
      <span className={RAIL_LABEL} style={{ color: "var(--text-primary)" }} title={relation.name}>
        {label}
      </span>
      <span className={RAIL_VALUE}>
      {forcedBy ? (
        <span
          className={RAIL_LOCK}
          style={{ color: "var(--text-muted)" }}
          title={`This flow is driven by the data column “${forcedBy}” — the series, not a scalar, is what runs.`}
        >
          driven by “{forcedBy}”
        </span>
      ) : relation.ample ? (
        <span
          className="shrink-0 text-[11px]"
          style={{ color: "var(--text-muted)" }}
          title="Declared ample (#9): availability never binds — there is no number to adjust."
        >
          ample
        </span>
      ) : (
        <AmountField
          relation={relation}
          onEdit={onEdit}
          placeholder={relation.amount == null ? "not set" : undefined}
        />
      )}
      <span className="w-16 min-w-0 shrink truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
        {relation.unit ?? ""}
      </span>
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
  setBy,
  onEdit,
}: {
  label: string;
  relation: Relation;
  rest: number;
  forcedBy?: string;
  /** The command-form agent writing this split each tick, if one does. */
  setBy?: string;
  onEdit: (next: Relation) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const w = Number(relation.amount ?? 0);
  const share = drag ?? (w + rest > 0 ? (w / (w + rest)) * 100 : 0);
  const commit = () => {
    if (drag !== null) {
      const s = Math.min(Math.max(drag, 0.5), 95) / 100;
      const next = (s * rest) / (1 - s);
      const snapped = Number(next.toPrecision(4));
      if (String(snapped) !== relation.amount) {
        onEdit({ ...relation, amount: String(snapped) });
      }
    }
    setDrag(null);
  };
  useCommitOnRelease(drag !== null, commit);
  return (
    <div className={`${RAIL_ROW} py-0.5`}>
      <span className={RAIL_LABEL} style={{ color: "var(--text-primary)" }} title={relation.name}>
        {label}
      </span>
      <span className={`${RAIL_VALUE} min-w-[10rem] flex-1`}>
      {forcedBy ? (
        <span className={`${RAIL_LOCK} flex-1 text-right`} style={{ color: "var(--text-muted)" }}>
          driven by “{forcedBy}”
        </span>
      ) : setBy ? (
        <span className="flex-1">
          <SetByAgent agent={setBy} />
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
  wrap = false,
}: {
  param: ParamDecl;
  thing: Thing;
  field: EngineField;
  onEdit: (next: Thing) => void;
  /** The Readouts rail's wrapping row (RAIL_ROW); the run card leaves it off. */
  wrap?: boolean;
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
      <div className={wrap ? RAIL_ROW : "flex items-center justify-between gap-2 text-xs"}>
        <span className={wrap ? RAIL_LABEL : "min-w-0 flex-1 truncate"} style={{ color: "var(--text-primary)" }} title={`${thing.name} · ${field}`}>
          {param.name}
        </span>
        <span className={wrap ? RAIL_VALUE : "contents"}>
        <Input
          className="w-24 text-right font-mono tabular"
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
        <span className="w-16 min-w-0 shrink truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
          {unit}
        </span>
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
    <div className={`${RAIL_ROW} py-0.5`}>
      <span className={RAIL_LABEL} style={{ color: "var(--text-primary)" }}>
        {label}
      </span>
      <span className={RAIL_VALUE}>
      <Input
        className="w-24 text-right font-mono tabular"
        value={draft ?? String(value)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setDraft(null);
        }}
        aria-label={label}
      />
      <span className="w-16 min-w-0 shrink truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
        {unit ?? ""}
      </span>
      </span>
    </div>
  );
}

/** A knob's edit, as the model change it makes (decision 2, 2026-11-02): a
 *  number declares the field, `null` withdraws the declaration so the field
 *  runs at its default again. The starting level is written with its stock
 *  unit (SL welds the two), so `unit` is required when the thing has none.
 *  Returns null when the edit cannot be made (a starting level with no unit
 *  anywhere, a non-positive number where SL takes only positive ones). */
export function applyKnob(thing: Thing, field: EngineKnob["field"], v: number | null, unit?: string): Thing | null {
  if (v !== null && !Number.isFinite(v)) return null;
  if (field === "initial_storage") {
    const { storage: _old, ...restState } = thing.initial_state ?? {};
    if (v === null) return { ...thing, initial_state: restState };
    if (v < 0) return null;
    const stock = thing.stock_unit || (unit ?? "").trim();
    if (!stock) return null;
    return { ...thing, stock_unit: stock, initial_state: { ...restState, storage: v } };
  }
  if (v !== null && v <= 0) return null;
  if (field === "gain") return { ...thing, agency_capacity: v ?? undefined };
  const { [field]: _old, ...rest } = thing.cognitive_params ?? {};
  return { ...thing, cognitive_params: v === null ? rest : { ...rest, [field]: v } };
}

function fmtDefault(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(4)));
}

/** One knob row: the declared value, or an empty field whose placeholder is
 *  the default the run uses. Typing a number declares it; clearing it goes
 *  back to the default. A starting level with no stock unit asks for one. */
function KnobRow({ knob, thing, onEdit }: { knob: EngineKnob; thing: Thing; onEdit: (next: Thing) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [unitDraft, setUnitDraft] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const needsUnit = knob.needs_unit === "";
  const shown = knob.declared && knob.value !== null ? String(knob.value) : "";
  const placeholder = knob.value === null ? "none" : `${fmtDefault(knob.value)} default`;
  const commit = (raw: string | null, unit: string) => {
    if (raw === null) return;
    const t = raw.trim();
    const v = t === "" ? null : Number(t);
    if (v === null && !knob.declared) {
      setDraft(null);
      return;
    }
    if (v !== null && knob.declared && v === knob.value) {
      setDraft(null);
      return;
    }
    const next = applyKnob(thing, knob.field, v, unit);
    if (next === null) {
      setHint(
        knob.field === "initial_storage" && v !== null && v >= 0
          ? "name the unit first (litres, people, …)"
          : knob.field === "initial_storage"
            ? "a starting level cannot be negative"
            : "a positive number, or empty for the default",
      );
      return;
    }
    setHint(null);
    setDraft(null);
    onEdit(next);
  };
  return (
    <div className={`${RAIL_ROW} py-0.5`} data-knob={knob.field}>
      <span
        className={RAIL_LABEL}
        style={{ color: "var(--text-primary)" }}
        title={knob.declared ? "Declared in the model" : "Not set: the run uses the default shown. Type a number to set it."}
      >
        {knob.word}
        {!knob.declared && (
          <span className="ml-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
            default
          </span>
        )}
      </span>
      <span className={RAIL_VALUE}>
        <Input
          className="w-24 text-right font-mono tabular"
          value={draft ?? shown}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft, unitDraft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setDraft(null);
              setHint(null);
            }
          }}
          aria-label={`${thing.name} ${knob.word}`}
        />
        {needsUnit ? (
          <Input
            className="w-16"
            value={unitDraft}
            placeholder="unit"
            onChange={(e) => setUnitDraft(e.target.value)}
            onBlur={() => draft !== null && commit(draft, unitDraft)}
            aria-label={`${thing.name} stock unit`}
          />
        ) : (
          <span className="w-16 min-w-0 shrink truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
            {knob.field === "initial_storage" || knob.field === "capacity" || knob.field === "release_rate" || knob.field === "maintenance"
              ? thing.stock_unit
              : ""}
          </span>
        )}
      </span>
      {hint && (
        <span className="block text-[11px]" style={{ color: "var(--verdict-warning)" }}>
          {hint}
        </span>
      )}
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
    <div className="mb-0.5 mt-2 text-[11px] font-semibold uppercase" style={{ letterSpacing: "var(--tracking-label)", color: "var(--text-muted)" }}>
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
  sourceIds,
  knobs,
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
  /** Kernel `source_thing_ids`. A canvas-drawn environment object has no
   *  authored word, so without this its flows were never listed as drivers.
   *  Absent = fall back to the authored `source`. */
  sourceIds?: number[];
  /** Kernel `engine_knobs`: every knob each component offers, declared or at
   *  its default (decision 2). Absent = the declared-only floor below. */
  knobs?: EngineKnob[];
}) {
  const thing = (id: number) => model.things.find((t) => t.id === id);
  const declared = declaredRelations(model);
  const forcedBy = (r: Relation): string | undefined => forcedByColumn(manifest, r);

  // Declared params claim their relations away from the taxonomy fallback —
  // a magnitude appears once, under its domain name when it has one. The
  // resolution itself is shared with the canvas EdgePopover (kernel/params.ts),
  // so a param can never mean different flows on different surfaces.
  const paramRows = resolveParamRows(model);
  // A knob a command-form agent drives (ADR 0008 D1) is shown locked under
  // the agent's name, as a data-driven flow is under its column: the
  // policy's series, not a scalar, is what runs.
  const setBy = new Map<string, string>();
  for (const t of model.things) {
    if (t.rule && t.manages_param) setBy.set(t.manages_param, t.name);
  }
  const covered = new Set<number>(
    paramRows.flatMap((row) => (row.relation ? [row.relation.id] : row.group ? row.group.map((r) => r.id) : [])),
  );

  const rest = declared.filter((r) => !covered.has(r.id));
  const sources = sourceIds ? new Set(sourceIds) : null;
  const fromSource = (r: Relation) => {
    const a = thing(r.a);
    return a?.role === "Environment" && (sources ? sources.has(a.id) : a.env_kind === "Source");
  };
  // A source's physical flow with no amount yet still runs, at the engine's
  // default, so it is listed too: an empty field that declares the amount
  // when a number is typed (2026-11-02 walk: a model drawn on the canvas
  // showed no way to set its rate). Ample flows have no number to set.
  const unset = model.relations.filter(
    (r) => r.is_bond && r.amount == null && !r.ample && !covered.has(r.id) && fromSource(r),
  );
  const drivers = [...rest, ...unset].filter((r) => fromSource(r) && r.kind !== "Informational");
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
        .map((t) => {
          const covered = fieldCovered.get(t.id) ?? new Set<string>();
          const kernelKnobs = (knobs ?? []).filter(
            (k) => k.thing === t.id && !covered.has(k.field === "gain" ? "param" : k.field),
          );
          // The kernel's knobs first; the declared-only floor keeps whatever
          // they do not cover (a parameter carried from a JSON bag).
          const offered = new Set<string>(kernelKnobs.map((k) => (k.field === "gain" ? "param" : k.field)));
          const rows = engineRows(t, covered, engineLabels).filter((r) => !offered.has(r.key));
          return { thing: t, knobs: kernelKnobs, rows };
        })
        .filter((g) => g.rows.length + g.knobs.length > 0)
    : [];
  // Walk row 13: when every flow in from outside is a signal, nothing
  // material enters and every stock stays empty. That is right by the rules
  // and baffling without a word, so the card says it.
  const inflows = model.relations.filter((r) => r.is_bond && fromSource(r));
  const signalOnly = inflows.length > 0 && inflows.every((r) => r.kind === "Informational");
  if (paramRows.length + drivers.length + signals.length + allocations.length + engineGroups.length === 0 && !signalOnly)
    return null;

  // Allocations group under their allocating process — the split they weight.
  const allocGroups = new Map<string, Relation[]>();
  for (const r of allocations) {
    const key = thing(r.a)?.name ?? "?";
    allocGroups.set(key, [...(allocGroups.get(key) ?? []), r]);
  }

  return (
    <Card title="Inputs" source="declared · edits re-run">
      {signalOnly && (
        <p className="mb-2 text-[11px] leading-snug" style={{ color: "var(--verdict-warning)" }} data-testid="signal-only">
          Nothing material enters the system: every flow in from outside is a signal (informational). A
          signal informs a process but carries no quantity, so the stocks stay empty. Make one of those flows
          matter or energy to feed the system.
        </p>
      )}
      {onReset && (
        <Button
          size={28}
          variant="quiet"
          icon="reset"
          onClick={onReset}
          className="mb-2"
          title="Restore every amount to what the model declares"
        >
          reset to declared
        </Button>
      )}
      {paramRows.map(({ param, relation, group, thing: fieldThing, field }) =>
        relation ? (
          <ParamControl
            key={param.name}
            param={param}
            relation={relation}
            forcedBy={forcedBy(relation)}
            setBy={setBy.get(param.name)}
            onEdit={onEdit}
            wrap
          />
        ) : fieldThing && field ? (
          onEditThing ? (
            <FieldControl key={param.name} param={param} thing={fieldThing} field={field} onEdit={onEditThing} wrap />
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
                setBy={setBy.get(param.name)}
                onEdit={onEdit}
              />
            ))}
          </div>
        ),
      )}
      {engineGroups.map(({ thing: t, rows, knobs: groupKnobs }) => (
        <div key={`engine-${t.id}`} data-testid={`engine-${t.name}`}>
          <GroupHeader>{`${t.name} · engine`}</GroupHeader>
          {groupKnobs.map((k) => (
            <KnobRow key={k.field} knob={k} thing={t} onEdit={(next) => onEditThing?.(next)} />
          ))}
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
              label={`${thing(r.a)?.name ?? "?"} · ${r.name || `to ${thing(r.b)?.name ?? "?"}`}`}
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
