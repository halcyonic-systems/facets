// The epistemological-ladder complement (#100 harvest, from the ladder-first
// arm). The blind pick kept the math-panel-first register and demoted the
// ladder from anchor to OPT-IN complement — the judge's sentence is the spec:
// "not a great introduction… but curious what it could give me as a complement,
// once I understand it better." So the collapsed chip near the S = (T, R)
// headline is all a first visit sees, and the expansion INTRODUCES the
// vocabulary (what E/D/G/S/M mean) before it diagnoses (where this model
// stands). The position itself is the kernel's (`KlirLadder`, klir_ladder in
// Rust — Fig. 4.13 semilattice); this file typesets and explains, it judges
// nothing.
import type { KlirLadder } from "../kernel/types";

// ---- The Hasse diagram (Fig. 4.13 slice) ------------------------------------
// Columns = the S operator applied 0/1/2 times; rows = the E→D→G content axis;
// M indicated beyond. Rungs this surface cannot earn (anything with D or G —
// they need observed data) render dimmed: the ladder states its own limits.

const CHIP_W = 36;
const CHIP_H = 20;
const COLS = [0, 66, 132];
const ROW_Y: Record<string, number> = { G: 8, D: 50, E: 92 };
const AUTHORABLE = new Set(["E", "SE", "S²E"]);
const HASSE_W = COLS[2] + 66 + CHIP_W + 2;
const HASSE_H = ROW_Y.E + CHIP_H + 4;

function Chip({
  x,
  y,
  label,
  current,
  dimmed,
  dashed,
  title,
}: {
  x: number;
  y: number;
  label: string;
  current: boolean;
  dimmed: boolean;
  dashed?: boolean;
  title: string;
}) {
  return (
    <g opacity={dimmed ? 0.35 : 1}>
      <title>{title}</title>
      <rect
        x={x}
        y={y}
        width={CHIP_W}
        height={CHIP_H}
        rx={6}
        fill={current ? "var(--lens-accent-soft)" : "var(--bg-secondary)"}
        stroke={current ? "var(--lens-accent)" : "var(--border)"}
        strokeWidth={current ? 2 : 1}
        strokeDasharray={dashed ? "3 3" : undefined}
      />
      <text
        x={x + CHIP_W / 2}
        y={y + CHIP_H / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontWeight={current ? 700 : 400}
        fill={current ? "var(--text-primary)" : "var(--text-secondary)"}
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {label}
      </text>
    </g>
  );
}

function Hasse({ position }: { position: string }) {
  const chips: { label: string; cx: number; cy: number }[] = [];
  const prefixes = ["", "S", "S²"];
  for (let c = 0; c < 3; c++) {
    for (const row of ["E", "D", "G"]) {
      chips.push({ label: `${prefixes[c]}${row}`, cx: COLS[c], cy: ROW_Y[row] });
    }
  }
  const edge = (a: string, b: string) => {
    const ca = chips.find((ch) => ch.label === a)!;
    const cb = chips.find((ch) => ch.label === b)!;
    return (
      <line
        key={`${a}-${b}`}
        x1={ca.cx + CHIP_W / 2}
        y1={ca.cy + CHIP_H / 2}
        x2={cb.cx + CHIP_W / 2}
        y2={cb.cy + CHIP_H / 2}
        stroke="var(--border)"
        strokeWidth={1}
      />
    );
  };
  const covers: [string, string][] = [
    ["E", "D"],
    ["D", "G"],
    ["SE", "SD"],
    ["SD", "SG"],
    ["S²E", "S²D"],
    ["S²D", "S²G"],
    ["E", "SE"],
    ["D", "SD"],
    ["G", "SG"],
    ["SE", "S²E"],
    ["SD", "S²D"],
    ["SG", "S²G"],
  ];
  const mx = COLS[2] + 66;
  const my = ROW_Y.G;
  const belowEmpty = position === "∅";
  return (
    <svg
      width={HASSE_W}
      height={HASSE_H + (belowEmpty ? 30 : 0)}
      role="img"
      aria-label={`Klir's GSPS epistemological ladder — this model stands at ${position}`}
    >
      {covers.map(([a, b]) => edge(a, b))}
      {/* M — the metasystem operator, indicated beyond this surface. */}
      <line
        x1={COLS[2] + CHIP_W / 2}
        y1={my + CHIP_H / 2}
        x2={mx + CHIP_W / 2}
        y2={my + CHIP_H / 2}
        stroke="var(--border)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {chips.map((ch) => (
        <Chip
          key={ch.label}
          x={ch.cx}
          y={ch.cy}
          label={ch.label}
          current={ch.label === position}
          dimmed={!AUTHORABLE.has(ch.label)}
          title={
            AUTHORABLE.has(ch.label)
              ? `${ch.label} — earnable on this canvas`
              : `${ch.label} — needs observed data over a named support; arrives with the compose seam`
          }
        />
      ))}
      <Chip
        x={mx}
        y={my}
        label="M·"
        current={false}
        dimmed
        dashed
        title="M — metasystems: change of the model itself; beyond this surface"
      />
      {/* Below the ladder: nothing distinguished yet. Drawn only when true. */}
      {belowEmpty && (
        <g>
          <line
            x1={CHIP_W / 2}
            y1={ROW_Y.E + CHIP_H}
            x2={CHIP_W / 2}
            y2={ROW_Y.E + CHIP_H + 14}
            stroke="var(--lens-accent)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={CHIP_W / 2}
            y={ROW_Y.E + CHIP_H + 26}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fill="var(--lens-accent)"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            ∅
          </text>
        </g>
      )}
    </svg>
  );
}

