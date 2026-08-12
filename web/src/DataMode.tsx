// The Data mode — the model's Klir DATA-LEVEL face (#304 milestone 1,
// ratified 2026-08-09), styled as the sheet a billion people already know.
// Rows are the support (time), columns are DECLARED flows; the binding is by
// declaration, never invention: a column that names no declared flow is shown
// BROKEN, a flow with no column sits in the unbound rail, and nothing is
// aggregated or induced here beyond the status-bar count/mean of the column
// under the cursor. Read-only by design — sort and selection are view state.
import { useMemo, useState, type CSSProperties } from "react";
import type { CanvasModel, ColumnMapping, Manifest } from "./kernel/types";
import { parseCsv } from "./kernel";
import { KIND_COLOR } from "./canvas/types";
import { Pill } from "./ui";

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
      <span aria-hidden className="ml-1" style={{ color: "var(--accent)" }}>
        {sort.dir === "asc" ? "▲" : "▼"}
      </span>
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
    <label
      className="cursor-pointer px-2 py-1 font-mono text-[11px] uppercase tracking-wide"
      style={{
        border: "1px solid var(--accent)",
        color: "var(--accent-strong)",
        background: "var(--bg-surface)",
      }}
    >
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
    const rest = base.mapping.filter((m) => m.column !== column);
    let entry: ColumnMapping | null = null;
    if (value === "time") entry = { column, as: "time" };
    else if (value !== "ignore") {
      // The kernel's T2 gate requires a unit on every flow column, and the
      // author already has one place to say it — the flow's own `unit`
      // clause — so the binding inherits it rather than asking twice. A
      // unitless flow yields a unitless mapping, and Run refuses with the
      // kernel's own reason (declare the unit in SL, not here).
      const unit = model.relations.find((r) => r.name === value)?.unit;
      entry = { column, as: "flow", element: value, force: true, ...(unit ? { unit } : {}) };
    }
    onManifestChange({ ...base, mapping: entry ? [...rest, entry] : rest });
  };

  const currentBinding = (column: string): string => {
    const m = manifest?.mapping.find((x) => x.column === column);
    if (!m || m.as === "ignore") return "ignore";
    return m.as === "time" ? "time" : (m.element ?? "ignore");
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
      <ul className="text-xs">
        {parsed.headers.map((h) => (
          <li key={h} className="flex items-center justify-between gap-2 py-0.5">
            <span className="truncate font-mono" style={{ color: "var(--text-secondary)" }}>
              {h}
            </span>
            <select
              value={currentBinding(h)}
              onChange={(e) => setBinding(h, e.target.value)}
              className="max-w-[9rem] border px-1 py-0.5 font-mono text-[11px]"
              style={{
                borderColor: "var(--hairline)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
            >
              <option value="ignore">— ignore —</option>
              <option value="time">time (support)</option>
              {model.relations
                .filter((r) => r.name)
                .map((r) => (
                  <option key={r.id} value={r.name}>
                    → {r.name}
                  </option>
                ))}
            </select>
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
          <Pill tone="neutral">Data level</Pill>
          {/* The console graft: the shape, stated the moment the sheet opens. */}
          {parsed && (
            <span className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>
              {parsed.rows.length} rows × {(columns.length || variableCols.length) + 1} columns
            </span>
          )}
          <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
            {parsed
              ? `support: ${timeMapping ? timeMapping.column : "row index"}${
                  model.time_unit ? ` (${model.time_unit})` : ""
                } · ${parsed.rows.length} observations`
              : "no data attached — structural entry"}
          </span>
          <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
            model declares level {model.klir_level ?? "— undeclared"}
          </span>
          <span className="ml-auto flex items-center gap-2">
            {/* #309: the two readings of one data system, a toggle apart. */}
            {observedStates && (
              <span className="flex font-mono text-[11px]" style={{ border: HAIRLINE }}>
                {(["observations", "states"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setDataView(v)}
                    className="px-2 py-1 uppercase tracking-wide"
                    style={{
                      background: dataView === v ? "var(--accent-soft)" : "var(--bg-surface)",
                      color: dataView === v ? "var(--accent-strong)" : "var(--text-muted)",
                    }}
                    title={
                      v === "observations"
                        ? "rows over the support — one row per observation"
                        : "distinct states of the variables, with frequencies — the support collapsed away"
                    }
                  >
                    {v === "observations" ? "observations" : "observed states"}
                  </button>
                ))}
              </span>
            )}
            {importButton}
          </span>
        </div>
        <p className="mt-1 max-w-3xl text-xs" style={{ color: "var(--text-muted)" }}>
          {variableCols.length > 0
            ? dataView === "states"
              ? "One row per distinct state of the variables, most frequent first, with the support collapsed away. Frequencies are observed and nothing is generated: a generating rule would be stated against this table, and none is stated here."
              : "A column is a declared variable — matched by name, never invention. No relation is asserted here; inducing structure from these columns is inference, not reading."
            : "A column is a declared flow — the binding is by declaration, never invention. Structure mode asserts; this sheet observes. Inducing structure from these columns is inference, not reading."}
        </p>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto" onMouseLeave={() => setHoverCol(null)}>
          {!parsed && (
            <div className="max-w-md p-4">
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                This model ships structure only — every declared flow is unbound. Attaching data
                (CSV + mapping) gives this sheet its rows; the declared flows on the right are the
                columns it is waiting to grow.
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
                    title="sort by the support column"
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
                    title="sort by the support column"
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
                            <span style={{ color: "var(--verdict-error)" }}>
                              ⚠ {c.mapping.element ?? "(no target)"}
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
