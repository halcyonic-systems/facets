// The tool rail (#409 M2): the palette at rail width. Same rows as
// PaletteRail, same registry (the lens offers, the kernel decides), drawn as
// one instrument (makeover rule 21, canvas audit block 7): a 20px <Icon> in a
// 32px square with a 4px radius, an 11px word beneath, grouped by kind with a
// hairline between groups: select | place and the connect gesture | designate
// | the SL drawer pinned at the foot. The armed tool is a filled accent
// square (rule 9c); a primitive's square wears its --prim-* hue (rule 9b) and
// its full name, never the two-letter code. What the kernel draws on its own
// (boundary, ports, source and sink identity) is the interface tool's
// tooltip, since that is the tool whose result the kernel completes. The
// rail scrolls inside itself at short heights and, below 900px of width,
// becomes a strip along the stage's foot so the stage never collapses to 0.
import type { Lens } from "../kernel/types";
import { LensPalette, type PaletteTool } from "./lenses/registry";
import { PRIMITIVE_GLOSS, PRIMITIVE_WORD } from "./types";
import { useState } from "react";
import { Icon, PRIMITIVE_ICON, type IconName } from "../icons";
import { prim } from "../tokens";

/** The narrow-width strip: Tailwind arbitrary variants, so the rule lives
 *  with the element it shapes. 899 and under is the three-width test's phone
 *  and most of its Claude-in-Chrome pane. */
const STRIP = "max-[899px]:absolute max-[899px]:inset-x-0 max-[899px]:bottom-0 max-[899px]:z-10 max-[899px]:w-auto max-[899px]:flex-row max-[899px]:border-r-0 max-[899px]:border-t";

function Rule() {
  return (
    <span
      aria-hidden
      className="my-1 h-px w-8 shrink-0 max-[899px]:mx-1 max-[899px]:my-0 max-[899px]:h-8 max-[899px]:w-px"
      style={{ background: "var(--hairline)" }}
    />
  );
}

