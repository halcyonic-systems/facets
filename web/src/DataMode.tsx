// Measurements — the sheet that shows an attached series against the model's
// declared flows (#304 milestone 1, ratified 2026-08-09; named "Data mode" and
// framed as the Klir data-level face until the 2026-10-26 cut, when #304 was
// parked and the sheet kept under a plain name). Styled as the sheet a billion
// people already know.
// Rows are the support (time), columns are DECLARED flows; the binding is by
// declaration, never invention: a column that names no declared flow is shown
// BROKEN, a flow with no column sits in the unbound rail, and nothing is
// aggregated or induced here beyond the status-bar count/mean of the column
// under the cursor. Read-only by design — sort and selection are view state.
import { useMemo, useState, type CSSProperties } from "react";
import type { CanvasModel, ColumnMapping, Manifest } from "./kernel/types";
import { parseCsv } from "./kernel";
import { KIND_COLOR } from "./canvas/types";
import { Button, Input, Pill, Select, ToolButton } from "./ui";
import { Icon } from "./icons";

const ROW_CAP = 200;

interface BoundColumn {
  mapping: ColumnMapping;
  /** The declared flow this column IS — null = broken binding (names no flow). */
  relation: CanvasModel["relations"][number] | null;
  csvIndex: number;
}

type SortState = { col: number; dir: "asc" | "desc" } | null;

/** Numeric-aware compare so "477.8" sorts under "536.2", dates lexically. */
function cellCompare(a: string, b: string): number {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}

const HAIRLINE = "1px solid var(--hairline)";

/**
 * The mapping one binding choice writes (#535 item 1). A flow column carries
 * the COLUMN's declared unit: the unit already on its mapping (a bundle's
 * manifest says what its column measures, e.g. a routed-share `weight`) wins
 * over the bound flow's `unit` clause, which is only the default for a column
 * nothing has declared. Inheriting the flow's unit unconditionally made a
 * weight column bound to a Router outwire read as Gtok/day, and the overlay
 * compared unlike units (found in #530). A unitless flow and an undeclared
 * column yield a unitless mapping, and Run refuses with the kernel's T2 reason.
 */
export function bindingEntry(
  column: string,
  value: string,
  model: CanvasModel,
  prior?: ColumnMapping,
): ColumnMapping | null {
  if (value === "time") return { column, as: "time" };
  if (value.startsWith("stock:")) {
    // A stock-level column: its t0 observation supplies the component's
    // initial storage (the tether's carry layer — a MEASURED initial
    // condition, not a declared one). Values are prefixed so a component
    // and a flow sharing a name cannot collide in one dropdown.
    return { column, as: "stock", element: value.slice("stock:".length) };
  }
  // An explicit ignore is written, not dropped: the kernel refuses a run
  // whose CSV has a column the manifest does not speak for, and the dropdown
  // already shows the author the word "ignore" (feel-test 2026-10-26).
  if (value === "ignore") return { column, as: "ignore" };
  const declared = prior?.as === "flow" ? prior.unit : undefined;
  // Two flows may share a name (a pass-way's inner and outer legs); the unit
  // is whichever of them declares one (feel-test 2026-10-26: the first hit
  // was the unitless leg and the kernel refused the run).
  const unit =
    declared ??
    model.relations
      .filter((r) => r.name === value)
      .map((r) => r.unit)
      .find((u) => !!u);
  return { column, as: "flow", element: value, force: true, ...(unit ? { unit } : {}) };
}

/** Column names that read as the support (time axis) when nothing declares it. */
const TIME_NAMES = new Set(["time", "t", "date"]);

/**
 * The bindings Data mode PROPOSES for an attached CSV (#535 item 2, #339): a
 * column whose name matches exactly one declared flow, or one Buffering
 * component (as a stock level), case-insensitively, proposes that binding;
 * a `time`/`t`/`date` column proposes the support when no column holds it.
 * Binding stays by declaration, never invention: a column already bound, a
 * column matching nothing, and a column matching more than one target
 * propose nothing. A proposal is the dropdown value `bindingEntry` takes,
 * and nothing is written until the author confirms it.
 */
