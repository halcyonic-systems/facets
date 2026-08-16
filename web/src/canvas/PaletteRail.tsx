// The left-rail authoring palette — the lens's VERB LIST, grouped by birth
// mode (lens-palettes.md § The authoring palette). Rows come from
// LensPalette[lens] and nothing else: absence is ontology, so switching lens
// adds/removes rows the way it adds/sheds rendered structure. The rail offers,
// the kernel decides — no legality is computed here.
import { useState } from "react";
import type { Lens, ProcessPrimitive } from "../kernel/types";
import { LensPalette, type PaletteHint, type PaletteTool } from "./lenses/registry";
import { primitiveGlyph } from "./lenses/primitive-glyphs";
import { ProcessReference } from "./ProcessReference";
import { Popover, ToolButton } from "../ui";

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

/** Place-verb glyphs (walkthrough #1): the shape you are placing — a circle
 *  for a component (inside the boundary), a square for an environment thing
 *  (the ring's visual grammar). Keyed on the registry's `role`, so every lens
 *  inherits icons-first rows without per-lens code. */
function RoleChip({ role }: { role: "Component" | "Environment" }) {
  return (
    <svg width={14} height={14} viewBox="-7.5 -7.5 15 15" aria-hidden className="mr-1 inline-block align-[-2px]">
      <g fill="none" stroke="currentColor" strokeWidth={1.4}>
        {role === "Component" ? <circle r={5.2} /> : <rect x={-5} y={-5} width={10} height={10} rx={1.5} />}
      </g>
    </svg>
  );
}

/** The connect gesture, illustrated (walkthrough #2): a node with its handle
 *  dot and the drag arrow — the row teaches the gesture instead of naming a
 *  verb it cannot arm. */
function GestureGlyph() {
  return (
    <svg width={26} height={14} viewBox="0 0 26 14" aria-hidden className="mr-1 inline-block align-[-2px]">
      <g fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round">
        <circle cx={5} cy={7} r={3.6} />
        <circle cx={9.2} cy={7} r={1.4} fill="currentColor" stroke="none" />
        <path d="M11.5 7 H 21" strokeDasharray="2 2" />
        <path d="M19 4.6 L 22.5 7 L 19 9.4" />
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
  const [showRef, setShowRef] = useState(false);

  // Three row KINDS, visually unmistakable (walkthrough #6): a TOOL is a
  // button (icon-first, arms on click), a GESTURE is an illustrated hint (you
  // do it on the canvas, not here), a FACT is flat text (the kernel computed
  // it; there is nothing to do). The taxonomy was always the doctrine — the
  // 1px solid-vs-dashed border was just too quiet to carry it.
  const toolRow = (t: PaletteTool) => (
    <ToolButton
      key={t.id}
      active={armed?.id === t.id}
      title={t.tip}
      onClick={() => onArm(armed?.id === t.id ? null : t)}
    >
      {t.verb === "place" && <RoleChip role={t.role === "Environment" ? "Environment" : "Component"} />}
      {t.verb === "designate" && t.designation.type === "primitive" && (
        <GlyphChip primitive={t.designation.primitive} />
      )}
      {t.label}
    </ToolButton>
  );

  const gestureRow = (h: PaletteHint) => (
    <div
      key={h.id}
      title={h.tip}
      className="flex items-center px-1 py-0.5 text-xs"
      style={{ color: "var(--text-muted)" }}
    >
      <GestureGlyph />
      {h.label}
    </div>
  );

  const factRow = (h: PaletteHint) => (
    <div key={h.id} title={h.tip} className="px-1 text-xs" style={{ color: "var(--text-muted)" }}>
      {h.label}
    </div>
  );

  return (
    <>
      {/* A plain flow column: the rail lives inside PaletteDock, which owns the
          chrome (header, border, background) and the scroll. The old floating-
          card styling (absolute + own background/shadow) painted the rail over
          the dock's "palette" header. */}
      <div className="flex flex-col gap-3 p-3">
        {spec.place.length > 0 && (
          <Section label="place">
            {spec.place.map(toolRow)}
          </Section>
        )}
        {spec.designate.length > 0 && (
          <Section
            label="designate"
            // The process-vocabulary reference (#100) opens FROM the section it
            // documents — an ≡ affordance beside the label, not a stray button
            // at the rail's foot. Still registry-gated: it renders exactly when
            // this lens's palette offers primitive designation (Mobus today),
            // so Klir and Bunge never speak "primitive" (absence is ontology).
            action={
              spec.designate.some((t) => t.verb === "designate" && t.designation.type === "primitive") ? (
                <span className="relative">
                  <button
                    className="text-[10px] font-semibold"
                    style={{ color: "var(--text-muted)" }}
                    onClick={() => setShowRef((v) => !v)}
                    title="The ten process primitives, on one surface"
                  >
                    {showRef ? "× reference" : "≡ reference"}
                  </button>
                  {showRef && (
                    /* x offset ≈ the dock's width: the reference opens BESIDE
                       the rail (its historical home), not over it — the
                       popover's zero-size anchor sits at the button. */
                    <Popover x={180} y={0} width={288} prefer="right">
                      <div
                        className="mb-2 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: "var(--lens-accent)" }}
                      >
                        processes — the vocabulary
                      </div>
                      <ProcessReference />
                    </Popover>
                  )}
                </span>
              ) : undefined
            }
          >
            <div className="flex flex-wrap gap-1">{spec.designate.map(toolRow)}</div>
          </Section>
        )}
        {spec.connect.length > 0 && (
          <Section label="connect — a gesture">
            {spec.connect.map(gestureRow)}
            <div className="px-1 text-[10px] leading-snug" style={{ color: "var(--text-muted)", opacity: 0.8 }}>
              drag the handle dot off a node
            </div>
          </Section>
        )}
        {spec.derived.length > 0 && (
          <Section label="the kernel draws these">
            {spec.derived.map(factRow)}
            <div className="px-1 text-[10px] leading-snug" style={{ color: "var(--text-muted)", opacity: 0.8 }}>
              computed from your structure — nothing to place
            </div>
          </Section>
        )}
      </div>
    </>
  );
}

function Section({
  label,
  action,
  children,
}: {
  label: string;
  /** An optional affordance beside the label — e.g. the designate section's
   *  process-reference toggle, which belongs with what it documents. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex w-full items-baseline justify-between">
        <div
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--lens-accent)" }}
        >
          {label}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