function RailButton({
  active,
  title,
  onClick,
  label,
  hue,
  children,
  testId,
  nativeTip = true,
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  label: string;
  /** The square's ink at rest: a primitive's hue, else the secondary ink. */
  hue?: string;
  children: React.ReactNode;
  testId?: string;
  /** false when a hover card beside the rail already carries the words:
      the browser's own tooltip would then appear a second later as a
      second box saying the same thing. The aria-label stays. */
  nativeTip?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={nativeTip ? title : undefined}
      aria-pressed={active}
      aria-label={title}
      className="flex w-full shrink-0 flex-col items-center gap-1 rounded-sm py-1 max-[899px]:w-16"
      data-testid={testId}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-sm ${active ? "" : "hover:bg-[var(--bg-surface)]"}`}
        style={
          active
            ? { background: "var(--accent)", color: "var(--text-on-accent)" }
            : { color: hue ?? "var(--text-secondary)" }
        }
      >
        {children}
      </span>
      <span
        className="max-w-full text-center text-[11px] leading-tight"
        style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}
      >
        {label}
      </span>
    </button>
  );
}

/** The shape a place tool stamps, from the icon set (rule 17's vocabulary). */
function placeIcon(t: PaletteTool, lens: Lens): IconName {
  if (t.verb !== "place") return "component";
  if (t.passway) return "interface";
  if (t.role === "Environment") return lens === "Mobus" ? "environment-open" : "environment";
  return "component";
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
  // The gloss card is fixed to the viewport at the hovered row, so the rail's
  // own scroll box (overflow-y) cannot clip it or grow a sideways scroll.
  const [hoverTool, setHoverTool] = useState<{ id: string; x: number; y: number; strip: boolean } | null>(null);
  const spec = LensPalette[lens];
  const derivedTip = spec.derived.length
    ? ` The kernel draws these: ${spec.derived.map((h) => h.label).join(", ")}.`
    : "";
  const word = (t: PaletteTool) => (t.id === "env-object" || t.id === "env-thing" ? "environment" : t.label.split(" ")[0]);

  return (
    <div
      className={`tool-rail flex w-20 shrink-0 flex-col border-r ${STRIP}`}
      style={{ borderColor: "var(--hairline)", background: "var(--lens-chrome)" }}
      data-testid="tool-rail"
    >
      <div
        className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-x-hidden overflow-y-auto py-2 max-[899px]:flex-row max-[899px]:overflow-x-auto max-[899px]:overflow-y-hidden max-[899px]:px-2 max-[899px]:py-1"
        style={{ scrollbarWidth: "thin" }}
      >
        <RailButton active={armed === null} title="Select: click a thing or a flow to inspect it" onClick={() => onArm(null)} label="select" testId="tool-select">
          <Icon name="select" size={20} />
        </RailButton>
        <Rule />
        {spec.place.map((t) => (
          <RailButton
            key={t.id}
            active={armed?.id === t.id}
            title={`${t.label}: ${t.tip}${t.verb === "place" && t.passway ? derivedTip : ""}`}
            onClick={() => onArm(armed?.id === t.id ? null : t)}
            label={word(t)}
            testId={`tool-${t.id}`}
          >
            <Icon name={placeIcon(t, lens)} size={20} />
          </RailButton>
        ))}
        {spec.connect.map((h) => (
          <div
            key={h.id}
            title={`${h.label}: ${h.tip} Drag the handle dot off a node.`}
            className="flex w-full shrink-0 flex-col items-center gap-1 py-1 max-[899px]:w-16"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="flex h-8 w-8 items-center justify-center">
              <Icon name="flow" size={20} />
            </span>
            <span className="text-[11px] leading-tight">flow</span>
          </div>
        ))}
        {spec.designate.length > 0 && (
          <>
            <Rule />
            {spec.designate.map((t) => {
              const primitive = t.verb === "designate" && t.designation.type === "primitive" ? t.designation.primitive : null;
              return (
                <span
                  key={t.id}
                  className="relative w-full shrink-0 max-[899px]:w-auto"
                  onPointerEnter={(e) => {
                    const row = e.currentTarget.getBoundingClientRect();
                    const rail = e.currentTarget.closest("[data-testid=tool-rail]")?.getBoundingClientRect() ?? row;
                    const strip = window.innerWidth < 900;
                    setHoverTool({ id: t.id, x: strip ? row.left : rail.right + 8, y: strip ? row.top - 8 : row.top, strip });
                  }}
                  onPointerLeave={() => setHoverTool((h) => (h?.id === t.id ? null : h))}
                >
                  <RailButton
                    active={armed?.id === t.id}
                    title={primitive ? t.tip : `${t.label}: ${t.tip}`}
                    nativeTip={false}
                    onClick={() => onArm(armed?.id === t.id ? null : t)}
                    label={primitive ?? t.label}
                    hue={primitive ? prim[primitive] : undefined}
                    testId={`tool-${t.id}`}
                  >
                    <Icon name={primitive ? PRIMITIVE_ICON[primitive] : "agent"} size={20} />
                  </RailButton>
                  {/* #418 item 4: the meaning, back inside the mode. A card beside
                      the rail, instant on hover, from the same registry: a
                      hairline edge, no shadow (rule 2). */}
                  {hoverTool?.id === t.id && t.verb === "designate" && (
                    <span
                      role="tooltip"
                      data-testid={`gloss-${primitive ?? "agent"}`}
                      className="pointer-events-none fixed z-50 block w-64 rounded-md px-2.5 py-2 text-left text-[11px] leading-snug"
                      style={{
                        left: hoverTool.x,
                        top: hoverTool.y,
                        transform: hoverTool.strip ? "translateY(-100%)" : undefined,
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--rule-strong)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {primitive ? (
                        <>
                          <span className="font-semibold" style={{ color: prim[primitive] }}>{primitive}</span>
                          <span style={{ color: "var(--text-secondary)" }}> · {PRIMITIVE_WORD[primitive]} · work process</span>
                          <br />
                          <span style={{ color: "var(--text-secondary)" }}>{PRIMITIVE_GLOSS[primitive]}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">{t.label}</span>
                          <span style={{ color: "var(--text-secondary)" }}> · a decision maker · watches a stock or a flow, commands a process</span>
                          <br />
                          <span style={{ color: "var(--text-secondary)" }}>{t.tip}</span>
                        </>
                      )}
                    </span>
                  )}
                </span>
              );
            })}
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center border-t px-1 py-1 max-[899px]:border-l max-[899px]:border-t-0" style={{ borderColor: "var(--hairline)" }}>
        <RailButton
          active={slOpen}
          title="SL: the text of this model, as a drawer over the canvas"
          onClick={onOpenSl}
          label="SL"
          testId="tool-sl"
        >
          <Icon name="braces" size={20} />
        </RailButton>
      </div>
    </div>
  );
}