export function proposeBindings(
  headers: string[],
  model: CanvasModel,
  mapping: ColumnMapping[] = [],
): Map<string, string> {
  const key = (s: string) => s.trim().toLowerCase();
  const targets = new Map<string, string[]>();
  const offer = (name: string | undefined, value: string) => {
    if (!name) return;
    const k = key(name);
    targets.set(k, [...(targets.get(k) ?? []), value]);
  };
  for (const r of model.relations) offer(r.name, r.name!);
  for (const th of model.things) {
    if (th.role === "Component" && th.primitive === "Buffering") offer(th.name, `stock:${th.name}`);
  }
  const bound = new Set(mapping.filter((m) => m.as !== "ignore").map((m) => m.column));
  const boundElements = new Set(
    mapping.filter((m) => m.as === "flow" || m.as === "stock").map((m) => m.element),
  );
  let timeHeld = mapping.some((m) => m.as === "time");
  const proposals = new Map<string, string>();
  for (const h of headers) {
    if (bound.has(h)) continue;
    const hits = targets.get(key(h)) ?? [];
    if (hits.length === 1) {
      const element = hits[0].startsWith("stock:") ? hits[0].slice("stock:".length) : hits[0];
      if (!boundElements.has(element)) proposals.set(h, hits[0]);
    } else if (hits.length === 0 && !timeHeld && TIME_NAMES.has(key(h))) {
      proposals.set(h, "time");
      timeHeld = true;
    }
  }
  return proposals;
}

