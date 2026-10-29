// The front door's language figure (the entry pass, 2026-10-27): one fixed
// shape, something outside, an interface, a component inside the system, an
// interface, something outside, read either in the language's own words or in
// one public model's words. The readings live in languageReadings.ts; this file
// only draws whichever one is picked, so adding a model is a data change.
import { useState, type CSSProperties } from "react";
import { Icon } from "./icons";
import { GENERIC_READING, LANGUAGE_READINGS, type FlowKind, type LanguageReading } from "./languageReadings";

const KIND_VAR: Record<FlowKind, string> = {
  matter: "var(--kind-matter)",
  energy: "var(--kind-energy)",
  informational: "var(--kind-informational)",
};

const ink = { fill: "none", stroke: "var(--text-primary)", strokeWidth: 2 } as const;
const wordStyle: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: "var(--t-sm)",
  fill: "var(--text-primary)",
};
const keyStyle: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "var(--t-meta)", fill: "var(--accent)" };
const LINE = 16;
const KEY_LINE = 15;

/** A long name breaks at the space nearest its middle, so a model's names fit
 *  the slots the generic words were drawn for. */
export function wrapName(s: string, max = 12): string[] {
  if (s.length <= max || !s.includes(" ")) return [s];
  const mid = s.length / 2;
  let best = -1;
  for (let i = 0; i < s.length; i++) if (s[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return [s.slice(0, best), s.slice(best + 1)];
}

/** A name where it sits on the drawing, with its SL keyword. `above` hangs the
 *  label so its keyword sits on `y`; `below` starts the name at `y`. */
function Term({
  x,
  y,
  name,
  sl,
  kind,
  place,
  max = 12,
}: {
  x: number;
  y: number;
  name: string;
  sl: string;
  /** A flow's kind, a third line in the kind's own colour, so the colour of
   *  the arrow is never the only thing that says it (rule 12). */
  kind?: FlowKind;
  place: "above" | "below";
  /** Longest name kept on one line. The system's name sits over open space
   *  and never breaks. */
  max?: number;
}) {
  const lines = wrapName(name, max);
  const first = place === "above" ? y - KEY_LINE - (lines.length - 1) * LINE : y + 12;
  return (
    <text x={x} y={first} textAnchor="middle">
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : LINE} style={wordStyle}>
          {l}
        </tspan>
      ))}
      <tspan x={x} dy={KEY_LINE} style={keyStyle}>
        {sl}
      </tspan>
      {kind && (
        <tspan x={x} dy={KEY_LINE} style={{ ...keyStyle, fill: KIND_VAR[kind] }}>
          {kind}
        </tspan>
      )}
    </text>
  );
}

const R = { cx: 260, cy: 146, rx: 108, ry: 104 };
const IN_X = R.cx - R.rx;
const OUT_X = R.cx + R.rx;
const START_X = 22;
const END_X = 498;
const H = 18;

/** Outside the system: Mobus's open square for a source or a sink, open toward
 *  the system; a closed square for an environment object. */
function Outside({ x, keyword, side }: { x: number; keyword: string; side: "left" | "right" }) {
  const [y0, y1] = [R.cy - H, R.cy + H];
  if (keyword === "environment") {
    return <rect x={x - H} y={y0} width={H * 2} height={H * 2} style={{ ...ink, fill: "var(--bg-primary)" }} />;
  }
  const d =
    side === "left"
      ? `M${x + H},${y0} H${x - H} V${y1} H${x + H}`
      : `M${x - H},${y0} H${x + H} V${y1} H${x - H}`;
  return <path d={d} style={ink} />;
}

