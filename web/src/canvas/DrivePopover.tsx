// Element-centric drive: click a flow on the canvas → pick the CSV column that
// drives it. Edits the manifest's ColumnMapping (the tether's own shape); Rust
// re-validates on Run. Kept as a plain suggestible object — the seam a future
// LLM pre-fills and a human confirms (project_lenses_llm_guided_mapping).
import { useState } from "react";
import type { ColumnMapping, Manifest, Relation } from "../kernel/types";
import type { Pt } from "./geometry";

export function DrivePopover({
  relation,
  headers,
  manifest,
  anchor,
  onApply,
  onClose,
}: {
  relation: Relation;
  headers: string[];
  manifest: Manifest;
  anchor: Pt;
  onApply: (m: Manifest) => void;
  onClose: () => void;
}) {
  const current = manifest.mapping.find((m) => m.as === "flow" && m.element === relation.name);
  const [column, setColumn] = useState(current?.column ?? "");
  const [unit, setUnit] = useState(current?.unit ?? "");

  function apply() {
    if (!column) return;
    // The time column must stay mapped — only this relation's flow entry moves.
    const rest = manifest.mapping.filter((m) => !(m.as === "flow" && m.element === relation.name));
    const entry: ColumnMapping = { column, as: "flow", element: relation.name, unit, force: true };
    onApply({ ...manifest, mapping: [...rest, entry] });
  }

  return (
    <div
      className="absolute z-10 -translate-x-1/2 rounded-xl p-3"
      style={{
        left: anchor.x,
        top: anchor.y + 20,
        width: 220,
        background: "var(--bg-secondary)",
        border: "1px solid var(--accent)",
        boxShadow: "var(--shadow-card-hover)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      <div className="mb-2 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
        drive &ldquo;{relation.name || "this flow"}&rdquo;
      </div>
      <select
        value={column}
        onChange={(e) => setColumn(e.target.value)}
        className="mb-2 w-full rounded-md px-2 py-1 text-sm"
        style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
      >
        <option value="">choose column…</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <input
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        placeholder="unit"
        className="mb-3 w-full rounded-md px-2 py-1 text-sm"
        style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-full px-3 py-1 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          cancel
        </button>
        <button
          onClick={apply}
          disabled={!column}
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: column ? "var(--accent)" : "var(--bg-surface)",
            color: column ? "#fff" : "var(--text-muted)",
            cursor: column ? "pointer" : "not-allowed",
          }}
        >
          drive it
        </button>
      </div>
    </div>
  );
}
