// The system-type editor — the modeler asserting the model's ontological kind
// (Bunge's kingdom + genus) and its subject domain. This is human-authored
// metadata, NOT the forbidden LLM-structure write path: it writes model.system_type
// only, never things/relations. Genus is meaningful only for a Concrete kingdom
// (Postulate 6.4), so it stays disabled until then. Author grounding lives in
// systems-science-foundations/docs/reference/system-type-typologies.md.
import type { Genus, Kingdom, SystemType } from "./kernel/types";
import { Card, DescriptionField } from "./ui";

const KINGDOMS: Kingdom[] = ["Conceptual", "Concrete"];
const GENERA: Genus[] = ["Physical", "Chemical", "Biological", "Social", "Technical"];

const fieldStyle = {
  border: "1px solid var(--border)",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
} as const;

export function SystemTypeEditor({
  value,
  onChange,
  description,
  onDescriptionChange,
}: {
  value: SystemType | undefined;
  onChange: (next: SystemType) => void;
  /** The SOI's own prose (#326). There is no "model" separate from the system
   *  of interest here — the model's name IS the root system's name — so this is
   *  that system's description, and it belongs in the same panel as the rest of
   *  what the author declares about it. Omitted where the surface has no way to
   *  write it back (the new-model prompt); the field then does not render. */
  description?: string;
  onDescriptionChange?: (next: string) => void;
}) {
  const st = value ?? {};
  const concrete = st.kingdom === "Concrete";

  function setKingdom(kingdom: Kingdom | undefined) {
    // Genus only means anything for a Concrete kingdom — drop it otherwise.
    onChange({ ...st, kingdom, genus: kingdom === "Concrete" ? st.genus : undefined });
  }

  return (
    <Card title="System type" source="asserted · model metadata">
      <div className="grid gap-3">
        {onDescriptionChange && (
          <DescriptionField
            value={description ?? ""}
            onChange={onDescriptionChange}
            label="What this system is"
            placeholder="the system of interest, in your own words"
          />
        )}
        <label className="grid gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          Kingdom
          <select
            value={st.kingdom ?? ""}
            onChange={(e) => setKingdom((e.target.value || undefined) as Kingdom | undefined)}
            className="rounded-md px-2 py-1 text-sm"
            style={fieldStyle}
          >
            <option value="">— unspecified —</option>
            {KINGDOMS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs" style={{ color: concrete ? "var(--text-secondary)" : "var(--text-muted)" }}>
          Genus {!concrete && "(concrete systems only)"}
          <select
            value={st.genus ?? ""}
            disabled={!concrete}
            onChange={(e) => onChange({ ...st, genus: (e.target.value || undefined) as Genus | undefined })}
            className="rounded-md px-2 py-1 text-sm"
            style={{ ...fieldStyle, opacity: concrete ? 1 : 0.5 }}
          >
            <option value="">— unspecified —</option>
            {GENERA.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          Domain (optional)
          <input
            value={st.domain ?? ""}
            onChange={(e) => onChange({ ...st, domain: e.target.value || undefined })}
            placeholder="e.g. U.S. legislative process"
            className="rounded-md px-2 py-1 text-sm"
            style={fieldStyle}
          />
        </label>

        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Author-asserted kind (Bunge's kingdom + genus) and subject domain. Travels with the model;
          it frames the analyst's narration and is never a systemhood verdict.
        </p>
      </div>
    </Card>
  );
}