export function LanguageFigure({ reading }: { reading: LanguageReading }) {
  const r = reading;
  const leg = (x0: number, x1: number, kind: FlowKind) => (
    <path
      d={`M${x0},${R.cy} H${x1}`}
      markerEnd={`url(#lang-arrow-${kind})`}
      style={{ fill: "none", stroke: KIND_VAR[kind], strokeWidth: 2.5, strokeDasharray: kind === "informational" ? "6 5" : undefined }}
    />
  );
  const sentence =
    `${r.start.name} sends ${r.flowIn.name.toLowerCase()} across ${r.inPort} to ${r.component} inside ${r.system}, ` +
    `and ${r.flowOut.name.toLowerCase()} leaves across ${r.outPort} to ${r.end.name}.`;
  return (
    <svg viewBox="-24 0 568 266" className="block h-auto w-full" role="img" aria-label={sentence}>
      <defs>
        {(Object.keys(KIND_VAR) as FlowKind[]).map((k) => (
          <marker key={k} id={`lang-arrow-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" style={{ fill: KIND_VAR[k] }} />
          </marker>
        ))}
      </defs>
      <ellipse cx={R.cx} cy={R.cy} rx={R.rx} ry={R.ry} style={{ ...ink, fill: "var(--bg-primary)" }} />
      {leg(START_X + H + 4, IN_X - 12, r.flowIn.kind)}
      {leg(IN_X + 9, R.cx - 34, r.flowIn.kind)}
      {leg(R.cx + 30, OUT_X - 12, r.flowOut.kind)}
      {leg(OUT_X + 9, END_X - H - 6, r.flowOut.kind)}
      <Outside x={START_X} keyword={r.start.keyword} side="left" />
      <Outside x={END_X} keyword={r.end.keyword} side="right" />
      {[IN_X, OUT_X].map((x) => (
        <rect key={x} x={x - 8} y={R.cy - 8} width={16} height={16} style={{ ...ink, fill: "var(--bg-secondary)" }} />
      ))}
      <circle
        cx={R.cx}
        cy={R.cy}
        r={28}
        style={{
          fill: "color-mix(in srgb, var(--prim-amplifying) 16%, var(--bg-secondary))",
          stroke: "var(--prim-amplifying)",
          strokeWidth: 2.5,
        }}
      />
      <Term x={R.cx} y={R.cy - R.ry - 10} name={r.system} sl="system" place="above" max={40} />
      <Term x={START_X} y={R.cy - 28} name={r.start.name} sl={r.start.keyword} place="above" />
      <Term x={IN_X - 34} y={R.cy - 28} name={r.inPort} sl="interface" place="above" />
      <Term x={OUT_X + 34} y={R.cy - 28} name={r.outPort} sl="interface" place="above" />
      <Term x={END_X} y={R.cy - 28} name={r.end.name} sl={r.end.keyword} place="above" />
      <Term x={(START_X + IN_X) / 2 + 6} y={R.cy + 14} name={r.flowIn.name} sl="flow" kind={r.flowIn.kind} place="below" />
      <Term x={R.cx} y={R.cy + 38} name={r.component} sl="component" place="below" />
      <Term x={(OUT_X + END_X) / 2 - 6} y={R.cy + 14} name={r.flowOut.name} sl="flow" kind={r.flowOut.kind} place="below" />
    </svg>
  );
}

/** The language panel: the switch, the figure, a line under it, and, on a
 *  model's reading, the door into that model. */
export function LanguagePanel({ onOpenModel }: { onOpenModel?: (model: string) => void }) {
  const [reading, setReading] = useState<LanguageReading>(GENERIC_READING);
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Read the figure as">
        {LANGUAGE_READINGS.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={r.id === reading.id}
            onClick={() => setReading(r)}
            className="lang-tab inline-flex h-8 items-center rounded-sm border px-3 text-sm font-medium"
          >
            {r.tab}
          </button>
        ))}
      </div>
      {/* Below about 480px the labels would shrink past reading size, so a
          phone scrolls the figure sideways inside its own box instead. */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="min-w-[480px]">
          <LanguageFigure reading={reading} />
        </div>
      </div>
      {/* A fixed height under the figure, so switching readings never moves
          the page: the generic sentence or the model line and its door. */}
      <div className="min-h-20">
        <p className="mt-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
          {reading.model
            ? `The same shapes, named as the ${reading.system} model names them.`
            : "A source sends a flow across an interface to a component inside the system, and on to a sink."}
        </p>
        {reading.model && onOpenModel && (
          <button
            type="button"
            onClick={() => onOpenModel(reading.model!)}
            className="home-quiet-link -mx-2 mt-2 inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-sm font-medium"
            style={{ color: "var(--accent)" }}
          >
            Open the {reading.system} model
            <Icon name="forward" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
