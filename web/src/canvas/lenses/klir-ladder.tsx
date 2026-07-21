// The Klir register surface (#100): LADDER-FIRST. A Klir model is primarily an
// epistemological claim about data commitment, so the canvas anchors on WHERE
// THIS MODEL STANDS — the E/D/G semilattice under the S/M operators (Fig. 4.13)
// with the model's position as a Klir letter-string — and the tuple listing /
// incidence matrix hang OFF that position as evidence for the claim it makes.
// Every judgment here is the kernel's (`KlirLadder`, computed in Rust); this
// file typesets it and lists model names, nothing more. Screen-space SVG,
// export-ignored (exports keep the clean (T, R) diagram).
import type { CanvasModel, KlirLadder, Thing } from "../../kernel/types";

const PANEL_W = 336;
const PAD = 14;

/** Greedy word-wrap to a character budget — text layout, no meaning. */
function wrap(s: string, max: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of s.split(" ")) {
    if (cur && (cur + " " + w).length > max) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + " " + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Cap a listing at `max` entries; the tail becomes an honest "+k more". */
function capped(xs: string[], max: number): string[] {
  return xs.length <= max ? xs : [...xs.slice(0, max), `…+${xs.length - max} more`];
}

// ---- The Hasse diagram (Fig. 4.13 slice) ------------------------------------
// Columns = the S operator applied 0/1/2 times; rows = the E→D→G content axis;
// M indicated beyond. Rungs this surface cannot earn (anything with D or G —
// they need observed data) render dimmed: the ladder states its own limits.

const CHIP_W = 36;
const CHIP_H = 20;
const COLS = [0, 66, 132];
const ROW_Y: Record<string, number> = { G: 8, D: 50, E: 92 };
const AUTHORABLE = new Set(["E", "SE", "S²E"]);
const HASSE_H = 118;

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
        fill={current ? "var(--accent-soft)" : "var(--bg-secondary)"}
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
        className="font-mono"
      >
        {label}
      </text>
    </g>
  );
}

