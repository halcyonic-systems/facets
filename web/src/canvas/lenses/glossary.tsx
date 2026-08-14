// Learn-while-authoring (#80): the copy that teaches a lens's edge math. Every
// gloss is sourced from the terminology concordance
// (docs/language/terminology-concordance.md) — the cited row is the primary
// trace. Two entries (× and ⊆) gloss standard set-theory operators the
// concordance writes with but never defines; they are marked derived and kept
// minimal. No systems fact is decided here — this is the pedagogy layer over
// math the kernel already computes, so an author who forgot what × means gets
// an answer instead of a wall of notation.
import { useState } from "react";
import type { Kind, Relation } from "../../kernel/types";

export interface SymbolEntry {
  /** The glyph or word as it appears in the formalism (the click target). */
  token: string;
  /** Its name in plain words. */
  title: string;
  /** One or two sentences: what it means for this edge. */
  gloss: string;
  /** Concordance trace, or the derived note for standard notation. */
  source: string;
}

// ---- Klir: the relation as a subset of T × T (rows 2, 4, 7) ----

const KLIR: Record<string, SymbolEntry> = {
  r: {
    token: "rₙ",
    title: "a relation",
    gloss:
      "The relation is the seat of systemhood. Klir folds interaction, coupling, linkage, constraint, and organization into one mathematical relation.",
    source: "concordance row 4",
  },
  subseteq: {
    token: "⊆",
    title: "is a subset of",
    gloss:
      "The relation is some selection of the possible pairs, not necessarily all of them and possibly none.",
    source: "derived: standard set notation (concordance row 4 writes R ⊆ T×T)",
  },
  T: {
    token: "T",
    title: "the set of things",
    gloss:
      "T is the set of things distinguished within the system; thinghood lives here. The Klir lens takes the things for granted and works on the relation.",
    source: "concordance row 2",
  },
  times: {
    token: "×",
    title: "Cartesian product",
    gloss:
      "T × T is the set of every ordered pair of things in T. The relation picks out which of those pairs are connected.",
    source: "derived: standard set notation (concordance row 4 writes R ⊆ T×T)",
  },
  orientation: {
    token: "neutral / directed",
    title: "orientation",
    gloss:
      "Classifying the things into inputs and outputs makes the relation directed; leaving them unclassified makes it neutral. This is the observer's choice, not a fact about the things.",
    source: "concordance row 7",
  },
};

// ---- Bunge: kind-typed directed bonds (rows 4, 5, 6, 7) ----

const BUNGE: Record<string, SymbolEntry> = {
  bond: {
    token: "bond",
    title: "a bond",
    gloss:
      "A bond is a connection that changes the things it joins. Systemhood requires at least one bond (Def 1.1).",
    source: "concordance row 5",
  },
  mere: {
    token: "mere relation",
    title: "a mere relation",
    gloss:
      "A mere relation like 'older than' holds between two things but changes neither, so it does not bond them into a system.",
    source: "concordance row 5",
  },
  acts: {
    token: "▷",
    title: "acts on",
    gloss:
      "a ▷ b reads 'a acts on b', changing b's behavior. If b does not act back, a is the agent and b the patient.",
    source: "concordance rows 4, 7",
  },
  kind: {
    token: "kind",
    title: "connection kind",
    gloss:
      "Dynamic connections are flows of energy, matter, or fields. A flow that carries information is informational.",
    source: "concordance row 6",
  },
};

/** A formalism is an ordered mix of plain text and clickable symbol entries. */
export type FormalismPart = string | SymbolEntry;

/** Klir: rₙ ⊆ T × T, plus the orientation the observer toggles. */
export function klirFormalism(sigIndex: number): FormalismPart[] {
  return [
    { ...KLIR.r, token: `r${sigIndex + 1}` },
    KLIR.subseteq,
    KLIR.T,
    KLIR.times,
    KLIR.T,
    "  ·  ",
    KLIR.orientation,
  ];
}

/** Bunge: a bond (or mere relation) that acts on its things, carrying a kind. */
export function bungeFormalism(relation: Relation): FormalismPart[] {
  const link = relation.is_bond ? BUNGE.bond : BUNGE.mere;
  return [link, "  a ", BUNGE.acts, " b  ·  ", BUNGE.kind];
}

// (mobusFormalism lived here until #336: it took no arguments — the same static
// strip for every flow — so its content moved to the formal face, stated once.)

/** The picker offers Mobus's three substances; the model still stores a Kind, so
 *  this mirrors Rust kind_to_substance (crates/bert-canvas/src/canvas.rs:64-68)
 *  in both directions. Matter↔material, Informational↔message, Energy↔energy;
 *  Field reads as energy (the many-to-one fold the kernel makes). Unspecified
 *  never reaches this map — the picker shows it as "unspecified" (an unanswered
 *  question the residue register counts), not a silent energy. */
export const SUBSTANCES = ["material", "energy", "message"] as const;
export type Substance = (typeof SUBSTANCES)[number];

export function kindToSubstance(kind: Kind): Substance {
  switch (kind) {
    case "Matter":
      return "material";
    case "Informational":
      return "message";
    default:
      return "energy";
  }
}

export function substanceToKind(s: Substance): Kind {
  switch (s) {
    case "material":
      return "Matter";
    case "message":
      return "Informational";
    case "energy":
      return "Energy";
  }
}

/** The paired name + formalism, with each symbol a click target that opens an
 *  inline explainer. One explainer open at a time; clicking a live token closes
 *  it. Presentation only — no edit path, no kernel call. */
export function FormalismLine({ parts }: { parts: FormalismPart[] }) {
  const [open, setOpen] = useState<SymbolEntry | null>(null);
  return (
    <div className="mb-2">
      <div className="mb-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
        formalism
      </div>
      <div className="font-mono text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {parts.map((part, i) =>
          typeof part === "string" ? (
            <span key={i} style={{ whiteSpace: "pre" }}>
              {part}
            </span>
          ) : (
            <SymbolToken
              key={i}
              entry={part}
              active={open === part}
              onClick={() => setOpen(open === part ? null : part)}
            />
          ),
        )}
      </div>
      {open && <Explainer entry={open} />}
    </div>
  );
}

function SymbolToken({ entry, active, onClick }: { entry: SymbolEntry; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="what is this?"
      className="font-mono text-xs"
      style={{
        color: active ? "var(--lens-accent)" : "var(--text-primary)",
        background: active ? "var(--lens-accent-soft)" : "transparent",
        borderBottom: "1px dotted var(--lens-accent)",
        borderRadius: "var(--radius-sm)",
        padding: "0 2px",
        cursor: "help",
      }}
    >
      {entry.token}
    </button>
  );
}

function Explainer({ entry }: { entry: SymbolEntry }) {
  return (
    <div
      className="mt-1.5 rounded-md p-2 text-xs leading-relaxed"
      style={{ background: "var(--bg-primary)", border: "1px solid var(--hairline)" }}
    >
      <div className="mb-0.5 font-semibold" style={{ color: "var(--text-primary)" }}>
        {entry.token} · {entry.title}
      </div>
      <div style={{ color: "var(--text-secondary)" }}>{entry.gloss}</div>
      <div className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
        {entry.source}
      </div>
    </div>
  );
}
