// The Klir lens's data-first front door (#309 M1). A user who arrives with
// observations and no model authors the first two rungs in order: name the
// variables (source system), attach or type their observed states (data
// system). The entry declares the level it earned — Source until observations
// exist, Data once they do — and structure can come later or never. Two
// acquisition paths, one authoring surface: ingest a CSV, or type into a
// small grid by hand. Nothing here induces structure; the surface authors a
// frame and carries observations through it untouched.
import { useMemo, useState } from "react";
import type { CanvasModel, KlirVarKind, Manifest, ScaleType, Thing } from "./kernel/types";
import { parseCsv } from "./kernel";
import { Pill } from "./ui";

const SCALES: ScaleType[] = ["Nominal", "Ordinal", "Interval", "Ratio"];
/** State sets are enumerable labels; past this many distinct values a column
 *  reads as a measured quantity, not an enumeration. */
const MAX_STATES = 12;
const HAIRLINE = "1px solid var(--hairline)";

interface Grid {
  headers: string[];
  rows: string[][];
}

/** Per-column authoring choices. States are computed at commit, not stored —
 *  the grid stays the single source of the observed values. */
interface ColCfg {
  include: boolean;
  name: string;
  kind: KlirVarKind;
  scale: ScaleType;
}

const SUPPORT_RE = /^(t|time|date|day|week|month|year|quarter|period)$/i;

function numericFraction(rows: string[][], col: number): number {
  const cells = rows.map((r) => r[col] ?? "").filter((c) => c.trim() !== "");
  if (cells.length === 0) return 0;
  return cells.filter((c) => !Number.isNaN(parseFloat(c))).length / cells.length;
}

function distinctValues(rows: string[][], col: number): string[] {
  const seen = new Set<string>();
  for (const r of rows) {
    const c = (r[col] ?? "").trim();
    if (c !== "") seen.add(c);
  }
  return [...seen];
}

/** Scale guess: mostly-numeric reads Ratio, else Nominal. A guess, shown in an
 *  editable select — the author ratifies or corrects, never inherits silently. */
export function guessCfg(grid: Grid): ColCfg[] {
  return grid.headers.map((h, i) => ({
    include: true,
    name: h,
    kind: SUPPORT_RE.test(h.trim()) ? "Support" : "Basic",
    scale: numericFraction(grid.rows, i) > 0.9 ? "Ratio" : "Nominal",
  }));
}