function Hasse({ x, y, position }: { x: number; y: number; position: string }) {
  const chips: { label: string; cx: number; cy: number }[] = [];
  const prefixes = ["", "S", "S²"];
  for (let c = 0; c < 3; c++) {
    for (const row of ["E", "D", "G"]) {
      chips.push({ label: `${prefixes[c]}${row}`, cx: x + COLS[c], cy: y + ROW_Y[row] });
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
  const mx = x + COLS[2] + 66;
  const my = y + ROW_Y.G;
  return (
    <g>
      {covers.map(([a, b]) => edge(a, b))}
      {/* M — the metasystem operator, indicated beyond this surface. */}
      <line
        x1={x + COLS[2] + CHIP_W / 2}
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
      {position === "∅" && (
        <g>
          <line
            x1={x + CHIP_W / 2}
            y1={y + ROW_Y.E + CHIP_H}
            x2={x + CHIP_W / 2}
            y2={y + ROW_Y.E + CHIP_H + 14}
            stroke="var(--lens-accent)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={x + CHIP_W / 2}
            y={y + ROW_Y.E + CHIP_H + 24}
            textAnchor="middle"
            fontSize={11}
            fontWeight={700}
            fill="var(--lens-accent)"
            className="font-mono"
          >
            ∅
          </text>
        </g>
      )}
    </g>
  );
}

// ---- The evidence listings --------------------------------------------------

function relationPairs(model: CanvasModel): string[] {
  const name = (id: number) => model.things.find((t) => t.id === id)?.name ?? `#${id}`;
  return model.relations.map((r) => `(${name(r.a)} ${r.klir_directed ? "→" : "–"} ${name(r.b)})`);
}

/** Incidence-matrix geometry: shown as evidence for the structure claim when T
 *  is small enough to read (2–8 things) and vertical room allows. */
const CELL = 15;
const MATRIX_LABEL_W = 26;

function matrixHeight(n: number): number {
  return 14 + 12 + n * CELL + 8;
}

function Matrix({ x, y, model }: { x: number; y: number; model: CanvasModel }) {
  const things = model.things;
  const abbrev = (t: Thing) => t.name.slice(0, 2);
  const gx = x + MATRIX_LABEL_W;
  const gy = y + 26;
  // Presence over T×T from the drawn relations: a neutral relation is an
  // unordered pair (both cells); a directed one fills (a, b) only.
  const filled = new Set<string>();
  for (const r of model.relations) {
    filled.add(`${r.a}:${r.b}`);
    if (!r.klir_directed) filled.add(`${r.b}:${r.a}`);
  }
  return (
    <g>
      <text x={x} y={y + 10} fontSize={9} fill="var(--text-muted)" className="font-mono">
        R ⊆ T×T — incidence
      </text>
      {things.map((t, j) => (
        <text
          key={`c${t.id}`}
          x={gx + j * CELL + CELL / 2}
          y={gy - 3}
          textAnchor="middle"
          fontSize={7}
          fill="var(--text-muted)"
          className="font-mono"
        >
          {abbrev(t)}
        </text>
      ))}
      {things.map((t, i) => (
        <text
          key={`r${t.id}`}
          x={gx - 4}
          y={gy + i * CELL + CELL / 2}
          textAnchor="end"
          dominantBaseline="central"
          fontSize={7}
          fill="var(--text-muted)"
          className="font-mono"
        >
          {abbrev(t)}
        </text>
      ))}
      {things.map((row, i) =>
        things.map((col, j) => (
          <rect
            key={`${row.id}:${col.id}`}
            x={gx + j * CELL}
            y={gy + i * CELL}
            width={CELL - 1}
            height={CELL - 1}
            fill={filled.has(`${row.id}:${col.id}`) ? "var(--lens-accent)" : "none"}
            fillOpacity={0.7}
            stroke="var(--hairline)"
            strokeWidth={0.75}
          />
        )),
      )}
    </g>
  );
}

// ---- The panel --------------------------------------------------------------

interface Props {
  model: CanvasModel;
  ladder: KlirLadder;
  x: number;
  y: number;
  /** Vertical room in the viewport — the matrix yields first when tight. */
  maxHeight: number;
}

/** The ladder-first Klir panel: position headline → Hasse → evidence → climb. */
export function KlirLadderPanel({ model, ladder, x, y, maxHeight }: Props) {
  const claimLines = wrap(ladder.claim, 52);
  const tNames = capped(
    model.things.map((t) => t.name),
    10,
  );
  const tLines = wrap(`T = { ${tNames.join(", ")} }`.replace("{  }", "∅"), 50);
  const rPairs = capped(relationPairs(model), 6);
  const rLines = wrap(model.relations.length ? `R = { ${rPairs.join(", ")} }` : "R = ∅", 50);
  const climbLines = wrap(`to climb — ${ladder.to_climb}`, 56); // GSPS sense
  const decomposedList = `{ ${capped(ladder.decomposed, 6).join(", ")} }`; // GSPS evidence

  const hasseH = HASSE_H + (ladder.position === "∅" ? 30 : 0) + 18;
  const evidenceH = 16 + (tLines.length + rLines.length) * 14 + (ladder.decomposed.length ? 14 : 0) + 6;
  const wantMatrix = model.things.length >= 2 && model.things.length <= 8 && model.relations.length > 0;
  const baseH =
    PAD + 40 + claimLines.length * 15 + 8 + hasseH + evidenceH + climbLines.length * 13 + 10 + PAD;
  const showMatrix = wantMatrix && baseH + matrixHeight(model.things.length) <= maxHeight;
  const panelH = baseH + (showMatrix ? matrixHeight(model.things.length) : 0);

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  // A running y-cursor, in panel-local coordinates.
  let cy = PAD + 30;
  const claimY = cy + 14;
  cy = claimY + claimLines.length * 15 + 8;
  const hasseY = cy;
  cy += hasseH;
  const evidenceY = cy;
  cy = evidenceY + 16;
  const tY = cy;
  cy += tLines.length * 14;
  const rY = cy;
  cy += rLines.length * 14;
  const decompY = cy;
  if (ladder.decomposed.length) cy += 14;
  cy += 6;
  const matrixY = cy;
  if (showMatrix) cy += matrixHeight(model.things.length);
  const climbY = cy + 10;

  return (
    <g
      data-export-ignore
      data-klir-ladder
      pointerEvents="auto"
      transform={`translate(${x}, ${y})`}
      onPointerDown={stop}
      onPointerUp={stop}
      onClick={stop}
      onDoubleClick={stop}
    >
      <rect
        width={PANEL_W}
        height={panelH}
        rx={12}
        fill="var(--bg-primary)"
        fillOpacity={0.95}
        stroke="var(--hairline)"
      />
      {/* Headline: the model's epistemological identity, first thing seen. */}
      <text x={PAD} y={PAD + 26} fontSize={30} fontWeight={700} fill="var(--lens-accent)" className="font-mono">
        {ladder.position}
      </text>
      <text x={PAD + 92} y={PAD + 12} fontSize={9} fill="var(--text-muted)" className="font-mono">
        epistemological position
      </text>
      <text x={PAD + 92} y={PAD + 24} fontSize={9} fill="var(--text-muted)" className="font-mono">
        Klir's ladder — Fig. 4.13
      </text>
      {claimLines.map((l, i) => (
        <text key={i} x={PAD} y={claimY + i * 15} fontSize={11} fill="var(--text-secondary)">
          {l}
        </text>
      ))}
      <Hasse x={PAD + 18} y={hasseY} position={ladder.position} />
      <text x={PAD} y={hasseY + hasseH - 4} fontSize={9} fill="var(--text-muted)">
        greyed rungs need observed data — not authorable on this canvas
      </text>
      <text
        x={PAD}
        y={evidenceY + 8}
        fontSize={9}
        fill="var(--text-muted)"
        style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
      >
        evidence for the claim
      </text>
      {tLines.map((l, i) => (
        <text key={`t${i}`} x={PAD} y={tY + 10 + i * 14} fontSize={10} fill="var(--text-primary)" className="font-mono">
          {l}
        </text>
      ))}
      {rLines.map((l, i) => (
        <text key={`r${i}`} x={PAD} y={rY + 10 + i * 14} fontSize={10} fill="var(--text-primary)" className="font-mono">
          {l}
        </text>
      ))}
      {ladder.decomposed.length > 0 && (
        <text x={PAD} y={decompY + 10} fontSize={10} fill="var(--text-primary)" className="font-mono">
          S² ↓ {decomposedList} — own (T, R)
        </text>
      )}
      {showMatrix && <Matrix x={PAD} y={matrixY} model={model} />}
      {climbLines.map((l, i) => (
        <text
          key={`c${i}`}
          x={PAD}
          y={climbY + i * 13}
          fontSize={10}
          fontStyle="italic"
          fill="var(--text-muted)"
        >
          {l}
        </text>
      ))}
    </g>
  );
}

export { PANEL_W as KLIR_PANEL_W };
