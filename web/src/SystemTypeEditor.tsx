// The system-type editor — the modeler asserting the model's ontological kind
// (Bunge's kingdom + genus) and its subject domain. This is human-authored
// metadata, NOT the forbidden LLM-structure write path: it writes model.system_type
// only, never things/relations. Genus is meaningful only for a Concrete kingdom
// (Postulate 6.4), so it stays disabled until then. Author grounding lives in
// systems-science-foundations/docs/reference/system-type-typologies.md.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { Genus, Kingdom, SystemType } from "./kernel/types";
import { Card, DescriptionField, Input, Select } from "./ui";

const KINGDOMS: Kingdom[] = ["Conceptual", "Concrete"];
const GENERA: Genus[] = [
  "Physical",
  "Chemical",
  "Biological",
  "Social",
  "Technical",
];

/** The 11/600 uppercase label over each field (rule 5), the same as
 *  DescriptionField's, so the five fields read as one column. */
const LABEL_CLASS = "grid gap-1 text-[11px] font-semibold uppercase";
const LABEL_STYLE: CSSProperties = {
  letterSpacing: "var(--tracking-label)",
  color: "var(--text-secondary)",
};

export function SystemTypeEditor({
  value,
  onChange,
  description,
  onDescriptionChange,
  name,
  onNameChange,
  onClose,
}: {
  value: SystemType | undefined;
  onChange: (next: SystemType) => void;
  /** The system's name, which is the model's name. It sits here since the
   *  new-model prompt that used to ask for it is gone; an SL header sets the
   *  same field. Omitted where the surface cannot write it back. */
  name?: string;
  onNameChange?: (next: string) => void;
  /** The SOI's own prose (#326). There is no "model" separate from the system
   *  of interest here — the model's name IS the root system's name — so this is
   *  that system's description, and it belongs in the same panel as the rest of
   *  what the author declares about it. Omitted where the surface has no way to
   *  write it back; the field then does not render. */
  description?: string;
  onDescriptionChange?: (next: string) => void;
  /** Given when the editor is a popover (the title chip opens it): it then
   *  carries role="dialog", takes focus on open, closes on Escape and returns
   *  focus to the opener on close (rule 15). Absent in a dock, it is a plain
   *  card. */
  onClose?: () => void;
}) {
  const st = value ?? {};
  const concrete = st.kingdom === "Concrete";
  const rootRef = useRef<HTMLDivElement>(null);
  // Focus the first field on open; on unmount hand focus back to whatever
  // had it (the chip), the way ConfirmDialog does.
  useEffect(() => {
    if (!onClose) return;
    const opener = document.activeElement as HTMLElement | null;
    const first = rootRef.current?.querySelector<HTMLElement>(
      "input, select, textarea",
    );
    first?.focus();
    return () => opener?.focus?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setKingdom(kingdom: Kingdom | undefined) {
    // Genus only means anything for a Concrete kingdom — drop it otherwise.
    onChange({
      ...st,
      kingdom,
      genus: kingdom === "Concrete" ? st.genus : undefined,
    });
  }

  return (
    <div
      ref={rootRef}
      role={onClose ? "dialog" : undefined}
      aria-label={onClose ? "System type" : undefined}
      onKeyDown={(e) => {
        if (onClose && e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <Card title="System type" source="asserted">
        <div className="grid gap-3">
          {onNameChange && (
            <label className={LABEL_CLASS} style={LABEL_STYLE}>
              System name
              <Input
                value={name ?? ""}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="e.g. U.S. legislative process"
                className="w-full normal-case tracking-normal font-normal"
              />
            </label>
          )}
          {onDescriptionChange && (
            <DescriptionField
              value={description ?? ""}
              onChange={onDescriptionChange}
              label="What this system is"
              placeholder="the system of interest, in your own words"
            />
          )}
          <label className={LABEL_CLASS} style={LABEL_STYLE}>
            Kingdom
            <Select
              value={st.kingdom ?? ""}
              onChange={(e) =>
                setKingdom((e.target.value || undefined) as Kingdom | undefined)
              }
              className="w-full normal-case tracking-normal font-normal"
            >
              <option value="">— unspecified —</option>
              {KINGDOMS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </label>

          <label
            className={LABEL_CLASS}
            style={{
              ...LABEL_STYLE,
              color: concrete ? "var(--text-secondary)" : "var(--text-muted)",
            }}
          >
            Genus {!concrete && "(concrete systems only)"}
            {/* Disabled is a surface step and muted ink, not an alpha (audit #29). */}
            <Select
              value={st.genus ?? ""}
              disabled={!concrete}
              onChange={(e) =>
                onChange({
                  ...st,
                  genus: (e.target.value || undefined) as Genus | undefined,
                })
              }
              className="w-full normal-case tracking-normal font-normal"
              style={
                concrete
                  ? undefined
                  : {
                      background: "var(--bg-surface)",
                      color: "var(--text-muted)",
                      cursor: "not-allowed",
                    }
              }
            >
              <option value="">— unspecified —</option>
              {GENERA.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </label>

          <label className={LABEL_CLASS} style={LABEL_STYLE}>
            Domain (optional)
            <Input
              value={st.domain ?? ""}
              onChange={(e) =>
                onChange({ ...st, domain: e.target.value || undefined })
              }
              placeholder="e.g. U.S. legislative process"
              className="w-full normal-case tracking-normal font-normal"
            />
          </label>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Author-asserted kind (Bunge's kingdom + genus) and subject domain.
            Travels with the model; it frames the analyst's narration and is
            never a systemhood verdict.
          </p>
        </div>
      </Card>
    </div>
  );
}