export function guessSupport(grid: Grid): number {
  const byName = grid.headers.findIndex((h) => SUPPORT_RE.test(h.trim()));
  return byName >= 0 ? byName : 0;
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsvText(grid: Grid): string {
  const line = (cells: string[]) => cells.map(csvCell).join(",");
  return [line(grid.headers), ...grid.rows.map(line)].join("\n") + "\n";
}

export function StartFromData({
  onCommit,
  onCancel,
}: {
  /** The authored entry: a Klir-lens model whose things are the variables, the
   *  observations as CSV text, and a manifest naming the support column. */
  onCommit: (model: CanvasModel, csvText: string, manifest: Manifest) => void;
  onCancel: () => void;
}) {
  const [grid, setGrid] = useState<Grid | null>(null);
  const [cfg, setCfg] = useState<ColCfg[]>([]);
  const [supportIdx, setSupportIdx] = useState(0);
  const [entryName, setEntryName] = useState("");
  const [handMode, setHandMode] = useState(false);

  function adopt(g: Grid) {
    setGrid(g);
    setCfg(guessCfg(g));
    setSupportIdx(guessSupport(g));
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsv(String(reader.result));
        adopt({ headers: parsed.headers, rows: parsed.rows });
        setHandMode(false);
      } catch {
        // A file the parser refuses: stay on the gate rather than adopt garbage.
      }
    };
    reader.readAsText(file);
  }

  function startByHand() {
    setHandMode(true);
    adopt({
      headers: ["t", "variable 1", "variable 2"],
      rows: Array.from({ length: 6 }, () => ["", "", ""]),
    });
  }

  function setHeader(i: number, v: string) {
    if (!grid) return;
    setGrid({ ...grid, headers: grid.headers.map((h, k) => (k === i ? v : h)) });
    setCfg((c) => c.map((x, k) => (k === i ? { ...x, name: v } : x)));
  }

  function setCell(row: number, col: number, v: string) {
    if (!grid) return;
    setGrid({
      ...grid,
      rows: grid.rows.map((r, ri) => (ri === row ? r.map((c, ci) => (ci === col ? v : c)) : r)),
    });
  }

  function addRow() {
    if (!grid) return;
    setGrid({ ...grid, rows: [...grid.rows, grid.headers.map(() => "")] });
  }

  function addColumn() {
    if (!grid) return;
    const name = `variable ${grid.headers.length}`;
    setGrid({
      headers: [...grid.headers, name],
      rows: grid.rows.map((r) => [...r, ""]),
    });
    setCfg((c) => [...c, { include: true, name, kind: "Basic", scale: "Nominal" }]);
  }

  const hasObservations = useMemo(
    () => (grid ? grid.rows.some((r) => r.some((c, i) => i !== supportIdx && c.trim() !== "")) : false),
    [grid, supportIdx],
  );
  // The level is earned, not chosen: variables alone are a source system;
  // observed states over the support make it a data system (#288 vocabulary).
  const level = hasObservations ? "Data" : "Source";

  const includedCount = cfg.filter((c) => c.include).length;

  function commit() {
    if (!grid || includedCount === 0) return;
    const things: Thing[] = [];
    let k = 0;
    grid.headers.forEach((_, i) => {
      const c = cfg[i];
      if (!c || !c.include) return;
      const isSupport = i === supportIdx;
      const states = distinctValues(grid.rows, i);
      const enumerable =
        (c.scale === "Nominal" || c.scale === "Ordinal") && states.length > 0 && states.length <= MAX_STATES;
      things.push({
        id: k + 1,
        name: c.name.trim() || grid.headers[i],
        x: 140 + (k % 4) * 180,
        y: 120 + Math.floor(k / 4) * 130,
        role: "Component",
        // Basic is the default reading, so only Support is stored (#154).
        variable_kind: isSupport || c.kind === "Support" ? "Support" : undefined,
        scale: c.scale,
        states: enumerable ? states : undefined,
      });
      k += 1;
    });
    const model: CanvasModel = {
      lens: "Klir",
      name: entryName.trim() || undefined,
      klir_level: level,
      things,
      relations: [],
      boundary: { porosity: 0, perceptive_fuzziness: 0 },
    };
    const manifest: Manifest = {
      model: "",
      data: "attached.csv",
      t: Math.max(grid.rows.length, 1),
      mapping: [{ column: grid.headers[supportIdx], as: "time" }],
    };
    onCommit(model, toCsvText(grid), manifest);
  }

  const selectStyle = {
    border: "1px solid var(--hairline)",
    background: "var(--bg-primary)",
    color: "var(--text-primary)",
  } as const;

  const gate = (
    <div className="max-w-xl">
      <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        Bring observations first; structure can come later or never. Klir&rsquo;s hierarchy starts
        here — variables and their state sets are a <em>source system</em>, observed states over a
        support are a <em>data system</em>. This surface authors those two rungs and nothing more.
      </p>
      <div className="flex gap-3">
        <label
          className="cursor-pointer px-3 py-2 font-mono text-xs uppercase tracking-wide"
          style={{
            border: "1px solid var(--accent)",
            color: "var(--accent-strong)",
            background: "var(--bg-surface)",
          }}
        >
          ingest a CSV…
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onPickFile} />
        </label>
        <button
          onClick={startByHand}
          className="px-3 py-2 font-mono text-xs uppercase tracking-wide"
          style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          enter by hand
        </button>
      </div>
    </div>
  );

  const variablePanel = grid && (
    <section className="w-80 shrink-0 overflow-y-auto p-3" style={{ borderLeft: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Source system — the frame
        </h2>
        {/* A wide CSV (HMDA is ~99 columns) starts from none-included just as
            often as from all: both sweeps, support column always kept. */}
        <span className="flex gap-2 font-mono text-[10px]">
          <button
            onClick={() => setCfg((cs) => cs.map((x) => ({ ...x, include: true })))}
            style={{ color: "var(--accent-strong)" }}
          >
            all
          </button>
          <button
            onClick={() => setCfg((cs) => cs.map((x, k) => ({ ...x, include: k === supportIdx })))}
            style={{ color: "var(--accent-strong)" }}
          >
            none
          </button>
        </span>
      </div>
      <p className="mb-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
        Which variables exist, their scales, their standing, the support — decided here, complete
        before any row exists. No observation lives in this panel. The guesses below are proposals;
        each one is yours to ratify or correct.
      </p>
      <ul className="text-xs">
        {grid.headers.map((h, i) => {
          const c = cfg[i];
          if (!c) return null;
          const states = distinctValues(grid.rows, i);
          return (
            <li key={i} className="py-1.5" style={{ borderBottom: HAIRLINE }}>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={c.include}
                  onChange={(e) => setCfg((cs) => cs.map((x, k) => (k === i ? { ...x, include: e.target.checked } : x)))}
                  title="include this column as a variable"
                />
                <span className="truncate font-mono" style={{ color: "var(--text-primary)" }}>
                  {h}
                </span>
                {i === supportIdx && <Pill tone="neutral">support</Pill>}
              </div>
              <div className="mt-1 flex items-center gap-2 pl-5">
                <select
                  value={i === supportIdx ? "Support" : c.kind}
                  disabled={i === supportIdx}
                  onChange={(e) =>
                    setCfg((cs) => cs.map((x, k) => (k === i ? { ...x, kind: e.target.value === "Support" ? "Support" : "Basic" } : x)))
                  }
                  className="px-1 py-0.5 font-mono text-[11px]"
                  style={selectStyle}
                  title="Klir's basic-vs-supporting standing — declared, not derived"
                >
                  <option value="Basic">basic</option>
                  <option value="Support">support</option>
                </select>
                <select
                  value={c.scale}
                  onChange={(e) => setCfg((cs) => cs.map((x, k) => (k === i ? { ...x, scale: e.target.value as ScaleType } : x)))}
                  className="px-1 py-0.5 font-mono text-[11px]"
                  style={selectStyle}
                  title="measurement scale of the state set"
                >
                  {SCALES.map((s) => (
                    <option key={s} value={s}>
                      {s.toLowerCase()}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                  <input
                    type="radio"
                    name="support-col"
                    checked={i === supportIdx}
                    onChange={() => setSupportIdx(i)}
                  />
                  support column
                </label>
              </div>
              <div className="mt-0.5 pl-5 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                {states.length === 0
                  ? "no observed states yet"
                  : states.length <= MAX_STATES
                    ? `states {${states.join(", ")}}`
                    : `${states.length} distinct values — measured, not enumerated`}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );

  const sheet = grid && (
    <div className="min-w-0 flex-1 overflow-auto p-3">
      {/* The rung the sheet is: the same frame, filled. Until a cell holds an
          observed state the entry has authored only the frame — and says so. */}
      <div className="mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Data system — the frame, filled
        </span>
        <span className="ml-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
          {hasObservations
            ? "each row is one observation: the variables' states at one point of the support"
            : "no observed states yet — the entry stands at Source until a row is filled"}
        </span>
      </div>
      <table className="text-xs" style={{ borderCollapse: "separate", borderSpacing: 0, fontVariantNumeric: "tabular-nums" }}>
        <thead>
          <tr>
            {grid.headers.map((h, i) => (
              <th
                key={i}
                className="px-1 py-1 text-left font-mono text-[11px] font-normal"
                style={{ borderBottom: "1px solid var(--border)", borderRight: HAIRLINE, background: "var(--bg-surface)", opacity: cfg[i]?.include ? 1 : 0.4 }}
              >
                {handMode ? (
                  <input
                    value={h}
                    onChange={(e) => setHeader(i, e.target.value)}
                    className="w-28 px-1 py-0.5"
                    style={{ border: "1px solid var(--hairline)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
                  />
                ) : (
                  <span style={{ color: "var(--text-secondary)" }}>{h}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(handMode ? grid.rows : grid.rows.slice(0, 40)).map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-1 py-0.5 font-mono"
                  style={{
                    borderBottom: HAIRLINE,
                    borderRight: HAIRLINE,
                    background: ri % 2 === 1 ? "var(--bg-primary)" : "var(--bg-secondary)",
                    color: "var(--text-primary)",
                    opacity: cfg[ci]?.include ? 1 : 0.4,
                  }}
                >
                  {handMode ? (
                    <input
                      value={cell}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      className="w-28 px-1 py-0.5"
                      style={{ border: "none", background: "transparent", color: "var(--text-primary)" }}
                    />
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!handMode && grid.rows.length > 40 && (
        <p className="mt-1 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
          … {grid.rows.length - 40} more rows (all are kept; the preview shows 40)
        </p>
      )}
      {handMode && (
        <div className="mt-2 flex gap-2">
          <button onClick={addRow} className="px-2 py-1 font-mono text-[11px]" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            + row
          </button>
          <button onClick={addColumn} className="px-2 py-1 font-mono text-[11px]" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            + column
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "var(--bg-primary)" }}>
      <div className="px-4 pt-3 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-lg" style={{ color: "var(--text-primary)" }}>
            Start from data
          </span>
          <Pill tone="neutral">Klir lens</Pill>
          {grid && (
            <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
              source system: {includedCount} variable{includedCount === 1 ? "" : "s"} · support:{" "}
              {grid.headers[supportIdx] ?? "—"} — data system: {grid.rows.length} row
              {grid.rows.length === 1 ? "" : "s"} → level{" "}
              <strong style={{ color: "var(--text-primary)" }}>{level}</strong>
            </span>
          )}
          <span className="ml-auto flex items-center gap-2">
            {grid && (
              <input
                value={entryName}
                onChange={(e) => setEntryName(e.target.value)}
                placeholder="entry name (optional)"
                className="px-2 py-1 text-xs"
                style={{ border: "1px solid var(--hairline)", background: "var(--bg-surface)", color: "var(--text-primary)" }}
              />
            )}
            {grid && (
              <button
                onClick={commit}
                disabled={includedCount === 0}
                className="px-3 py-1 font-mono text-xs uppercase tracking-wide"
                style={{
                  border: "1px solid var(--accent)",
                  color: "var(--accent-strong)",
                  background: "var(--bg-surface)",
                  opacity: includedCount === 0 ? 0.5 : 1,
                }}
              >
                create entry
              </button>
            )}
            <button onClick={onCancel} className="px-2 py-1 text-xs" style={{ color: "var(--text-muted)" }}>
              cancel
            </button>
          </span>
        </div>
        <p className="mt-1 max-w-3xl text-xs" style={{ color: "var(--text-muted)" }}>
          Two rungs, one page: the panel on the right is the <em>source system</em> — the frame,
          with no observations in it; the sheet is the <em>data system</em> — that same frame,
          filled. Choosing columns authors the frame; rows fill it. No relation is asserted at
          either rung.
        </p>
      </div>
      <div className="flex min-h-0 flex-1">
        {!grid ? <div className="p-6">{gate}</div> : (
          <>
            {sheet}
            {variablePanel}
          </>
        )}
      </div>
    </div>
  );
}
