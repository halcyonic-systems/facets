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
}: {
  model: CanvasModel;
  modelName: string;
  csv: string | null;
  manifest: Manifest | null;
}) {
  const parsed = useMemo(() => (csv ? parseCsv(csv) : null), [csv]);

  // View state only — the sheet is read-only. col 0 = the time column,
  // col i+1 = the i-th bound flow column.
  const [sort, setSort] = useState<SortState>(null);
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

  /** CSV index a grid column reads from; -1 means row index / missing. */
  const csvIndexOf = (col: number) => (col === 0 ? timeIndex : columns[col - 1]?.csvIndex ?? -1);

  const sortedRows = useMemo(() => {
    if (!parsed) return [] as string[][];
    const all = parsed.rows;
    if (!sort) return all.slice(0, ROW_CAP);
    const idx = sort.col === 0 ? timeIndex : columns[sort.col - 1]?.csvIndex ?? -1;
    if (idx < 0 && sort.col !== 0) return all.slice(0, ROW_CAP);
    const sign = sort.dir === "asc" ? 1 : -1;
    const decorated = all.map((row, i) => ({ row, i }));
    decorated.sort((x, y) => {
      const c = idx < 0 ? x.i - y.i : cellCompare(x.row[idx], y.row[idx]);
      return sign * (c || x.i - y.i);
    });
    return decorated.slice(0, ROW_CAP).map((d) => d.row);
    // columns is rebuilt each render, but its csvIndex values derive from
    // parsed + manifest, both listed here.
  }, [parsed, sort, timeIndex, manifest]);

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

  const flowsRail = (
    <section
      className="w-60 shrink-0 overflow-y-auto"
      style={{ borderLeft: "1px solid var(--border)", background: "var(--bg-secondary)" }}
    >
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
        </div>
        <p className="mt-1 max-w-3xl text-xs" style={{ color: "var(--text-muted)" }}>
          A column is a declared flow — the binding is by declaration, never invention. Structure
          mode asserts; this sheet observes. Inducing structure from these columns is inference,
          not reading.
        </p>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto" onMouseLeave={() => setHoverCol(null)}>
          {!parsed && (
            <p className="max-w-md p-4 text-xs" style={{ color: "var(--text-secondary)" }}>
              This model ships structure only — every declared flow is unbound. Attaching data
              (CSV + mapping) gives this sheet its rows; the declared flows on the right are the
              columns it is waiting to grow.
            </p>
          )}
          {parsed && columns.length === 0 && (
            <p className="max-w-md p-4 text-xs" style={{ color: "var(--text-secondary)" }}>
              Data is attached but no column is bound to a declared flow yet.
            </p>
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
                        <div title="this column names no declared flow — the binding is broken (renamed flow?)">
                          <div className="whitespace-nowrap">
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
                {sortedRows.map((row, ri) => (
                  <tr key={ri}>
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

        {(unbound.length > 0 || otherMappings.length > 0) && flowsRail}
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
            ? `${sortedRows.length} of ${parsed.rows.length} rows` +
              (parsed.rows.length > ROW_CAP ? ` (first ${ROW_CAP})` : "") +
              ` · ${columns.length} bound column${columns.length === 1 ? "" : "s"}`
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