export function DataMode({
  model,
  modelName,
  csv,
  manifest,
  onAttachCsv,
  onManifestChange,
}: {
  model: CanvasModel;
  modelName: string;
  csv: string | null;
  manifest: Manifest | null;
  /** #304 M2 slice 1: the Data tab acquires data — a CSV attached to the open
   *  model without a demo bundle. Absent = read-only presentation contexts. */
  onAttachCsv?: (text: string) => void;
  /** Binding moves into the table: role/target edits write the manifest. */
  onManifestChange?: (m: Manifest) => void;
}) {
  const parsed = useMemo(() => (csv ? parseCsv(csv) : null), [csv]);

  // View state only — the sheet is read-only. col 0 = the time column,
  // col i+1 = the i-th bound flow column.
  const [sort, setSort] = useState<SortState>(null);
  // #309: two readings of one data system — the observations (rows over the
  // support) and the observed states (distinct combinations of the basic
  // variables, with frequencies). Both are reading, not inference: counting
  // asserts nothing. Collapsing the support away is the first gesture toward
  // support-invariance — the climb toward the generative rung starts here,
  // but this view does not take it.
  const [dataView, setDataView] = useState<"observations" | "states">("observations");
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);

  const thingName = (id: number) => model.things.find((t) => t.id === id)?.name ?? "?";

  const flowMappings = (manifest?.mapping ?? []).filter((m) => m.as === "flow");
  const timeMapping = (manifest?.mapping ?? []).find((m) => m.as === "time");
  const otherMappings = (manifest?.mapping ?? []).filter(
    (m) => m.as !== "flow" && m.as !== "time" && m.as !== "ignore",
  );

  const columns: BoundColumn[] = flowMappings.map((m) => ({
    mapping: m,
    // M1 is name-keyed (ratified fork 3) — the fragility is SHOWN, not hidden:
    // a rename breaks the binding visibly instead of silently dropping data.
    relation: model.relations.find((r) => r.name === m.element) ?? null,
    csvIndex: parsed ? parsed.headers.indexOf(m.column) : -1,
  }));

  const boundNames = new Set(flowMappings.map((m) => m.element));
  const unbound = model.relations.filter((r) => r.name && !boundNames.has(r.name));

  const timeIndex = parsed && timeMapping ? parsed.headers.indexOf(timeMapping.column) : -1;

  // #309: a data-first entry has variables (things) and no bound flows — its
  // columns ARE the variables, matched to headers by name (the same name-keyed
  // contract as flow binding: a rename loses the column visibly, never silently).
  const variableCols = useMemo(() => {
    if (!parsed || flowMappings.length > 0) return [];
    return model.things
      .map((t) => ({ thing: t, csvIndex: parsed.headers.indexOf(t.name) }))
      .filter((v) => v.csvIndex >= 0 && v.csvIndex !== timeIndex);
    // flowMappings/timeIndex derive from manifest + parsed, both listed.
  }, [parsed, manifest, model.things, timeIndex]);

  // The observed states: one entry per distinct combination of the variable
  // columns' values, counted over ALL observations, most frequent first.
  const observedStates = useMemo(() => {
    if (!parsed || variableCols.length === 0) return null;
    const idxs = variableCols.map((v) => v.csvIndex);
    const seen = new Map<string, { vals: string[]; n: number }>();
    for (const row of parsed.rows) {
      const vals = idxs.map((i) => row[i] ?? "");
      const key = vals.join("\u0000");
      const entry = seen.get(key);
      if (entry) entry.n += 1;
      else seen.set(key, { vals, n: 1 });
    }
    return [...seen.values()].sort((a, b) => b.n - a.n);
  }, [parsed, variableCols]);

  /** CSV index a grid column reads from; -1 means row index / missing. */
  const csvIndexOf = (col: number) => (col === 0 ? timeIndex : columns[col - 1]?.csvIndex ?? -1);

  const sortedAll = useMemo(() => {
    if (!parsed) return [] as string[][];
    const all = parsed.rows;
    if (!sort) return all;
    const idx = sort.col === 0 ? timeIndex : columns[sort.col - 1]?.csvIndex ?? -1;
    if (idx < 0 && sort.col !== 0) return all;
    const sign = sort.dir === "asc" ? 1 : -1;
    const decorated = all.map((row, i) => ({ row, i }));
    decorated.sort((x, y) => {
      const c = idx < 0 ? x.i - y.i : cellCompare(x.row[idx], y.row[idx]);
      return sign * (c || x.i - y.i);
    });
    return decorated.map((d) => d.row);
    // columns is rebuilt each render, but its csvIndex values derive from
    // parsed + manifest, both listed here.
  }, [parsed, sort, timeIndex, manifest]);

  // The console graft: past the cap, elide the middle (head … tail) instead of
  // truncating the tail — the last observations are usually the live ones.
  const HEAD = ROW_CAP - 20;
  const elided = sortedAll.length > ROW_CAP;
  const sortedRows = elided ? sortedAll.slice(0, HEAD) : sortedAll;
  const tailRows = elided ? sortedAll.slice(-20) : [];
  const hiddenCount = elided ? sortedAll.length - HEAD - 20 : 0;

  const clickHeader = (col: number) =>
    setSort((s) =>
      s && s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" },
    );

  // Status-bar stats for the selected (else hovered) column, over ALL rows —
  // count and mean of the numeric cells, computed client-side, asserted nowhere.
  const statCol = selected ? selected.col : hoverCol;
  const stats = useMemo(() => {
    if (!parsed || statCol === null) return null;
    const idx = csvIndexOf(statCol);
    if (idx < 0) return null;
    const nums = parsed.rows.map((r) => parseFloat(r[idx])).filter((n) => !Number.isNaN(n));
    const label = statCol === 0 ? parsed.headers[idx] : columns[statCol - 1].mapping.column;
    if (nums.length === 0) return { label, text: "no numeric cells" };
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    return {
      label,
      text: `count ${nums.length} · mean ${mean.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })}`,
    };
  }, [parsed, statCol, manifest, timeIndex]);

  /** Cell fill by priority: selected cell > selection row/col > hovered column > zebra. */
  const cellBg = (row: number, col: number) => {
    if (selected && selected.row === row && selected.col === col) return "var(--accent-soft)";
    if (selected && (selected.row === row || selected.col === col)) return "var(--accent-soft)";
    if (hoverCol === col) return "var(--bg-surface)";
    return row % 2 === 1 ? "var(--bg-primary)" : "var(--bg-secondary)";
  };

  const caret = (col: number) =>
    sort && sort.col === col ? (
      <Icon
        name={sort.dir === "asc" ? "chevron-up" : "chevron-down"}
        size={16}
        className="ml-1 inline-block align-text-bottom"
        style={{ color: "var(--accent)" }}
      />
    ) : null;

  const headerCellStyle = (col: number, frozen: boolean): CSSProperties => ({
    position: "sticky",
    top: 0,
    left: frozen ? 0 : undefined,
    zIndex: frozen ? 3 : 2,
    background: hoverCol === col ? "var(--accent-soft)" : "var(--bg-surface)",
    borderRight: HAIRLINE,
    borderBottom: "1px solid var(--border)",
    cursor: "pointer",
    userSelect: "none",
    verticalAlign: "bottom",
  });

  // The Data tab's own acquisition affordance — a file picker, no bundle
  // needed. Reads as text; parsing and every judgment stay downstream.
  const importButton = onAttachCsv && (
    // A <label> over a hidden file input, dressed as the quiet 28px Button
    // (a <button> cannot open a file picker without a script).
    <label
      className="prim-button prim-quiet inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-sm px-2.5 whitespace-nowrap text-sm font-medium"
      style={{
        background: "var(--bg-secondary)",
        color: "var(--text-primary)",
        border: "1px solid var(--rule-strong)",
      }}
    >
      <Icon name="folder" size={16} />
      {csv ? "replace CSV…" : "import CSV…"}
      <input
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => onAttachCsv(String(reader.result));
          reader.readAsText(file);
        }}
      />
    </label>
  );

  /** Write one column's role/target into the manifest (append or replace). */
  const setBinding = (column: string, value: string) => {
    if (!onManifestChange) return;
    const base: Manifest = manifest ?? { model: "", data: "attached.csv", t: 12, mapping: [] };
    const prior = base.mapping.find((m) => m.column === column);
    const rest = base.mapping.filter((m) => m.column !== column);
    const entry = bindingEntry(column, value, model, prior);
    onManifestChange({ ...base, mapping: entry ? [...rest, entry] : rest });
  };

  /** Change the declared unit of a bound flow column; blank clears it. */
  const setUnit = (column: string, unit: string) => {
    if (!onManifestChange || !manifest) return;
    const mapping = manifest.mapping.map((m) => {
      if (m.column !== column) return m;
      const { unit: _old, ...bare } = m;
      return unit.trim() ? { ...bare, unit: unit.trim() } : bare;
    });
    onManifestChange({ ...manifest, mapping });
  };

  const proposals = useMemo(
    () => (parsed ? proposeBindings(parsed.headers, model, manifest?.mapping ?? []) : new Map<string, string>()),
    [parsed, model, manifest],
  );

  /** Confirm every proposal at once: one manifest write, each via bindingEntry. */
  const confirmProposals = () => {
    if (!onManifestChange || proposals.size === 0) return;
    const base: Manifest = manifest ?? { model: "", data: "attached.csv", t: 12, mapping: [] };
    const added = [...proposals].flatMap(([column, value]) => {
      const entry = bindingEntry(column, value, model, undefined);
      return entry ? [entry] : [];
    });
    onManifestChange({ ...base, mapping: [...base.mapping, ...added] });
  };

  const proposalLabel = (value: string) =>
    value === "time" ? (
      "time"
    ) : value.startsWith("stock:") ? (
      <>
        <Icon name="buffering" size={16} /> {value.slice(6)}
      </>
    ) : (
      <>
        <Icon name="forward" size={16} /> {value}
      </>
    );

  const currentBinding = (column: string): string => {
    const m = manifest?.mapping.find((x) => x.column === column);
    if (!m || m.as === "ignore") return "ignore";
    if (m.as === "time") return "time";
    if (m.as === "stock") return m.element ? `stock:${m.element}` : "ignore";
    return m.element ?? "ignore";
  };

  // The binding panel — every CSV column with a role dropdown. This IS the
  // mapping surface (fork 2 of M2): binding by declaration, edited where the
  // data lives, name-keyed like everything else in M1. A model with no
  // declared flows has nothing to bind (#309's variable sheet binds by name),
  // so the panel would be 99 rows of "— ignore —" noise: suppressed.
  const bindingPanel = onManifestChange && parsed && model.relations.length > 0 && (
    <div className="p-3" style={{ borderBottom: HAIRLINE }}>
      <h2
        className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--text-secondary)" }}
      >
        Column bindings
      </h2>
      {proposals.size > 0 && (
        <Button
          size={28}
          variant="quiet"
          icon="check"
          data-testid="confirm-proposed"
          onClick={confirmProposals}
          title="bind every proposed column as shown; the dropdowns stay the correction surface"
          className="mb-2 w-full"
          style={{ borderStyle: "dashed", borderColor: "var(--accent)", color: "var(--accent-strong)" }}
        >
          confirm {proposals.size} proposed by name
        </Button>
      )}
      <ul className="text-xs">
        {parsed.headers.map((h) => (
          <li key={h} className="flex flex-wrap items-center justify-between gap-2 py-1">
            <span className="min-w-0 truncate font-mono" style={{ color: "var(--text-secondary)" }} title={h}>
              {h}
            </span>
            <Select
              value={currentBinding(h)}
              onChange={(e) => setBinding(h, e.target.value)}
              aria-label={`Binding for column ${h}`}
              className="max-w-[10rem] font-mono"
            >
              <option value="ignore">— ignore —</option>
              <option value="time">time (what the rows are measured against)</option>
              {model.relations
                .filter((r) => r.name)
                .map((r) => (
                  <option key={r.id} value={r.name}>
                    → {r.name}
                  </option>
                ))}
              {/* Stocks bind too: the column's t0 observation is the
                  component's initial level (tether stock_series → the
                  projection's initial_state.storage). Offered only for the
                  things that HOLD a level — Buffering components. */}
              {model.things.filter((th) => th.role === "Component" && th.primitive === "Buffering")
                .length > 0 && (
                <optgroup label="stock level (t0 = initial)">
                  {model.things
                    .filter((th) => th.role === "Component" && th.primitive === "Buffering")
                    .map((th) => (
                      <option key={`stock-${th.id}`} value={`stock:${th.name}`}>
                        ▤ {th.name}
                      </option>
                    ))}
                </optgroup>
              )}
            </Select>
            {proposals.has(h) && (
              <Button
                size={28}
                variant="quiet"
                data-proposed={proposals.get(h)}
                onClick={() => setBinding(h, proposals.get(h)!)}
                title="proposed by name, not yet bound: click to bind this column"
                className="max-w-full font-mono"
                style={{ borderStyle: "dashed", color: "var(--text-secondary)" }}
              >
                proposed {proposalLabel(proposals.get(h)!)}
              </Button>
            )}
            {manifest?.mapping.find((m) => m.column === h && m.as === "flow") && (
              <Input
                aria-label={`unit of ${h}`}
                title="the column's unit: what this column measures (defaults to the flow's unit)"
                value={manifest.mapping.find((m) => m.column === h)?.unit ?? ""}
                placeholder="unit"
                onChange={(e) => setUnit(h, e.target.value)}
                className="w-20 font-mono"
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  const flowsRail = (
    <section
      className="w-60 shrink-0 overflow-y-auto"
      style={{ borderLeft: "1px solid var(--border)", background: "var(--bg-secondary)" }}
    >
      {bindingPanel}
      {/* The unbound rail — a declared flow with no data is a fact worth
          showing; an empty column would read as missing data instead. */}
      {unbound.length > 0 && (
        <div className="p-3" style={{ borderBottom: HAIRLINE }}>
          <h2
            className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            Declared, not bound
          </h2>
          <ul className="text-xs">
            {unbound.map((r) => (
              <li key={r.id} className="flex items-center gap-1.5 py-0.5">
                <span
                  aria-hidden
                  className="inline-block h-[3px] w-3 shrink-0"
                  style={{ background: KIND_COLOR[r.kind] }}
                />
                <span style={{ color: "var(--text-secondary)" }}>{r.name}</span>
                <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {thingName(r.a)} → {thingName(r.b)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {otherMappings.length > 0 && (
        <div className="p-3">
          <h2
            className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--text-secondary)" }}
          >
            Other bindings
          </h2>
          <ul className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
            {otherMappings.map((m) => (
              <li key={m.column} className="py-0.5">
                {m.column} → {m.element ?? "?"} ({m.as})
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Header band — states the rung, the support, and the one sentence this
          mode exists to teach. */}
      <div className="px-4 pt-3 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-lg" style={{ color: "var(--text-primary)" }}>
            {modelName}
          </span>
          <Pill tone="neutral">Measurements</Pill>
          {/* The console graft: the shape, stated the moment the sheet opens. */}
          {parsed && (
            <span className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>
              {parsed.rows.length} rows × {(columns.length || variableCols.length) + 1} columns
            </span>
          )}
          <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
            {parsed
              ? `measured against: ${timeMapping ? timeMapping.column : "row index"}${
                  model.time_unit ? ` (${model.time_unit})` : ""
                } · ${parsed.rows.length} observations`
              : "no data attached — structural entry"}
          </span>
          <span className="ml-auto flex items-center gap-2">
            {/* #309: the two readings of one data system, a toggle apart. */}
            {observedStates && (
              <span className="flex items-center gap-1" role="group" aria-label="reading">
                {(["observations", "states"] as const).map((v) => (
                  <ToolButton
                    key={v}
                    active={dataView === v}
                    onClick={() => setDataView(v)}
                    title={
                      v === "observations"
                        ? "rows against time — one row per observation"
                        : "distinct states of the variables, with frequencies — time collapsed away"
                    }
                  >
                    {v === "observations" ? "observations" : "observed states"}
                  </ToolButton>
                ))}
              </span>
            )}
            {importButton}
          </span>
        </div>
        <p className="mt-1 max-w-3xl text-xs" style={{ color: "var(--text-muted)" }}>
          {variableCols.length > 0
            ? dataView === "states"
              ? "One row per distinct state of the variables, most frequent first, with time collapsed away. Frequencies are observed and nothing is generated: a generating rule would be stated against this table, and none is stated here."
              : "A column is a declared variable — matched by name, never invention. No relation is asserted here; inducing structure from these columns is inference, not reading."
            : "A column is a declared flow — the binding is by declaration, never invention. Structure mode asserts; this sheet observes. Inducing structure from these columns is inference, not reading."}
        </p>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto" onMouseLeave={() => setHoverCol(null)}>
          {!parsed && (
            <div className="max-w-md p-4">
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                This model ships structure only — every declared flow is unbound. Attaching your
                measurements (a CSV, one row per time step) gives this sheet its rows; the declared
                flows on the right are the columns it is waiting to grow.
              </p>
              {onAttachCsv && <div className="mt-3">{importButton}</div>}
            </div>
          )}
          {parsed && columns.length === 0 && variableCols.length === 0 && (
            <p className="max-w-md p-4 text-xs" style={{ color: "var(--text-secondary)" }}>
              Data is attached but no column is bound to a declared flow yet.
            </p>
          )}
          {/* #309: the observed-states reading — one row per distinct
              combination of the variables' values, most frequent first, the
              support collapsed away. Counting asserts nothing; this is still
              reading. It is also byte-for-byte what RA and entropy consume. */}
          {parsed && columns.length === 0 && variableCols.length > 0 && dataView === "states" && observedStates && (
            <div className="p-0">
              <table
                className="text-xs"
                style={{ borderCollapse: "separate", borderSpacing: 0, fontVariantNumeric: "tabular-nums" }}
              >
                <thead>
                  <tr>
                    {variableCols.map((v) => (
                      <th
                        key={v.thing.id}
                        className="px-2 py-1.5 text-left font-mono text-[11px] font-normal"
                        style={{
                          position: "sticky",
                          top: 0,
                          zIndex: 2,
                          background: "var(--bg-surface)",
                          borderRight: HAIRLINE,
                          borderBottom: "1px solid var(--border)",
                          verticalAlign: "bottom",
                        }}
                      >
                        <div style={{ color: "var(--text-primary)" }}>{v.thing.name}</div>
                        <div className="text-[10px] font-normal" style={{ color: "var(--text-muted)" }}>
                          {(v.thing.variable_kind ?? "Basic").toLowerCase()}
                          {v.thing.scale ? ` · ${v.thing.scale.toLowerCase()}` : ""}
                        </div>
                      </th>
                    ))}
                    <th
                      className="px-2 py-1.5 text-right font-mono text-[11px] font-normal"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: "var(--bg-surface)",
                        borderRight: HAIRLINE,
                        borderBottom: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                        verticalAlign: "bottom",
                      }}
                      title="observations in this state"
                    >
                      n
                    </th>
                    <th
                      className="px-2 py-1.5 text-right font-mono text-[11px] font-normal"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: "var(--bg-surface)",
                        borderBottom: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                        verticalAlign: "bottom",
                      }}
                      title="share of all observations"
                    >
                      share
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {observedStates.slice(0, ROW_CAP).map((s, ri) => (
                    <tr key={ri}>
                      {s.vals.map((val, ci) => (
                        <td
                          key={ci}
                          className="px-2 py-0.5 font-mono"
                          style={{
                            borderRight: HAIRLINE,
                            borderBottom: HAIRLINE,
                            background: ri % 2 === 1 ? "var(--bg-primary)" : "var(--bg-secondary)",
                            color: "var(--text-primary)",
                          }}
                        >
                          {val === "" ? "∅" : val}
                        </td>
                      ))}
                      <td
                        className="px-2 py-0.5 text-right font-mono"
                        style={{
                          borderRight: HAIRLINE,
                          borderBottom: HAIRLINE,
                          background: ri % 2 === 1 ? "var(--bg-primary)" : "var(--bg-secondary)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {s.n.toLocaleString()}
                      </td>
                      <td
                        className="px-2 py-0.5 text-right font-mono"
                        style={{
                          borderBottom: HAIRLINE,
                          background: ri % 2 === 1 ? "var(--bg-primary)" : "var(--bg-secondary)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {((s.n / parsed.rows.length) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {observedStates.length > ROW_CAP && (
                <p className="mt-1 px-2 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                  … {observedStates.length - ROW_CAP} rarer states not shown (all are counted)
                </p>
              )}
            </div>
          )}
          {/* #309: the variable sheet — a data-system entry whose columns are
              its declared variables. Read-only; kind and scale ride the header
              so the source-system declaration is visible where the data lives. */}
          {parsed && columns.length === 0 && variableCols.length > 0 && dataView === "observations" && (
            <table
              className="text-xs"
              style={{ borderCollapse: "separate", borderSpacing: 0, fontVariantNumeric: "tabular-nums" }}
            >
              <thead>
                <tr>
                  <th
                    className="px-2 py-1.5 text-left font-mono text-[11px] font-normal"
                    style={{ ...headerCellStyle(0, true), color: "var(--text-secondary)" }}
                    onClick={() => clickHeader(0)}
                    title="sort by the time column"
                  >
                    {timeMapping ? timeMapping.column : "t"}
                    {caret(0)}
                  </th>
                  {variableCols.map((v) => (
                    <th
                      key={v.thing.id}
                      className="px-2 py-1.5 text-left font-mono text-[11px] font-normal"
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        background: "var(--bg-surface)",
                        borderRight: HAIRLINE,
                        borderBottom: "1px solid var(--border)",
                        verticalAlign: "bottom",
                      }}
                    >
                      <div style={{ color: "var(--text-primary)" }}>{v.thing.name}</div>
                      <div className="text-[10px] font-normal" style={{ color: "var(--text-muted)" }}>
                        {(v.thing.variable_kind ?? "Basic").toLowerCase()}
                        {v.thing.scale ? ` · ${v.thing.scale.toLowerCase()}` : ""}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, ri) => (
                  <tr key={ri}>
                    <td
                      className="px-2 py-0.5 font-mono"
                      style={{
                        borderRight: HAIRLINE,
                        borderBottom: HAIRLINE,
                        background: ri % 2 === 1 ? "var(--bg-primary)" : "var(--bg-secondary)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {timeIndex >= 0 ? row[timeIndex] : ri}
                    </td>
                    {variableCols.map((v) => (
                      <td
                        key={v.thing.id}
                        className="px-2 py-0.5 font-mono"
                        style={{
                          borderRight: HAIRLINE,
                          borderBottom: HAIRLINE,
                          background: ri % 2 === 1 ? "var(--bg-primary)" : "var(--bg-secondary)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {row[v.csvIndex]}
                      </td>
                    ))}
                  </tr>
                ))}
                {elided && (
                  <tr>
                    <td
                      colSpan={variableCols.length + 1}
                      className="px-2 py-1 text-center font-mono text-[10px]"
                      style={{ color: "var(--text-muted)", borderBottom: HAIRLINE }}
                    >
                      … {hiddenCount} rows elided …
                    </td>
                  </tr>
                )}
                {tailRows.map((row, ri) => (
                  <tr key={`tail-${ri}`}>
                    <td
                      className="px-2 py-0.5 font-mono"
                      style={{
                        borderRight: HAIRLINE,
                        borderBottom: HAIRLINE,
                        background: "var(--bg-secondary)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {timeIndex >= 0 ? row[timeIndex] : "…"}
                    </td>
                    {variableCols.map((v) => (
                      <td
                        key={v.thing.id}
                        className="px-2 py-0.5 font-mono"
                        style={{
                          borderRight: HAIRLINE,
                          borderBottom: HAIRLINE,
                          background: "var(--bg-secondary)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {row[v.csvIndex]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {parsed && columns.length > 0 && (
            <table
              className="text-xs"
              style={{
                borderCollapse: "separate",
                borderSpacing: 0,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <thead>
                <tr>
                  {/* Frozen corner: the support column doubles as the row header. */}
                  <th
                    className="px-2 py-1.5 text-left font-mono text-[11px] font-normal"
                    style={{ ...headerCellStyle(0, true), color: "var(--text-secondary)" }}
                    onClick={() => clickHeader(0)}
                    onMouseEnter={() => setHoverCol(0)}
                    title="sort by the time column"
                  >
                    {timeMapping ? timeMapping.column : "t"}
                    {caret(0)}
                  </th>
                  {columns.map((c, ci) => (
                    <th
                      key={c.mapping.column}
                      className="px-2 py-1.5 text-left"
                      style={{ ...headerCellStyle(ci + 1, false), minWidth: "8rem" }}
                      onClick={() => clickHeader(ci + 1)}
                      onMouseEnter={() => setHoverCol(ci + 1)}
                    >
                      {c.relation ? (
                        // The compact two-line spreadsheet header: the flow's
                        // name, then its identity (endpoints ← source column).
                        <div title={c.mapping.force ? "forces the flow" : "observed alongside"}>
                          <div className="whitespace-nowrap">
                            <span
                              aria-hidden
                              className="mr-1 inline-block h-[3px] w-3 align-middle"
                              style={{ background: KIND_COLOR[c.relation.kind] }}
                            />
                            <span style={{ color: "var(--text-primary)" }}>{c.relation.name}</span>
                            {caret(ci + 1)}
                          </div>
                          <div
                            className="whitespace-nowrap font-mono text-[10px] font-normal"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {thingName(c.relation.a)} → {thingName(c.relation.b)} ← {c.mapping.column}
                            {c.mapping.unit ? ` · ${c.mapping.unit}` : ""} ·{" "}
                            {c.mapping.force ? "forces the flow" : "observed alongside"}
                          </div>
                        </div>
                      ) : (
                        // The instrument graft: a broken binding reads as a
                        // DEAD CHANNEL — red bar where a kind bar would be,
                        // struck values below. Unmistakable, never dropped.
                        <div title="this column names no declared flow — the binding is broken (renamed flow?)">
                          <div className="whitespace-nowrap">
                            <span
                              aria-hidden
                              className="mr-1 inline-block h-[3px] w-3 align-middle"
                              style={{ background: "var(--verdict-error)" }}
                            />
                            <span className="inline-flex items-center gap-1" style={{ color: "var(--verdict-error)" }}>
                              <Icon name="warning" size={16} />
                              {c.mapping.element ?? "(no target)"}
                            </span>
                            {caret(ci + 1)}
                          </div>
                          <div
                            className="whitespace-nowrap font-mono text-[10px] font-normal"
                            style={{ color: "var(--verdict-error)" }}
                          >
                            ← {c.mapping.column} · broken binding
                          </div>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...sortedRows, ...tailRows].map((row, ri) => (
                  <tr key={ri} data-tail={elided && ri >= sortedRows.length ? "" : undefined}
                      style={
                        elided && ri === sortedRows.length
                          ? { borderTop: "3px double var(--border)" }
                          : undefined
                      }>
                    <td
                      className="px-2 py-0.5 font-mono"
                      style={{
                        position: "sticky",
                        left: 0,
                        zIndex: 1,
                        background: cellBg(ri, 0),
                        borderRight: "1px solid var(--border)",
                        borderBottom: HAIRLINE,
                        color: "var(--text-secondary)",
                        cursor: "default",
                        boxShadow:
                          selected && selected.row === ri && selected.col === 0
                            ? "inset 0 0 0 2px var(--accent)"
                            : undefined,
                      }}
                      onMouseEnter={() => setHoverCol(0)}
                      onClick={() =>
                        setSelected((s) =>
                          s && s.row === ri && s.col === 0 ? null : { row: ri, col: 0 },
                        )
                      }
                    >
                      {timeIndex >= 0 ? row[timeIndex] : ri}
                    </td>
                    {columns.map((c, ci) => (
                      <td
                        key={c.mapping.column}
                        className="px-2 py-0.5 text-right font-mono"
                        style={{
                          background: cellBg(ri, ci + 1),
                          borderRight: HAIRLINE,
                          borderBottom: HAIRLINE,
                          color: c.relation ? "var(--text-primary)" : "var(--text-muted)",
                          textDecoration: c.relation ? undefined : "line-through",
                          opacity: c.relation ? undefined : 0.55,
                          cursor: "default",
                          boxShadow:
                            selected && selected.row === ri && selected.col === ci + 1
                              ? "inset 0 0 0 2px var(--accent)"
                              : undefined,
                        }}
                        onMouseEnter={() => setHoverCol(ci + 1)}
                        onClick={() =>
                          setSelected((s) =>
                            s && s.row === ri && s.col === ci + 1
                              ? null
                              : { row: ri, col: ci + 1 },
                          )
                        }
                      >
                        {c.csvIndex >= 0 ? row[c.csvIndex] : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {(bindingPanel || unbound.length > 0 || otherMappings.length > 0) && flowsRail}
      </div>

      {/* Status bar — the spreadsheet's bottom strip: rows shown on the left,
          count/mean of the column under the cursor (or selection) on the right. */}
      <div
        className="flex flex-wrap items-center justify-between gap-x-4 px-3 py-1 font-mono text-[11px]"
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--bg-surface)",
          color: "var(--text-secondary)",
        }}
      >
        <span>
          {parsed
            ? dataView === "states" && observedStates
              ? `${observedStates.length.toLocaleString()} distinct state${observedStates.length === 1 ? "" : "s"} of ${variableCols.length} variable${variableCols.length === 1 ? "" : "s"} · ${parsed.rows.length.toLocaleString()} observations`
              : (elided
                  ? `${sortedRows.length} + ${tailRows.length} of ${parsed.rows.length} rows (⋮ ${hiddenCount} elided)`
                  : `${sortedRows.length} of ${parsed.rows.length} rows`) +
                (variableCols.length > 0
                  ? ` · ${variableCols.length} variable column${variableCols.length === 1 ? "" : "s"}`
                  : ` · ${columns.length} bound column${columns.length === 1 ? "" : "s"}`)
            : "0 rows · structural entry"}
        </span>
        <span style={{ color: stats ? "var(--text-primary)" : "var(--text-muted)" }}>
          {stats
            ? `${stats.label} · ${stats.text}`
            : parsed
              ? "hover or select a column for count / mean"
              : "read-only"}
        </span>
      </div>
    </div>
  );
}
