// The tool rail (#409 M2): the palette at 56px. Same rows as PaletteRail, same
// registry (the lens offers, the kernel decides), drawn as icons with their
// names as tooltips: select, then the place tools, then the connect gesture,
// a rule, then the primitives. What the kernel draws on its own (boundary,
// ports, source and sink identity) is no longer a section; it is the interface
// tool's tooltip, since that is the tool whose result the kernel completes.
// At the foot, the SL text as a drawer over the canvas.
import type { Lens } from "../kernel/types";
import { LensPalette, type PaletteTool } from "./lenses/registry";
import { PRIMITIVE_GLOSS } from "./types";
import { useState } from "react";
import { GestureGlyph, GlyphChip, PasswayChip, RoleChip } from "./PaletteRail";

function SelectGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden>
      <path d="M3 2 L13 8 L8.5 9.2 L11 14 L9.2 14.8 L6.8 10 L3 13 Z" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinejoin="round" />
    </svg>
  );
}

function RailButton({
  active,
  title,
  onClick,
  label,
  children,
  testId,
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  label?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      aria-label={title}
      className="flex w-12 flex-col items-center gap-0.5 rounded-md py-1.5"
      style={{
        background: active ? "var(--lens-accent)" : "transparent",
        color: active ? "var(--text-on-accent)" : "var(--text-secondary)",
      }}
      data-testid={testId}
    >
      <span className="[&>svg]:mr-0">{children}</span>
      {label && <span className="text-[9px] leading-none">{label}</span>}
    </button>
  );
}

export function ToolRail({
  lens,
  armed,
  onArm,
  onOpenSl,
  slOpen,
}: {
  lens: Lens;
  armed: PaletteTool | null;
  onArm: (tool: PaletteTool | null) => void;
  onOpenSl: () => void;
  slOpen: boolean;
}) {
  const [hoverTool, setHoverTool] = useState<string | null>(null);
  const spec = LensPalette[lens];
  const derivedTip = spec.derived.length
    ? ` The kernel draws these: ${spec.derived.map((h) => h.label).join(", ")}.`
    : "";
  const shortLabel = (t: PaletteTool) => (t.id === "env-object" ? "environ." : t.label.split(" ")[0]);

  return (
    <div
      className="flex w-14 shrink-0 flex-col items-center gap-1 border-r py-2"
      style={{ borderColor: "var(--hairline)", background: "var(--lens-chrome)" }}
      data-testid="tool-rail"
    >
      <RailButton active={armed === null} title="Select: click a thing or a flow to inspect it" onClick={() => onArm(null)} label="select" testId="tool-select">
        <SelectGlyph />
      </RailButton>
      {spec.place.map((t) => (
        <RailButton
          key={t.id}
          active={armed?.id === t.id}
          title={`${t.label}: ${t.tip}${t.verb === "place" && t.passway ? derivedTip : ""}`}
          onClick={() => onArm(armed?.id === t.id ? null : t)}
          label={shortLabel(t)}
          testId={`tool-${t.id}`}
        >
          {t.verb === "place" && (t.passway ? <PasswayChip /> : <RoleChip role={t.role === "Environment" ? "Environment" : "Component"} />)}
        </RailButton>
      ))}
      {spec.connect.map((h) => (
        <div
          key={h.id}
          title={`${h.label}: ${h.tip} Drag the handle dot off a node.`}
          className="flex w-12 flex-col items-center gap-0.5 py-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="[&>svg]:mr-0">
            <GestureGlyph />
          </span>
          <span className="text-[9px] leading-none">flow</span>
        </div>
      ))}
      {spec.designate.length > 0 && (
        <>
          <span aria-hidden className="my-1 h-px w-8" style={{ background: "var(--hairline)" }} />
          {spec.designate.map((t) => (
            <span
              key={t.id}
              className="group relative"
              onPointerEnter={() => setHoverTool(t.id)}
              onPointerLeave={() => setHoverTool((h) => (h === t.id ? null : h))}
            >
              <RailButton
                active={armed?.id === t.id}
                title={`${t.label}: ${t.tip}`}
                onClick={() => onArm(armed?.id === t.id ? null : t)}
                testId={`tool-${t.id}`}
              >
                {t.verb === "designate" && t.designation.type === "primitive" ? (
                  <span className="flex items-center text-[10px]">
                    <GlyphChip primitive={t.designation.primitive} />
                    {t.label}
                  </span>
                ) : (
                  <span className="text-[10px]">{t.label}</span>
                )}
              </RailButton>
              {/* #418 item 4: the meaning, back inside the mode. The palette
                  panel that carried the primitives' one-line glosses retired
                  to this rail (#410), and a two-letter stamp with a native
                  tooltip taught nobody what Buffering is. A card beside the
                  rail, instant on hover, from the same registry. */}
              {hoverTool === t.id && t.verb === "designate" && t.designation.type === "primitive" && (
                <span
                  role="tooltip"
                  data-testid={`gloss-${t.designation.primitive}`}
                  className="pointer-events-none absolute left-full top-0 z-20 ml-2 block w-64 rounded-md px-2.5 py-2 text-left text-[11px] leading-snug"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)", boxShadow: "var(--shadow-card)" }}
                >
                  <span className="font-semibold">{t.designation.primitive}</span>
                  <span style={{ color: "var(--text-secondary)" }}> · work process</span>
                  <br />
                  <span style={{ color: "var(--text-secondary)" }}>{PRIMITIVE_GLOSS[t.designation.primitive]}</span>
                </span>
              )}
            </span>
          ))}
        </>
      )}
      <span className="flex-1" />
      <RailButton
        active={slOpen}
        title="SL: the text of this model, as a drawer over the canvas"
        onClick={onOpenSl}
        label="SL"
        testId="tool-sl"
      >
        <span className="font-mono text-[11px] font-semibold">{"{ }"}</span>
      </RailButton>
    </div>
  );
}
