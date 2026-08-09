// The Data mode — the model's Klir DATA-LEVEL face (#304 milestone 1,
// ratified 2026-08-09). Rows are the support (time), columns are DECLARED
// flows; the binding is by declaration, never invention: a column that names
// no declared flow is shown BROKEN, a flow with no column sits in the unbound
// rail, and nothing is aggregated or induced here. Read-only by design — the
// page observes; Structure mode asserts. The diagram deliberately does not
// render in this mode (the mode boundary, not a diagram sunset, is what keeps
// the table from being upstaged).
import { useMemo } from "react";
import type { CanvasModel, ColumnMapping, Manifest } from "./kernel/types";
import { parseCsv } from "./kernel";
import { KIND_COLOR } from "./canvas/types";
import { Card, Pill } from "./ui";

const ROW_CAP = 200;

interface BoundColumn {
  mapping: ColumnMapping;
  /** The declared flow this column IS — null = broken binding (names no flow). */
  relation: CanvasModel["relations"][number] | null;
  csvIndex: number;
}

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
  const rows = parsed ? parsed.rows.slice(0, ROW_CAP) : [];

  return (
    <div className="absolute inset-0 overflow-auto p-4" style={{ background: "var(--bg-primary)" }}>
      {/* Header band — states the rung, the support, and the one sentence this
          mode exists to teach. */}
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
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
      <p className="mb-4 max-w-3xl text-xs" style={{ color: "var(--text-muted)" }}>
        A column is a declared flow — the binding is by declaration, never invention. Structure mode
        asserts; this table observes. Inducing structure from these columns is inference, not
        reading.
      </p>

      <div className="flex flex-wrap items-start gap-4">
        <Card title={parsed ? "Observations" : "No data attached"} source="declared bindings">
          {!parsed && (
            <p className="max-w-md p-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              This model ships structure only — every declared flow is unbound. Attaching data
              (CSV + mapping) gives this table its rows; the declared flows on the right are the
              columns it is waiting to grow.
            </p>
          )}
          {parsed && columns.length === 0 && (
            <p className="max-w-md p-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              Data is attached but no column is bound to a declared flow yet.
            </p>
          )}
          {parsed && columns.length > 0 && (
            <div className="overflow-x-auto">
              <table className="text-xs" style={{ fontVariantNumeric: "tabular-nums" }}>
                <thead>
                  <tr>
                    <th
                      className="px-2 py-1 text-left font-mono font-normal"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {timeMapping ? timeMapping.column : "t"}
                    </th>
                    {columns.map((c) => (
                      <th key={c.mapping.column} className="px-2 py-1 text-left align-bottom">
                        {c.relation ? (
                          <div>
                            <span
                              aria-hidden
                              className="mr-1 inline-block h-[3px] w-3 rounded-full align-middle"
                              style={{ background: KIND_COLOR[c.relation.kind] }}
                            />
                            <span style={{ color: "var(--text-primary)" }}>{c.relation.name}</span>
                            <div className="font-mono font-normal" style={{ color: "var(--text-muted)" }}>
                              {thingName(c.relation.a)} → {thingName(c.relation.b)}
                              {c.mapping.unit ? ` · ${c.mapping.unit}` : ""}
                            </div>
                            <div className="font-mono font-normal" style={{ color: "var(--text-muted)" }}>
                              ← {c.mapping.column} ·{" "}
                              {c.mapping.force ? "forces the flow" : "observed alongside"}
                            </div>
                          </div>
                        ) : (
                          <div title="this column names no declared flow — the binding is broken (renamed flow?)">
                            <span style={{ color: "var(--verdict-error)" }}>
                              ⚠ {c.mapping.element ?? "(no target)"}
                            </span>
                            <div className="font-mono font-normal" style={{ color: "var(--text-muted)" }}>
                              ← {c.mapping.column} · broken binding
                            </div>
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--hairline)" }}>
                      <td className="px-2 py-0.5 font-mono" style={{ color: "var(--text-muted)" }}>
                        {timeIndex >= 0 ? row[timeIndex] : i}
                      </td>
                      {columns.map((c) => (
                        <td
                          key={c.mapping.column}
                          className="px-2 py-0.5 font-mono"
                          style={{
                            color: c.relation ? "var(--text-primary)" : "var(--text-muted)",
                          }}
                        >
                          {c.csvIndex >= 0 ? row[c.csvIndex] : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > ROW_CAP && (
                <p className="p-2 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                  first {ROW_CAP} of {parsed.rows.length} rows
                </p>
              )}
            </div>
          )}
        </Card>

        {/* The unbound rail — a declared flow with no data is a fact worth
            showing; an empty column would read as missing data instead. */}
        {unbound.length > 0 && (
          <Card title="Declared, not bound" source="the model's flows">
            <ul className="p-1 text-xs">
              {unbound.map((r) => (
                <li key={r.id} className="flex items-center gap-1.5 py-0.5">
                  <span
                    aria-hidden
                    className="inline-block h-[3px] w-3 shrink-0 rounded-full"
                    style={{ background: KIND_COLOR[r.kind] }}
                  />
                  <span style={{ color: "var(--text-secondary)" }}>{r.name}</span>
                  <span className="font-mono" style={{ color: "var(--text-muted)" }}>
                    {thingName(r.a)} → {thingName(r.b)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {otherMappings.length > 0 && (
          <Card title="Other bindings" source="stocks & params">
            <ul className="p-1 font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
              {otherMappings.map((m) => (
                <li key={m.column} className="py-0.5">
                  {m.column} → {m.element ?? "?"} ({m.as})
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
