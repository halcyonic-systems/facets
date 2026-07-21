// The left-rail authoring palette — the lens's VERB LIST, grouped by birth
// mode (lens-palettes.md § The authoring palette). Rows come from
// LensPalette[lens] and nothing else: absence is ontology, so switching lens
// adds/removes rows the way it adds/sheds rendered structure. The rail offers,
// the kernel decides — no legality is computed here.
import type { Lens, ProcessPrimitive } from "../kernel/types";
import { LensPalette, type PaletteHint, type PaletteTool } from "./lenses/registry";
import { primitiveGlyph } from "./lenses/primitive-glyphs";
import { STYLE } from "./style";
import { ToolButton } from "../ui";

/** The primitive's own glyph on its rail row (#100 phase 4): picking a
 *  primitive stamps this drawing as the component's face, so the rail shows
 *  the thing you are placing, not just a two-letter code. */
function GlyphChip({ primitive }: { primitive: ProcessPrimitive }) {
  return (
    <svg width={14} height={14} viewBox="-7.5 -7.5 15 15" aria-hidden className="mr-1 inline-block align-[-2px]">
      <g fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        {primitiveGlyph(primitive)}
      </g>
    </svg>
  );
}

export function PaletteRail({
  lens,
  armed,
  onArm,
}: {
  lens: Lens;
  armed: PaletteTool | null;
  /** Arm a tool; arming the already-armed tool disarms (pass null). */
  onArm: (tool: PaletteTool | null) => void;
}) {
  const spec = LensPalette[lens];

  const toolRow = (t: PaletteTool) => (
    <ToolButton
      key={t.id}
      active={armed?.id === t.id}
      title={t.tip}
      onClick={() => onArm(armed?.id === t.id ? null : t)}
    >
      {t.verb === "designate" && t.designation.type === "primitive" && (
        <GlyphChip primitive={t.designation.primitive} />
      )}
      {t.label}
    </ToolButton>
  );

  const hintRow = (h: PaletteHint) => (
    <div
      key={h.id}
      title={h.tip}
      className="px-2.5 py-1 text-xs"
      style={{ color: "var(--text-muted)", border: "1px dashed var(--border)", borderRadius: STYLE.chipRx }}
    >
      {h.label}
    </div>
  );

  return (
    <div
      className="absolute left-3 top-3 z-10 flex max-h-[calc(100%-1.5rem)] w-40 flex-col gap-3 overflow-y-auto p-3"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
        borderRadius: STYLE.dockRadius,
      }}
    >
      {spec.place.length > 0 && (
        <Section label="place">
          {spec.place.map(toolRow)}
        </Section>
      )}
      {spec.designate.length > 0 && (
        <Section label="designate">
          <div className="flex flex-wrap gap-1">{spec.designate.map(toolRow)}</div>
        </Section>
      )}
      {spec.connect.length > 0 && (
        <Section label="connect">
          {spec.connect.map(hintRow)}
        </Section>
      )}
      {spec.derived.length > 0 && (
        <Section label="derived — computed">
          {spec.derived.map(hintRow)}
        </Section>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--lens-accent)" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
