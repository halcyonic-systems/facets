// The tether wizard — assign each CSV column a systems meaning, mapped onto the
// model's own flows/components. All gates + translations come from the kernel
// (mappingStatus); this file only renders the choices and forwards edits.
//
// SEAM (element-centric + LLM-guided, project_lenses_llm_guided_mapping): the
// per-column mapping is a plain suggestible object (column ↔ element ↔ unit). A
// future canvas maps element-first (click a flow → pick its column); an LLM will
// later pre-fill this manifest for a human to confirm. Nothing here decides — the
// kernel re-validates every proposal.
import { useMemo } from "react";
import { mappingStatus, modelTargets, parseCsv } from "./kernel";
import type { ColumnMapping, Manifest, Role } from "./kernel/types";
import { Pill } from "./ui";

const ROLES: { value: Role | ""; label: string }[] = [
  { value: "", label: "unassigned" },
  { value: "ignore", label: "ignore" },
  { value: "time", label: "time" },
  { value: "flow", label: "flow magnitude" },
  { value: "stock", label: "stock level" },
  { value: "param", label: "parameter" },
];

export function MappingWizard({
  modelJson,
  csvText,
  manifest,
  onChange,
}: {
  modelJson: string;
  csvText: string;
  manifest: Manifest;
  onChange: (m: Manifest) => void;
}) {
  const targets = useMemo(() => modelTargets(modelJson), [modelJson]);
  const preview = useMemo(() => {
    try {
      return parseCsv(csvText);
    } catch {
      return { headers: [], rows: [] };
    }
  }, [csvText]);
  const status = useMemo(() => {
    try {
      return mappingStatus(modelJson, csvText, manifest);
    } catch {
      return null;
    }
  }, [modelJson, csvText, manifest]);

  const entryFor = (col: string): ColumnMapping | undefined =>
    manifest.mapping.find((m) => m.column === col);

  const setEntry = (col: string, patch: Partial<ColumnMapping> | null) => {
    const rest = manifest.mapping.filter((m) => m.column !== col);
    if (patch === null) {
      onChange({ ...manifest, mapping: rest });
      return;
    }
    const merged: ColumnMapping = { column: col, as: "ignore", ...entryFor(col), ...patch };
    onChange({ ...manifest, mapping: [...rest, merged] });
  };

  return (
    <div className="grid gap-5">
      {/* Preview */}
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--hairline)" }}>
        <table className="w-full text-xs tabular">
          <thead>
            <tr style={{ background: "var(--bg-surface)" }}>
              {preview.headers.map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.slice(0, 6).map((row, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--hairline)" }}>
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-1.5" style={{ color: "var(--text-muted)" }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Column assignments */}
      <div className="grid gap-2">
        {preview.headers.map((col) => {
          const e = entryFor(col);
          const role = (e?.as ?? "") as Role | "";
          const wantsTarget = role === "flow" || role === "stock" || role === "param";
          const targetList = role === "flow" ? targets.flows : targets.components;
          return (
            <div
              key={col}
              className="flex flex-wrap items-center gap-2 rounded-lg px-3 py-2"
              style={{ border: "1px solid var(--hairline)", background: "var(--bg-secondary)" }}
            >
              <span className="w-32 shrink-0 text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {col}
              </span>
              <Select
                value={role}
                onChange={(v) => (v === "" ? setEntry(col, null) : setEntry(col, { as: v as Role }))}
                options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
              />
              {wantsTarget && (
                <Select
                  value={e?.element ?? ""}
                  onChange={(v) => setEntry(col, { element: v })}
                  placeholder="choose element…"
                  options={[
                    { value: "", label: "choose element…" },
                    ...targetList.map((t) => ({ value: t.name, label: t.name })),
                  ]}
                />
              )}
              {role === "flow" && (
                <>
                  <input
                    value={e?.unit ?? ""}
                    onChange={(ev) => setEntry(col, { unit: ev.target.value })}
                    placeholder="unit"
                    className="w-24 rounded-md px-2 py-1 text-sm"
                    style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
                  />
                  <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <input
                      type="checkbox"
                      checked={e?.force ?? false}
                      onChange={(ev) => setEntry(col, { force: ev.target.checked })}
                    />
                    force
                  </label>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Translations + gates */}
      {status && (
        <div className="grid gap-2">
          {status.translations.map((t, i) => (
            <p key={i} className="text-xs italic" style={{ color: "var(--text-secondary)" }}>
              {t}
            </p>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Pill tone={status.t1_ok ? "ok" : "warning"}>every column spoken for</Pill>
            <Pill tone={status.t2_ok ? "ok" : "warning"}>flows have units</Pill>
            <Pill tone={status.t4_ok ? "ok" : "warning"}>time is unique</Pill>
            {status.inferred_dt != null && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                inferred Δt = {status.inferred_dt}
              </span>
            )}
          </div>
          {(status.t2_msg || status.t4_msg || status.apply_error) && (
            <p className="text-xs" style={{ color: "var(--verdict-warning)" }}>
              {status.t2_msg || status.t4_msg || status.apply_error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function useCanFinish(modelJson: string, csvText: string, manifest: Manifest): boolean {
  return useMemo(() => {
    try {
      return mappingStatus(modelJson, csvText, manifest).can_finish;
    } catch {
      return false;
    }
  }, [modelJson, csvText, manifest]);
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md px-2 py-1 text-sm"
      style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
      aria-label={placeholder}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