// ---- First-contact vocabulary -----------------------------------------------
// The introduction comes BEFORE the diagnosis: a cold reader learns what the
// letters mean, then sees where the model stands. Copy paraphrases GSPS's
// hierarchy (source → data → generative under the S/M operators).

const LETTERS: [string, string][] = [
  ["E", "a source system — variables distinguished as worth observing; nothing claimed yet about how they behave"],
  ["D", "a data system — actual observed states over a named support (time, space, a population)"],
  ["G", "a generative system — a behavior function that can reproduce (and extend) the data"],
  ["S", "the structure operator — a system of systems; S² means applied twice (a part is itself structured)"],
  ["M", "the metasystem operator — the model itself changes; beyond this canvas"],
];

/** The collapsed affordance: a small "position: SE" chip for the register's
 *  headline row. Never expands on its own — first contact is one quiet chip. */
export function LadderChip({
  ladder,
  open,
  onToggle,
}: {
  ladder: KlirLadder;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="rounded-full px-2.5 py-1 text-xs"
      style={{
        fontFamily: "var(--font-mono)",
        background: open ? "var(--lens-accent-soft)" : "var(--bg-surface)",
        color: "var(--text-secondary)",
        border: `1px solid ${open ? "var(--lens-accent)" : "var(--border)"}`,
      }}
      title="Where this model stands on Klir's GSPS epistemological ladder — click for the introduction"
    >
      position: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{ladder.position}</span>{" "}
      {open ? "▾" : "▸"}
    </button>
  );
}

/** The expansion: introduce the vocabulary first, then diagnose. */
export function KlirLadderPanel({ ladder, onClose }: { ladder: KlirLadder; onClose: () => void }) {
  return (
    <div
      className="mb-4 max-w-xl rounded-md border p-3 text-xs"
      style={{ borderColor: "var(--lens-accent)", background: "var(--bg-secondary)" }}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
          Klir&rsquo;s epistemological ladder
        </span>
        <button className="rounded-full px-2 py-0.5" style={{ color: "var(--text-muted)" }} onClick={onClose}>
          close
        </button>
      </div>

      {/* 1 — the introduction: what the letters mean, before any verdict. */}
      <p className="mb-2" style={{ color: "var(--text-secondary)" }}>
        GSPS ranks models by <em>what they claim to know</em>, not by size. Every position is a letter-string
        built from five symbols:
      </p>
      <dl className="mb-3 grid gap-1" style={{ gridTemplateColumns: "auto 1fr" }}>
        {LETTERS.map(([letter, meaning]) => (
          <div key={letter} className="contents">
            <dt
              className="pr-2 text-right font-semibold"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}
            >
              {letter}
            </dt>
            <dd style={{ color: "var(--text-secondary)" }}>{meaning}</dd>
          </div>
        ))}
      </dl>

      {/* 2 — only now, the diagnosis: where THIS model stands and why. */}
      <div className="mb-1 flex items-baseline gap-2">
        <span
          className="text-lg font-bold"
          style={{ fontFamily: "var(--font-mono)", color: "var(--lens-accent)" }}
        >
          {ladder.position}
        </span>
        <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          this model&rsquo;s position — earned, not chosen
        </span>
      </div>
      <p className="mb-2" style={{ color: "var(--text-secondary)" }}>{ladder.claim}</p>
      {ladder.decomposed.length > 0 && (
        <p className="mb-2" style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
          S² evidence: {"{ "}
          {ladder.decomposed.join(", ")}
          {" }"} — each with its own (T, R)
        </p>
      )}
      <Hasse position={ladder.position} />
      <p className="mt-1" style={{ color: "var(--text-muted)" }}>
        greyed rungs need observed data over a named support — not authorable on this canvas
      </p>
      <p className="mt-2 italic" style={{ color: "var(--text-muted)" }}>
        to climb — {ladder.to_climb}
      </p>
    </div>
  );
}
