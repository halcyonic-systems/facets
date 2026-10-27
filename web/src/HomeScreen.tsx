// The home screen — a menu with three doors, not a modal stacked on an empty
// canvas. Two levels, one surface:
//
//   home     Start (Draw your system · Describe your system) · Continue (Open a model)
//            · Try (Sandbox) — documentation and provenance in the colophon
//   library  DOORS: what you had open last, the shelves of ours cut by lens or
//            by domain, your own saved models, a file — and, one control away,
//            the flat ledger of everything
//
// The library used to open on that ledger: one flat list of every model, with
// a facet filter above it. The list was right about what a library IS and
// wrong about what opening one is FOR. Forty rows in one column answers "show
// me everything" — a question a returning reader never asks. What they ask is
// "where was I", or "what does the Mobus lens look like", or "what have I got
// about ecosystems", and each of those is a DOOR.
//
// So the page is doors now, in the order those questions get asked: Recent,
// then ours (cut by the reading a model is transcribed under, or by the
// subject it is about — one toggle, remembered), then yours, then a file. The
// ledger keeps every line it had and sits behind "browse all as a list",
// because it is still the only view that shows the whole library at once and
// the only one that has room for citations and tags.
//
// Two facts the doors need that the ledger did not: what was opened WHEN
// (recent.ts — per-reader, so it cannot live where the models live) and what a
// saved copy was made FROM (a `from` on the library record, set at the save
// that makes the copy and carried forward). Neither touches the model format.
//
// The examples/corpus separation is still the point: an example is ours, a
// corpus entry is an author's. The CITATION LINE is what tells them apart, and
// it reads in the list view, on identical rows.
//
// Visual language: docs/design/visual-language.md. A white sheet on a neutral
// ground, hairline rules for structure, and colour ONLY where it names
// something: a Pill tone marks a capability or a provenance (rule 9d), the
// accent marks a selected filter, --world-* names a tradition and --chart-*
// a genus.
//
// The printed-page devices this surface briefly carried (a rubric rule opening
// every title block, a display serif on the masthead, roman folios, a narrow
// measure) came from a design brief, not from a stated preference, and were
// withdrawn 2026-08-12 when asked about directly.
//
// Names keep their authored case — never text-transform (the model is named
// `hal`, not `HAL`).
//
// Makeover slice C (2026-10-26, docs/design/makeover-2026-10.md): the type sits
// on the eight --t-* tokens (rule 5), every control is a primitive from ui.tsx
// or a real link at the 24px floor (rules 10, 11), every glyph is an <Icon>
// (rule 14), cards are 8px with a hairline edge (rules 2, 3), and the page
// reflows at 390 (rule 16). The --paper/--ink names stay as aliases in
// index.css; this file reads --bg-* and --text-*.
import { useState, useRef, useEffect, type CSSProperties, type ReactNode } from "react";
import type { Demo } from "./demos";
import type { CorpusEntry } from "./corpus";
import type { LibraryNode } from "./libraryTree";
import { draftedModels, type DraftedModel } from "./drafted";
import {
  facets,
  featured,
  matchesFacet,
  matchesQuery,
  shelves,
  shippedModels,
  type Arrange,
  type Facet,
  type Shelf,
  type ShippedModel,
  type Tag,
} from "./home";
import { noteArrange, readArrange, readRecent, type RecentEntry } from "./recent";
import { libraryAllEnabled } from "./libraryFlag";
import { openExternal } from "./desktop";
import { buildInfo, provenanceLines } from "./buildInfo";
import Thumbnail from "./canvas/Thumbnail";
import { useThumbnailModel } from "./canvas/useThumbnail";
import { Icon } from "./icons";
import { Button, Input, Pill, type Tone } from "./ui";

// The rendered docs on the site (#368): the LIVE doc set, published with the
// rest of facets.systems by scripts/publish-site.sh.
const DOCS_URL = "https://facets.systems/docs/";

// The `shelf` view is gone: with the list flat and a filter over it, a shelf
// was a page that showed a subset the library already shows. Nothing in
// App.tsx ever constructed one, so no caller changes.
export type HomeRoute = { view: "home" } | { view: "library" } | { view: "about" };

interface HomeProps {
  initialRoute?: HomeRoute;
  onCreate: () => void;
  onOpenExample: (d: Demo) => void;
  onOpenCorpus: (e: CorpusEntry) => void;
  onOpenDrafted: (sl: string) => void;
  onOpenFile: () => void;
  libraryTree: LibraryNode[];
  onLoadFromLibrary: (name: string) => void;
  onDeleteFromLibrary: (name: string) => void;
  onRenameInLibrary: (from: string, to: string) => Promise<boolean>;
  /** Export the whole library as one walk file (#457). */
  onExportLibrary: () => void;
  /** Where the saved models live, in the words storagePersist.ts chooses. */
  storageLine: string;
  /** When the library was last exported from this browser, or null for never. */
  exportedAt: number | null;
  /** Back to the model on the canvas — null when nothing is loaded. */
  onClose: (() => void) | null;
}

export function HomeScreen(props: HomeProps) {
  const [route, setRoute] = useState<HomeRoute>(props.initialRoute ?? { view: "home" });
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      style={{ backgroundColor: "var(--bg-surface)", color: "var(--text-primary)" }}
    >
      {/* One page, one measure. Every level sets inside the same reading column
          — there is no full-bleed device, because the page ground IS the
          identity and a band would interrupt it.

          The sheet: the content sits on --bg-secondary against a --bg-surface that
          is one neutral step away, so the page has an edge without a border,
          a shadow, or a tint doing the work. Its measure is wider than the
          reading column's, so the type keeps real margins rather than running
          to the paper's edge. */}
      {/* The front door is a full-width page of its own (the entry pass,
          2026-10-27); the sheet below is for the library and the build page. */}
      {route.view === "home" && (
        <div className="flex flex-1 flex-col">
          <HomeMenu
            onCreate={props.onCreate}
            onOpenLibrary={() => setRoute({ view: "library" })}
            onOpenFeatured={() => {
              const m = featured().find((r) => r.key.endsWith("llm-market"));
              if (!m) return setRoute({ view: "library" });
              if (m.open.kind === "example") props.onOpenExample(m.open.demo);
              else props.onOpenCorpus(m.open.entry);
            }}
            onAbout={() => setRoute({ view: "about" })}
          />
          {props.onClose && (
            <div className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-10" style={{ backgroundColor: "var(--bg-secondary)" }}>
              <Button size={28} variant="quiet" icon="back" onClick={props.onClose}>
                back to the model on the canvas
              </Button>
            </div>
          )}
        </div>
      )}
      {route.view !== "home" && (
      <div
        className="mx-auto w-full max-w-4xl flex-1 border-x"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--hairline)" }}
      >
        {route.view === "about" && <AboutPage onBack={() => setRoute({ view: "home" })} />}
        {route.view === "library" && (
          <LibraryBrowser
            tree={props.libraryTree}
            onBack={() => setRoute({ view: "home" })}
            onOpenExample={props.onOpenExample}
            onOpenCorpus={props.onOpenCorpus}
            onOpenDrafted={props.onOpenDrafted}
            onOpenFile={props.onOpenFile}
            onLoad={props.onLoadFromLibrary}
            onDelete={props.onDeleteFromLibrary}
            onRename={props.onRenameInLibrary}
            onExportLibrary={props.onExportLibrary}
            storageLine={props.storageLine}
            exportedAt={props.exportedAt}
          />
        )}
        {props.onClose && (
          <Column className="pb-12">
            <Button size={28} variant="quiet" icon="back" onClick={props.onClose}>
              back to the model on the canvas
            </Button>
          </Column>
        )}
      </div>
      )}
    </div>
  );
}

/** A drafted row's gloss: when it was drafted, in the reader's own locale, and
 *  the human's ruling when there is one. The ledger stores ISO-8601 UTC; the
 *  prompt is already the row's name and the model is its tag, so date and
 *  ruling are all that is worth surfacing. Discarded rows never reach this
 *  list (drafted.ts drops them), so the only ruling to show is `accepted` —
 *  which means "checked onto the canvas", not "saved". An unparseable
 *  timestamp glosses as the verb alone rather than as "Invalid Date". */
function draftedGloss(d: DraftedModel): string {
  const verb = d.status === "accepted" ? "accepted" : "drafted";
  const t = Date.parse(d.at);
  return Number.isNaN(t) ? verb : `${verb} ${new Date(t).toLocaleDateString()}`;
}

function countLibrary(tree: LibraryNode[]): number {
  let n = 0;
  const walk = (node: LibraryNode) => {
    n += 1;
    node.children.forEach(walk);
  };
  tree.forEach(walk);
  return n;
}

// ---------------------------------------------------------------------------
// The language: measure, title block, section rule, table, entry.
//
// Structure is carried by two weights of rule (a near-ink head rule at 1px, a
// soft hairline between entries), by the serif/sans opposition (a NAME is
// serif, a gloss is sans, a machine fact is mono), and by vertical rhythm.
// ---------------------------------------------------------------------------

/** The measure. One width for every region. There was briefly a narrower
 *  reading column for the prose pages, on the theory that these were pages to
 *  be read; they are not, they are a menu and a list, and the narrow column was
 *  a page-margin habit rather than a legibility need. */
function Column({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-4xl px-4 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}

const mono = "var(--font-mono)";
const display = "var(--font-display)";

/** The label (rule 5): Inter 11/600 uppercase at the one tracking token. Group
 *  marks, kickers, tags and the colophon links are all this one object. The
 *  mono face is for numerals and dates only (`.tabular`), never for a label. */
const LABEL = "text-[11px] font-semibold uppercase";
const labelStyle: CSSProperties = {
  letterSpacing: "var(--tracking-label)",
  color: "var(--text-muted)",
};

/** A name as this instrument sets names: Cormorant 700 with the AUTHORED case
 *  intact. text-transform would print `hal` as `HAL` and lie about the model's
 *  name, so the string is never touched. The size is one of the three display
 *  tokens, set at the call. */
const nameStyle: CSSProperties = {
  fontFamily: display,
  fontWeight: 700,
  color: "var(--text-primary)",
};

/** UI copy that names a door rather than a record. Since the makeover both are
 *  the display face at 700; what tells a DOOR ("Open a model") from a NAME
 *  (`hal`) is its place on the page, not a second face. */
const doorStyle: CSSProperties = nameStyle;

/** A name set at a display size: d1 the page, d2 a section, d3 a shelf, a door
 *  or a row. */
const d1: CSSProperties = { fontSize: "var(--t-d1)" };
const d2: CSSProperties = { fontSize: "var(--t-d2)" };
const d3: CSSProperties = { fontSize: "var(--t-d3)" };

/** The title block. A page opens the way a title page opens: a rubric rule, the
 *  name in the serif at a size nothing else on the page approaches, the count
 *  set as a numeral in the outer margin, and a lede beneath.
 *  It closes on a head rule — the block ends, and the table begins under it. */
function Masthead({
  eyebrow,
  title,
  mark,
  lede,
  note,
  stat,
  statLabel,
  aside,
  dense,
  back,
}: {
  eyebrow?: string;
  title: ReactNode;
  /** A mark set beside the title — the home page's gem. */
  mark?: ReactNode;
  /** The page's opening line. Plain sans; the library's shorter `note` is the
   *  same object at a smaller size. */
  lede?: ReactNode;
  note?: string;
  stat?: number;
  statLabel?: string;
  /** A control set against the title rather than a fact about the page — the
   *  library's search field. It takes the place the count occupies elsewhere,
   *  and the two are alternatives: a page that can be searched does not also
   *  need to announce how many things are in it. */
  aside?: ReactNode;
  /** Close the title block's air. The home and about pages open like a title
   *  page and want it; the library is a menu the reader scrolls, and every
   *  line of air above the first door is a door pushed off the screen. */
  dense?: boolean;
  back?: { label: string; onClick: () => void };
}) {
  return (
    <Column className={dense ? "pt-8" : "pt-12"}>
      {back && (
        <div className={dense ? "mb-6" : "mb-8"}>
          <Button size={28} variant="quiet" icon="back" onClick={back.onClick}>
            {back.label}
          </Button>
        </div>
      )}
      <div className={`flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8 ${dense ? "pt-1" : "pt-6"}`}>
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          {mark}
          <div className="min-w-0">
            {eyebrow && (
              <div className={`mb-2 ${LABEL}`} style={labelStyle}>
                {eyebrow}
              </div>
            )}
            {/* The name of the page is the one d1 on it (rule 5): Cormorant 700
                at 30, the same on every level. */}
            <h1 className="leading-tight" style={{ ...nameStyle, ...d1 }}>
              {title}
            </h1>
          </div>
        </div>
        {aside && <div className="w-full shrink-0 sm:w-auto sm:pt-2">{aside}</div>}
        {stat !== undefined && (
          <div className="shrink-0 pt-1 text-right">
            <div className="text-2xl font-semibold leading-none tabular" style={{ color: "var(--text-primary)" }}>
              {stat}
            </div>
            <div className={`mt-2 ${LABEL}`} style={labelStyle}>
              {statLabel}
            </div>
          </div>
        )}
      </div>
      {lede && (
        <p
          className={`${dense ? "mt-4" : "mt-6"} max-w-2xl text-base leading-6`}
          style={{ color: "var(--text-secondary)" }}
        >
          {lede}
          {note ? ` — ${note}` : ""}
        </p>
      )}
      {!lede && note && (
        <p className="mt-4 max-w-2xl text-sm leading-5" style={{ color: "var(--text-secondary)" }}>
          {note}
        </p>
      )}
      <div className={dense ? "mt-6" : "mt-8"} style={{ borderTop: "1px solid var(--rule-strong)" }} />
    </Column>
  );
}

/** A section mark: a letterspaced label, a hairline running out to the margin,
 *  and — where the section has one — its count at the right. A printed section
 *  head, not a tinted strip. */
function BlockHeader({ label, count }: { label: string; count?: string }) {
  return (
    <div className="flex items-baseline gap-4 pb-3">
      <span className={LABEL} style={labelStyle}>
        {label}
      </span>
      <span className="h-px min-w-6 flex-1" style={{ background: "var(--hairline)" }} />
      {count && (
        <span className="shrink-0 text-xs tabular" style={{ color: "var(--text-muted)" }}>
          {count}
        </span>
      )}
    </div>
  );
}

/** The table. It opens on a head rule; its entries close on hairlines. */
function Ledger({ children }: { children: ReactNode }) {
  return <div style={{ borderTop: "1px solid var(--rule-strong)" }}>{children}</div>;
}

/** The folio column: a numeral in the left margin of the entry, in mono so the
 *  column stays true, separated from the entry by nothing but space. It takes
 *  the rubric under the cursor (see .record-row in index.css). */
function Gutter({ index, folio }: { index?: number; folio?: ReactNode }) {
  return (
    <span
      className="record-folio flex items-start justify-end pr-5 pt-5 text-xs tabular"
      style={{ color: "var(--text-muted)", transition: "color var(--transition-base)" }}
    >
      {folio ?? (index === undefined ? "·" : String(index).padStart(2, "0"))}
    </span>
  );
}

/** A marker's meaning, read off its words (rule 9d): "runs" is a capability,
 *  "with Nora" a collaborator, "drafted" the co-author, "after X" a bench
 *  provenance; anything else is neutral. The Pill's tone carries the colour
 *  and the word carries the meaning (rule 12). */
function markerTone(text: string): Tone {
  if (text === "runs") return "runs";
  if (text.startsWith("with ")) return "with";
  if (text.startsWith("drafted")) return "drafted";
  if (text.startsWith("after ")) return "bench";
  return "neutral";
}

/** The exception mark on a row: a chip with a word, coloured by what it says. */
function Chip({ children }: { children: string }) {
  return (
    <span className="ml-auto shrink-0 self-center">
      <Pill tone={markerTone(children)}>{children}</Pill>
    </span>
  );
}

const ROW_GRID =
  "record-row grid w-full grid-cols-[3rem_1fr] items-stretch border-b text-left";

/** One entry in a table: folio numeral, name, gloss, optional trailing line.
 *  `door` sets the name as UI copy (full case) rather than as a record name
 *  (small caps) — the two are different kinds of thing and are set differently. */
function LedgerRow({
  index,
  folio,
  name,
  description,
  trailing,
  tag,
  door,
  onClick,
  href,
}: {
  index?: number;
  folio?: ReactNode;
  name: string;
  description: string;
  trailing?: ReactNode;
  tag?: string;
  door?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const body = (
    <>
      <Gutter index={index} folio={folio} />
      <span className="block py-4 pr-2">
        <span className="flex items-baseline gap-4">
          <span className="leading-tight" style={{ ...(door ? doorStyle : nameStyle), ...d3 }}>
            {name}
          </span>
          {tag && <Chip>{tag}</Chip>}
        </span>
        <span
          className="mt-1 block max-w-xl text-sm leading-5"
          style={{ color: "var(--text-secondary)" }}
        >
          {description}
        </span>
        {trailing}
      </span>
    </>
  );
  const style = { borderColor: "var(--hairline)" };
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" onClick={openExternal} className={ROW_GRID} style={style}>
      {body}
    </a>
  ) : (
    <button onClick={onClick} className={ROW_GRID} style={style}>
      {body}
    </button>
  );
}

// ---------------------------------------------------------------------------
// home
// ---------------------------------------------------------------------------

// The gem from the portal, the Model facet lit: this page belongs to the same
// site, and the colour says which door you came through. Fills go through
// style so they read the theme (presentation attributes cannot take var()).
const GEM_FACETS: { points: string; token: string; opacity: number }[] = [
  { points: "40,4 71,19 40,40", token: "var(--accent-indigo)", opacity: 0.1 },
  { points: "71,19 78,52 40,40", token: "var(--accent-indigo)", opacity: 0.07 },
  { points: "78,52 57,76 40,40", token: "var(--accent)", opacity: 0.12 },
  { points: "57,76 23,76 40,40", token: "var(--accent)", opacity: 0.55 },
  { points: "23,76 2,52 40,40", token: "var(--accent)", opacity: 0.12 },
  { points: "2,52 9,19 40,40", token: "var(--accent-slate)", opacity: 0.03 },
  { points: "9,19 40,4 40,40", token: "var(--accent-indigo)", opacity: 0.05 },
];
const GEM_RIM = [
  [40, 4],
  [71, 19],
  [78, 52],
  [57, 76],
  [23, 76],
  [2, 52],
  [9, 19],
];

function Gem({ size = 72 }: { size?: number }) {
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} aria-hidden="true" className="shrink-0">
      <polygon
        points={GEM_RIM.map((p) => p.join(",")).join(" ")}
        style={{ fill: "var(--bg-secondary)", stroke: "var(--text-primary)", strokeWidth: 0.35 }}
      />
      {GEM_FACETS.map((f) => (
        <polygon key={f.points} points={f.points} style={{ fill: f.token, opacity: f.opacity }} />
      ))}
      {GEM_RIM.map(([x, y]) => (
        <line
          key={`${x},${y}`}
          x1={40}
          y1={40}
          x2={x}
          y2={y}
          style={{ stroke: "var(--text-primary)", strokeWidth: 0.2, opacity: 0.5 }}
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// The front door (the entry pass, 2026-10-27). It leads with the language: a
// handful of generic words that describe a system in any domain, each with its
// shape on the canvas and its keyword in SL. The two doors are the only
// actions; the worked example is one link away, and the proof claim is folded
// into the foot with its limits.
// ---------------------------------------------------------------------------

const KIND_VAR = {
  matter: "var(--kind-matter)",
  energy: "var(--kind-energy)",
  informational: "var(--kind-informational)",
} as const;

const ink = { fill: "none", stroke: "var(--text-primary)", strokeWidth: 2 } as const;

/** Each term's shape, drawn as the canvas draws it, on a 40×32 plate. */
const TERM_GLYPH: Record<string, ReactNode> = {
  system: <ellipse cx="20" cy="16" rx="16" ry="12" style={ink} />,
  component: (
    <circle
      cx="20"
      cy="16"
      r="10"
      style={{
        fill: "color-mix(in srgb, var(--prim-amplifying) 14%, var(--bg-secondary))",
        stroke: "var(--prim-amplifying)",
        strokeWidth: 2,
      }}
    />
  ),
  interface: (
    <>
      <path d="M4 26 Q20 2 36 26" style={ink} />
      <rect x="15" y="9" width="10" height="10" style={{ ...ink, fill: "var(--bg-secondary)" }} />
    </>
  ),
  source: (
    <>
      <path d="M17 6 H5 V26 H17" style={ink} />
      <path d="M23 6 H35 V26 H23" style={ink} />
    </>
  ),
  flow: (
    <>
      <line x1="4" y1="7" x2="36" y2="7" style={{ stroke: KIND_VAR.matter, strokeWidth: 2.5 }} />
      <line x1="4" y1="16" x2="36" y2="16" style={{ stroke: KIND_VAR.energy, strokeWidth: 2.5 }} />
      <line x1="4" y1="25" x2="36" y2="25" style={{ stroke: KIND_VAR.informational, strokeWidth: 2.5, strokeDasharray: "5 4" }} />
    </>
  ),
};

/** The language, in five words. The glosses hold in any domain; the keyword is
 *  the SL word that writes it (docs/language/). */
const TERMS: { id: string; word: string; sl: string; gloss: string }[] = [
  { id: "system", word: "System", sl: "system", gloss: "Whatever you draw a boundary around." },
  { id: "component", word: "Component", sl: "component", gloss: "A part inside it that does something." },
  { id: "interface", word: "Interface", sl: "interface", gloss: "Where something crosses the boundary." },
  { id: "source", word: "Source and sink", sl: "source · sink", gloss: "Where flows come from and where they go." },
  { id: "flow", word: "Flow", sl: "flow", gloss: "Matter, energy or information on the move." },
];

const THEORY_URL = "https://facets.systems/docs/theory-fidelity.html";

/** What the check means, for a reader who has never met it. The claims are the
 *  README's "What is proven, stated exactly", in plain words; if that section
 *  changes, this changes with it. */
const CHECK_NOTES: { label: string; body: ReactNode }[] = [
  {
    label: "What it checks",
    body: (
      <>
        Facets reads your model in the terms of a systems tradition. Each reading needs one structural condition. For
        Mobus: no interaction depends on itself. For Bunge: at least one bond between two different parts.
      </>
    ),
  },
  {
    label: "Why proofs",
    body: (
      <>
        Those conditions are the ones a proof in Lean needs for the reading to be faithful to the tradition. When
        Facets refuses a model, it is not a style rule: it names the condition that failed.
      </>
    ),
  },
  {
    label: "What it does not claim",
    body: (
      <>
        That your model is true of the world, or that a run's numbers are right. Runs are simulations. Some checks are
        tested in code rather than proven.{" "}
        <a
          href={THEORY_URL}
          target="_blank"
          rel="noreferrer"
          onClick={openExternal}
          className="home-lede-link font-medium"
          style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--accent)" }}
        >
          What is proven
        </a>
      </>
    ),
  },
];

export function HomeMenu({
  onCreate,
  onOpenLibrary,
  onOpenFeatured,
  onAbout,
}: {
  /** Open a blank canvas; `{ sl: true }` opens it with the SL pane showing,
   *  which is where "describe it in a few lines" lands. */
  onCreate: (opts?: { sl?: boolean }) => void;
  onOpenLibrary: () => void;
  /** Open the worked example, the LLM serving market. Absent, the link is not
   *  shown. */
  onOpenFeatured?: () => void;
  /** Open the provenance page (#229). Optional so the menu renders standalone. */
  onAbout?: () => void;
}) {
  const quiet = "home-quiet-link inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-sm font-medium";
  return (
    <div className="flex min-h-full flex-col" style={{ backgroundColor: "var(--bg-secondary)" }}>
      {/* Two doors: make a model or open one (one-surface.md, 2026-10-27).
          Drawing, describing and wiring processes are ways of working on the
          same model, chosen on the blank canvas, not doors here. The sandbox
          surface stays at `?sandbox=1`; the data-first door at `?data=1`. */}
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 py-12 sm:px-10 lg:grid-cols-2 lg:gap-20 lg:py-16">
        <div className="min-w-0">
          <Gem size={48} />
          <h1 className="mt-6" style={{ ...nameStyle, fontSize: "var(--t-hero)", lineHeight: 1.05 }}>
            Systems modeling, grounded in systems science.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-7" style={{ color: "var(--text-secondary)" }}>
            Parts, a boundary, and the flows between them. Facets checks the structure as you build and runs it when
            you're ready.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onCreate()}
              className="home-door home-door-primary inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-sm px-6 text-base font-semibold sm:w-auto"
            >
              <Icon name="plus" size={20} />
              New model
            </button>
            <button
              type="button"
              onClick={onOpenLibrary}
              className="home-door home-door-secondary inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-sm px-6 text-base font-semibold sm:w-auto"
            >
              <Icon name="open" size={20} />
              Open a model
            </button>
          </div>
        </div>

        {/* The language: five words for any system, each with its shape and
            its SL keyword. */}
        <section className="min-w-0" aria-labelledby="home-language">
          <h2 id="home-language" style={{ ...nameStyle, ...d2 }}>
            One language for any system
          </h2>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
            A cell, a firm and a market, described in the same few words.
          </p>
          <dl className="mt-5 border-t" style={{ borderColor: "var(--hairline)" }}>
            {TERMS.map((t) => (
              <div
                key={t.id}
                className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-x-4 border-b py-3 sm:grid-cols-[40px_9rem_minmax(0,1fr)]"
                style={{ borderColor: "var(--hairline)" }}
              >
                <svg width="40" height="32" viewBox="0 0 40 32" aria-hidden="true" className="row-span-2 sm:row-span-1">
                  {TERM_GLYPH[t.id]}
                </svg>
                <dt className="flex items-baseline gap-2">
                  <span className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                    {t.word}
                  </span>
                </dt>
                <dd className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span>{t.gloss}</span>
                  <code className="text-xs" style={{ fontFamily: mono, color: "var(--accent)" }}>
                    {t.sl}
                  </code>
                </dd>
              </div>
            ))}
          </dl>
          {onOpenFeatured && (
            <button type="button" onClick={onOpenFeatured} className={`${quiet} -mx-2 mt-3`} style={{ color: "var(--accent)" }}>
              See it applied to the LLM serving market
              <Icon name="forward" size={16} />
            </button>
          )}
        </section>
      </main>

      {/* The foot: what the check means, folded until asked for, then the docs
          and the build. */}
      <footer className="border-t" style={{ borderColor: "var(--hairline)" }}>
        <details className="home-check mx-auto w-full max-w-6xl px-4 sm:px-10">
          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 py-3">
            <span className="inline-flex items-center gap-3 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              <span
                aria-hidden
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm"
                style={{ background: "color-mix(in srgb, var(--verdict-ok) 14%, var(--bg-secondary))", color: "var(--verdict-ok)" }}
              >
                <Icon name="check" size={16} />
              </span>
              What the structure check means, and what it does not claim
              <Icon name="chevron-down" size={16} className="home-check-caret" />
            </span>
            <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <a href={DOCS_URL} target="_blank" rel="noreferrer" onClick={openExternal} className={quiet} style={{ color: "var(--text-secondary)" }}>
                Documentation
                <Icon name="external" size={16} />
              </a>
              {onAbout && (
                <button type="button" onClick={onAbout} className={quiet} style={{ color: "var(--text-secondary)" }}>
                  This build
                  {buildInfo.gitSha && (
                    <span className="tabular text-xs" style={{ color: "var(--text-muted)" }}>
                      {buildInfo.gitSha.slice(0, 7)}
                    </span>
                  )}
                </button>
              )}
            </span>
          </summary>
          <div className="grid gap-6 pb-8 pt-2 md:grid-cols-3 md:gap-10">
            {CHECK_NOTES.map((n) => (
              <div key={n.label} className="min-w-0">
                <div className={LABEL} style={labelStyle}>
                  {n.label}
                </div>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                  {n.body}
                </p>
              </div>
            ))}
          </div>
        </details>
      </footer>
    </div>
  );
}

/** What this build is (#229). The instrument tells its users that every verdict
 *  is machine-checked against Lean proofs in another repository; a person
 *  holding the binary had no way to find out WHICH proofs. This is that way —
 *  the version, the commit it was built from, the SSF commit the claims are
 *  pinned to, and a hash of the kernel wasm they can recompute from the file in
 *  their own bundle. It is one click from the landing page, which is where the
 *  claim it substantiates is made. */
export function AboutPage({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <Masthead
        title="This build"
        lede="Every verdict is machine-checked against Lean proofs in another repository. These are the ones."
        back={{ label: "Home", onClick: onBack }}
      />
      <Column className="pb-12 pt-12">
        <BlockHeader label="Provenance" count={buildInfo.gitSha} />
        <div style={{ borderTop: "1px solid var(--rule-strong)" }}>
          {provenanceLines().map((line) => (
            <div
              key={line.label}
              className="grid grid-cols-1 gap-1 border-b py-3 sm:grid-cols-[10rem_1fr] sm:gap-4"
              style={{ borderColor: "var(--hairline)" }}
            >
              <span className={LABEL} style={labelStyle}>
                {line.label}
              </span>
              <span className="min-w-0">
                {/* A commit, a version, a hash: the machine's numbers, so mono. */}
                <span className="block break-all text-xs tabular" style={{ color: "var(--text-primary)" }}>
                  {line.value}
                </span>
                {line.note && (
                  <span className="mt-1 block text-xs" style={{ color: "var(--text-muted)" }}>
                    {line.note}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 max-w-xl text-sm leading-5" style={{ color: "var(--text-muted)" }}>
          Licence and third-party notices ship beside this app, in its{" "}
          <span style={{ fontFamily: mono }}>Contents/Resources</span> folder.
        </p>
      </Column>
    </div>
  );
}

// ---------------------------------------------------------------------------
// library browser
// ---------------------------------------------------------------------------

/** The WORLD hue of a tradition — the reading a corpus model belongs to. This
 *  is the one colour channel on the library page, and it is semantic:
 *  `--world-*` already means "which tradition" across the instrument
 *  (index.css), so a reader who learns it here reads it unchanged on the
 *  canvas. An example is ours and carries no tradition, so it takes no hue —
 *  the absence is the fact. */
const WORLD_HUE: Record<string, string> = {
  klir: "var(--world-klir)",
  bunge: "var(--world-bunge)",
  mobus: "var(--world-mobus)",
};

/** The GENUS hues. A genus is not a reading, so it must not borrow a world
 *  hue — Bunge's kingdoms get the chart inks instead, which is the other place
 *  this instrument already names disjoint categories in colour. Distinct
 *  channel, distinct palette, and the two never trade. */
const GENUS_HUE: Record<string, string> = {
  Biological: "var(--chart-4)",
  Social: "var(--chart-3)",
  Technical: "var(--chart-1)",
  // The fourth kingdom takes the fourth chart ink (audit #41: a shelf with no
  // hue was uncoloured by omission, not by meaning).
  Physical: "var(--chart-2)",
};

function hueOf(tag: Tag): string | undefined {
  return tag.kind === "tradition" ? WORLD_HUE[tag.id] : undefined;
}

/** A card's own hue: the tradition it transcribes, or failing that the kingdom
 *  it belongs to. Read from the model's tags, so a card carries its colour off
 *  the shelf as well as on it. */
function hueOfModel(m: ShippedModel): string | undefined {
  for (const t of m.tags) {
    const hue = t.kind === "tradition" ? WORLD_HUE[t.id] : GENUS_HUE[t.id];
    if (hue) return hue;
  }
  return undefined;
}

/** One facet in the filter line: the tag's name and how many models carry it.
 *  Selecting it narrows the list in place — it is not a door to another page.
 *  The selected facet is underscored by the rubric (or, for a tradition, by
 *  that tradition's hue); an unselected one sits on the soft rule. */
function FacetButton({
  facet,
  selected,
  onClick,
}: {
  facet: Facet;
  selected: boolean;
  onClick: () => void;
}) {
  const hue = hueOf(facet);
  return (
    <button
      onClick={onClick}
      title={facet.note || undefined}
      aria-pressed={selected}
      className="record-row flex min-h-7 items-baseline gap-2 pb-1.5 pt-1 text-left"
      style={{
        // The selected facet is underscored by its tradition's hue, or by the
        // accent (rule 8: a selection is an action, so it wears the accent).
        borderBottom: selected ? `2px solid ${hue ?? "var(--accent)"}` : "1px solid var(--hairline)",
      }}
    >
      {hue && <span aria-hidden className="h-2 w-0.5 shrink-0 self-center" style={{ background: hue }} />}
      {/* A filter is a control, so it is set in Inter 14 (rule 5), not the
          display face; the count is a numeral and keeps the mono column. */}
      <span
        className="text-sm font-medium leading-none"
        style={{ color: selected ? "var(--text-primary)" : "var(--text-secondary)" }}
      >
        {facet.label}
      </span>
      <span className="shrink-0 text-xs tabular" style={{ color: "var(--text-muted)" }}>
        {facet.count}
      </span>
    </button>
  );
}

/** The filter line: a label, then the facets, wrapping. Two runs — the genera
 *  (ours) and the traditions (the authors') — separated by white space rather
 *  than by a box, because they are two kinds of fact about the same rows and
 *  not two places to go. */
function FilterLine({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-1">
      <span className={`w-24 shrink-0 ${LABEL}`} style={labelStyle}>
        {label}
      </span>
      {children}
    </div>
  );
}

/** How many saved roots list inline before the LIST view folds the rest behind
 *  a "show all" — enough that a normal library never folds at all. */
const INLINE_LIBRARY_ROOTS = 12;

/** How many cards a shelf offers before "all N →" opens the rest, and how many
 *  saved models the Yours grid offers before "and N more →". One row of three,
 *  because a shelf is a door and a door does not need to be a catalogue. */
const SHELF_CARDS = 3;

/** How many opens the Recent strip shows. Four, one row. */
const RECENT_CARDS = 4;

/** Recent is about the READER, not about any shelf, so its wells wear the app's
 *  own accent — the same colour its section label takes, and the same one the
 *  home page's Start group wears. */
const RECENT_WELL = { fill: "var(--accent-soft)", edge: "var(--accent)" };

/** A saved model belongs to no shelf and no tradition, and inventing a colour
 *  for it would invent a fact. Its well is the page's own paper edge, drawn
 *  round in slate so it still reads as a well and not as a hole. */
const YOURS_WELL = { fill: "var(--bg-primary)", edge: "var(--accent-slate)" };

/** A shelf's colour: a tradition's world hue, or a genus's chart ink. */
function shelfHue(shelf: Shelf): string | undefined {
  return shelf.kind === "tradition" ? WORLD_HUE[shelf.id] : GENUS_HUE[shelf.id];
}

/** When something happened, as a person says it. Minutes and hours while the
 *  memory is fresh, then the weekday while "Tuesday" still locates it, then a
 *  date. `relTime` (below) stays the LIST view's phrasing — "saved 3d ago" is a
 *  record's fact; this is a reader's. */
function whenLabel(ts: number, now = Date.now()): string {
  const m = Math.floor((now - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return new Date(ts).toLocaleDateString(undefined, { weekday: "short" });
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The card's left cell: the model's own diagram at card scale, in a frame that
 *  holds its place before (and if) the drawing arrives. One of ours draws from
 *  its SL and one of yours from its stored archive — a saved model is a model
 *  and should be recognisable by its shape here too. A source that will not
 *  read leaves the frame empty rather than showing a stand-in glyph that would
 *  claim a shape the model may not have. */
function CardThumb({
  cacheKey,
  source,
  kind = "sl",
  hue,
  well,
}: {
  cacheKey: string;
  source?: string;
  kind?: "sl" | "archive";
  /** The well's fill and edge — a shelf's colour. */
  hue?: string;
  /** An already-mixed fill, for the wells that name something other than a
   *  shelf: Recent's are the app's own accent, yours are neutral. */
  well?: { fill: string; edge: string };
}) {
  const compiled = useThumbnailModel(cacheKey, source, kind);
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border"
      style={{
        borderColor: well?.edge ?? hue ?? "var(--hairline)",
        // 22% (operator, 2026-09-04: 14 read as bland): three shelves read as
        // three colours at a glance, and the drawing inside the well still
        // reads as ink on paper.
        background: well?.fill ?? (hue ? `color-mix(in oklab, ${hue} 22%, var(--bg-secondary))` : "var(--bg-primary)"),
      }}
    >
      {compiled && <Thumbnail model={compiled} size={34} />}
    </span>
  );
}

/** One model as a card: its drawing, its name, and ONE line under it. Which
 *  line depends on the section, and that is the section's business — Recent
 *  says when and whose, a shelf says what the model teaches, Yours says when it
 *  was saved. A card never says two of those at once; the row in the list view
 *  is where a model's full record is read. */
function ModelCard({
  name,
  sub,
  runs,
  marker,
  cacheKey,
  source,
  sourceKind,
  hue,
  well,
  onClick,
  trailing,
}: {
  name: string;
  sub: ReactNode;
  runs?: boolean;
  /** Provenance worn on the card (#472 fold): "with Nora", "drafted". */
  marker?: string;
  cacheKey: string;
  source?: string;
  sourceKind?: "sl" | "archive";
  hue?: string;
  well?: { fill: string; edge: string };
  onClick?: () => void;
  /** Manage-mode controls. Present only where the section put them there. */
  trailing?: ReactNode;
}) {
  const body = (
    <>
      <CardThumb cacheKey={cacheKey} source={source} kind={sourceKind} hue={hue} well={well} />
      <span className="block min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-2">
          {/* Two lines, not one with an ellipsis. Bunge's three two-thing
              structures differ in their last three words, so a single truncated
              line prints the same string on three cards and the shelf stops
              being readable. */}
          {/* A card name is scanned across a grid, so it is Inter 14/500 (rule
              5's row size), not the display face. */}
          <span className="line-clamp-2 text-sm font-medium leading-tight" style={{ color: "var(--text-primary)" }}>
            {name}
          </span>
          {runs && <Pill tone="runs">runs</Pill>}
          {marker && (
            /* A bench card's provenance can run long ("after X 1983 (the run as
               a switch); Mobus §11.2.1.1"); the marker truncates in its row and
               carries the full text as its title, instead of drifting past the
               card into the next column. */
            <span className="min-w-0 truncate" title={marker} data-testid="card-marker">
              <Pill tone={markerTone(marker)}>{marker}</Pill>
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs" style={{ color: "var(--text-secondary)" }}>
          {sub}
        </span>
      </span>
    </>
  );
  const style = {
    borderColor: "var(--hairline)",
    background: "var(--bg-secondary)",
    // The hover hue, read by .hue-panel in index.css. A card with no hue falls
    // back to the app accent, which is what .home-panel does everywhere else.
    ...(hue ? { "--card-hue": hue } : {}),
  } as CSSProperties;
  const panel = `${hue ? "hue-panel" : "home-panel"} flex min-w-0 items-center gap-3 rounded-md border px-3 py-2 text-left`;
  return trailing ? (
    <div className={panel} style={style}>
      {body}
      {trailing}
    </div>
  ) : (
    <button onClick={onClick} title={name} className={panel} style={style}>
      {body}
    </button>
  );
}

/** A grid of cards. Three across on a shelf and in Yours, four across in the
 *  Recent strip. */
function CardGrid({ across, children }: { across: 3 | 4; children: ReactNode }) {
  return (
    <div className={`grid gap-3 ${across === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 sm:grid-cols-3"}`}>{children}</div>
  );
}

/** A section mark with something set against it at the right — the Recent
 *  strip's gloss, the arrangement toggle, the Yours count and its manage link.
 *  `BlockHeader` above is the same object with a count; this one takes a node,
 *  because these are controls rather than facts. */
function SectionHead({ label, right }: { label: string; right?: ReactNode; lead?: boolean }) {
  // #472 (2026-10-10): the doors are the page's major categories and should
  // pull the eye before any card does — the display face at d2, above the card
  // names. The rule and the right-hand control stay. `lead` once put the
  // accent on the first head; the accent names an action (rule 8), so the prop
  // is kept for callers and does nothing.
  return (
    <div
      // Wraps, so at 390 a long head ("Start from one of ours") keeps its
      // control on the next line instead of past the sheet's edge (rule 16).
      className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b pb-2"
      style={{ borderColor: "var(--rule-strong)" }}
    >
      <span className="shrink-0 leading-none" style={{ ...nameStyle, ...d2 }} data-testid="section-head">
        {label}
      </span>
      <span className="min-w-6 flex-1" />
      {right}
    </div>
  );
}

/** A shelf's own head: the shelf's colour as a 3px bar, its name, and the
 *  control that opens the rest of it. A lens shelf wears its tradition's
 *  --world-* hue and a domain shelf its genus's chart ink — two channels, never
 *  traded, so a green bar over "Mobus" and a green bar over "Biological" are
 *  visibly the same device saying two different kinds of thing. */
function ShelfHead({
  label,
  note,
  hue,
  total,
  shown,
  onExpand,
}: {
  label: string;
  note: string;
  hue?: string;
  total: number;
  shown: number;
  onExpand: () => void;
}) {
  return (
    <div className="flex items-baseline gap-3 pb-2">
      {hue && <span aria-hidden className="h-4 w-[3px] shrink-0 self-center" style={{ background: hue }} />}
      {/* A shelf is the second level: the display face a step below the
          section head, a step above the card names, so the three sizes read
          as three levels down the page. */}
      <span className="leading-none" style={{ ...nameStyle, ...d3, color: "var(--text-secondary)" }}>
        {label}
      </span>
      {note && (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {note}
        </span>
      )}
      <span className="flex-1" />
      {shown < total && (
        <Button size={28} variant="quiet" onClick={onExpand}>
          all {total}
          <Icon name="forward" size={16} />
        </Button>
      )}
    </div>
  );
}

export function LibraryBrowser({
  tree,
  onBack,
  onOpenExample,
  onOpenCorpus,
  onOpenDrafted,
  onOpenFile,
  onLoad,
  onDelete,
  onRename,
  /** Opens with a facet already selected. Presentation-only; nothing in the app
   *  passes it today, and it exists so a caller (or a test) can enter the
   *  library on a narrowed view without a page of its own. */
  initialFacet,
  /** The same door for the rest of this page's state: the view, the search, the
   *  arrangement, manage mode, and the recency list. Every one of them has a
   *  live default (state, storage, or both) — these exist so a test can render
   *  one configuration to static markup, and so the recency list can be handed
   *  in rather than read out of a browser this page may not be running in. */
  initialView = "doors",
  initialQuery = "",
  initialArrange,
  initialManage = false,
  recent,
  onExportLibrary,
  storageLine,
  exportedAt = null,
}: {
  tree: LibraryNode[];
  onBack: () => void;
  onOpenExample: (d: Demo) => void;
  onOpenCorpus: (e: CorpusEntry) => void;
  onOpenDrafted: (sl: string) => void;
  onOpenFile: () => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
  onRename: (from: string, to: string) => Promise<boolean>;
  initialFacet?: Tag | null;
  initialView?: "doors" | "list";
  initialQuery?: string;
  initialArrange?: Arrange;
  initialManage?: boolean;
  recent?: RecentEntry[];
  /** #457. Optional so a test, or a caller with no library, renders without
   *  the export control; the storage line is absent then too. */
  onExportLibrary?: () => void;
  storageLine?: string;
  exportedAt?: number | null;
}) {
  // The library door (libraryFlag.ts, cut 2026-10-26). Closed, the standard
  // library on this page IS the pinned three; open (`?library=all`), it is
  // everything that ships. The reader's own models and the file door are on
  // the page either way, and nothing behind the door stops shipping.
  const libraryOpen = libraryAllEnabled();
  const everything = shippedModels();
  const all = libraryOpen ? everything : featured(everything);
  const allFacets = facets(all);
  // #324. The third provenance is read over the network from the reasoner, so
  // unlike the other two it starts empty and may stay that way forever — the
  // reasoner is off by default (#229). An empty list renders NO SECTION, which
  // is why this needs no loading state: there is nothing a spinner could
  // promise, since "still fetching" and "you have never used the co-author"
  // are supposed to look identical.
  const [drafted, setDrafted] = useState<DraftedModel[]>([]);
  useEffect(() => {
    let live = true;
    draftedModels().then((rows) => live && setDrafted(rows));
    return () => {
      live = false;
    };
  }, []);
  const [view, setView] = useState<"doors" | "list">(initialView);
  const [query, setQuery] = useState(initialQuery);
  const [arrange, setArrange] = useState<Arrange>(() => initialArrange ?? readArrange());
  const [manage, setManage] = useState(initialManage);
  const [opened, setOpened] = useState<string[]>([]);
  const [showAllSaved, setShowAllSaved] = useState(false);
  const [facet, setFacet] = useState<Tag | null>(initialFacet ?? null);
  const [visits] = useState<RecentEntry[]>(() => recent ?? readRecent());

  const q = query.trim().toLowerCase();
  const savedCount = countLibrary(tree);
  const saved = flattenSaved(tree);
  const shownShipped = all.filter((m) => matchesQuery(m, q));
  const shownSaved = saved.filter((n) => n.name.toLowerCase().includes(q));
  const shownDrafted = drafted.filter((d) => d.description.toLowerCase().includes(q));

  // A visit becomes a card only if its address still resolves — a deleted slot
  // or a renamed one simply drops out, which is why nothing here migrates the
  // stored list. The name comes from the model, never from the visit.
  const recentCards = visits
    .map((v) => {
      if (v.kind === "library") {
        const node = shownSaved.find((n) => n.name === v.key);
        return node ? { visit: v, node, model: undefined } : null;
      }
      const model = shownShipped.find((m) => m.key === v.key);
      return model ? { visit: v, node: undefined, model } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .slice(0, RECENT_CARDS);

  const chooseArrange = (next: Arrange) => {
    setArrange(next);
    noteArrange(next);
  };
  const featuredCards = featured(shownShipped);
  const openShipped = (m: ShippedModel) =>
    m.open.kind === "example" ? onOpenExample(m.open.demo) : onOpenCorpus(m.open.entry);
  const slOf = (m: ShippedModel) => (m.open.kind === "example" ? m.open.demo.sl : m.open.entry.sl);

  return (
    <div>
      <Masthead
        eyebrow="Library"
        title="Open a model"
        lede={
          libraryOpen
            ? "Pick up where you left off, start from one of ours, or come in through a domain."
            : "Pick up where you left off, start from one of ours, or open your own."
        }
        back={{ label: "Home", onClick: onBack }}
        aside={<SearchField value={query} onChange={setQuery} />}
        dense
      />

      <Column className="pb-12 pt-4">
        {view === "list" ? (
          <LedgerView
            all={all}
            allFacets={allFacets}
            facet={facet}
            setFacet={setFacet}
            tree={tree}
            savedCount={savedCount}
            drafted={drafted}
            showAllSaved={showAllSaved}
            setShowAllSaved={setShowAllSaved}
            onOpenExample={onOpenExample}
            onOpenCorpus={onOpenCorpus}
            onOpenDrafted={onOpenDrafted}
            onLoad={onLoad}
            onDelete={onDelete}
            onRename={onRename}
            onOpenFile={onOpenFile}
            onBackToDoors={() => setView("doors")}
          />
        ) : (
          <>
            {/* Recent. Absent on a first visit rather than empty: a reader who
                has opened nothing is not missing anything, and a headed strip of
                four blanks would say that they are. */}
            {recentCards.length > 0 && (
              <section>
                <SectionHead
                  lead
                  label="Recent"
                  right={
                    <span className="shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>
                      yours, and ours you have touched
                    </span>
                  }
                />
                <CardGrid across={4}>
                  {recentCards.map(({ visit, node, model }) =>
                    node ? (
                      <ModelCard
                        key={`recent:${visit.kind}:${visit.key}`}
                        cacheKey={`saved:${node.name}`}
                        source={node.json}
                        sourceKind="archive"
                        well={RECENT_WELL}
                        name={node.name}
                        sub={savedSubline(node, visit.at)}
                        onClick={() => onLoad(node.name)}
                      />
                    ) : model ? (
                      <ModelCard
                        key={`recent:${visit.kind}:${visit.key}`}
                        cacheKey={model.key}
                        source={slOf(model)}
                        well={RECENT_WELL}
                        name={model.name}
                        runs={model.runs}
                        sub={`ours · ${whenLabel(visit.at)}`}
                        onClick={() => openShipped(model)}
                      />
                    ) : null,
                  )}
                </CardGrid>
              </section>
            )}

            {/* Start from one of ours. Two cuts of the same shelf of models —
                by the READING a model is transcribed under, or by the subject
                it is about. The toggle is one control, not two pages, because
                these are two views of one list and the reader should be able to
                change their mind without losing their place. */}
            {/* No Recent means this is the first section, and a top margin
                under the masthead rule would print as a gap rather than as
                air. */}
            {/* Start here. Three of ours, pinned (home.ts FEATURED): the
                system the instrument is pointed at first, then two that teach
                its two depths. Shown unless a search has named something. */}
            {!q && featuredCards.length > 0 && (
              <section className={recentCards.length > 0 ? "mt-12" : ""}>
                <SectionHead label="Start here" lead={recentCards.length === 0} />
                <CardGrid across={3}>
                  {featuredCards.map((m) => (
                    <ModelCard
                      key={`featured:${m.key}`}
                      cacheKey={m.key}
                      source={slOf(m)}
                      name={m.name}
                      runs={m.runs}
                      sub={m.description}
                      onClick={() => openShipped(m)}
                    />
                  ))}
                </CardGrid>
              </section>
            )}

            {libraryOpen && (
            <section className={recentCards.length > 0 || featuredCards.length > 0 ? "mt-12" : ""}>
              <SectionHead
                label="Start from one of ours"
                // A search has put the shelves away, and the toggle only cuts
                // shelves — offering it here would be a control that does
                // nothing.
                right={q ? undefined : <ArrangeToggle value={arrange} onChange={chooseArrange} />}
              />
              {shownShipped.length === 0 ? (
                <EmptyLine>no model of ours matches “{query.trim()}”</EmptyLine>
              ) : q ? (
                // A search is a different way of finding than a shelf is. The
                // shelves are DOORS — a reader who has named what they want has
                // already gone through one, and cutting their eight matches
                // across three headed shelves (two of which would be empty,
                // because an example carries a genus and a corpus entry carries
                // a tradition and neither carries both) would hide the answer
                // behind the furniture. One grid, every match.
                <CardGrid across={3}>
                  {shownShipped.map((m) => (
                    <ModelCard
                      key={m.key}
                      cacheKey={m.key}
                      hue={hueOfModel(m)}
                      source={slOf(m)}
                      name={m.name}
                      runs={m.runs}
                      marker={m.with ? `with ${m.with}` : m.after ? `after ${m.after}` : undefined}
                      sub={m.description}
                      onClick={() => openShipped(m)}
                    />
                  ))}
                </CardGrid>
              ) : (
                // The Bench shelf (#472) holds models that exist to test the
                // instrument. Since the 2026-10-26 cut it is not among the doors:
                // the list view and the search still reach every one of them.
                shelves(shownShipped, arrange).filter((shelf) => shelf.kind !== "role").map((shelf) => {
                  const expanded = opened.includes(shelf.id);
                  const cards = expanded ? shelf.models : shelf.models.slice(0, SHELF_CARDS);
                  return (
                    <div key={`${arrange}:${shelf.id}`} className="mt-4 first:mt-3">
                      <ShelfHead
                        label={shelf.label}
                        note={shelf.note}
                        hue={shelfHue(shelf)}
                        total={shelf.models.length}
                        shown={cards.length}
                        onExpand={() => setOpened((o) => [...o, shelf.id])}
                      />
                      <CardGrid across={3}>
                        {cards.map((m) => (
                          <ModelCard
                            key={m.key}
                            cacheKey={m.key}
                            hue={shelfHue(shelf)}
                            source={slOf(m)}
                            name={m.name}
                            runs={m.runs}
                            marker={m.with ? `with ${m.with}` : m.after ? `after ${m.after}` : undefined}
                            sub={m.description}
                            onClick={() => openShipped(m)}
                          />
                        ))}
                      </CardGrid>
                    </div>
                  );
                })
              )}
            </section>
            )}

            {/* Yours. The half that grows. Manage is a MODE rather than a
                control on every card: renaming and deleting are not what a
                reader came here to do, and a × on every card invites the one
                click this page cannot undo. */}
            <section className="mt-12">
              <SectionHead
                label="Yours"
                right={
                  <span className="flex shrink-0 items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>
                      <span className="tabular">{savedCount}</span> · newest first
                    </span>
                    {savedCount > 0 && (
                      <Button size={28} variant="quiet" onClick={() => setManage((m) => !m)} aria-pressed={manage}>
                        {manage ? "done" : "manage"}
                      </Button>
                    )}
                  </span>
                }
              />
              {/* Where the models are, and the way out of this browser (#457).
                  The standing line is the browser's own answer; the export
                  date is the honest counterpart — "never" is a fact worth
                  reading, not a nag. Both only once something is saved. */}
              {savedCount > 0 && storageLine && (
                <div
                  className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  <span>{storageLine}</span>
                  <span>last exported: {exportedAt === null ? "never" : whenLabel(exportedAt)}</span>
                  {manage && onExportLibrary && (
                    <Button size={28} variant="quiet" onClick={onExportLibrary}>
                      export library (.sl)
                      <Icon name="forward" size={16} />
                    </Button>
                  )}
                </div>
              )}
              {savedCount === 0 ? (
                <EmptyLine>nothing saved yet — a model you save lands here, under its own name</EmptyLine>
              ) : shownSaved.length === 0 ? (
                <EmptyLine>none of your models matches “{query.trim()}”</EmptyLine>
              ) : (
                <>
                  <CardGrid across={3}>
                    {(showAllSaved || q ? shownSaved : shownSaved.slice(0, SHELF_CARDS)).map((node) => (
                      <SavedCard
                        key={node.name}
                        node={node}
                        manage={manage}
                        onLoad={onLoad}
                        onDelete={onDelete}
                        onRename={onRename}
                      />
                    ))}
                  </CardGrid>
                  {!showAllSaved && !q && shownSaved.length > SHELF_CARDS && (
                    <div className="mt-3">
                      <Button size={28} variant="quiet" onClick={() => setShowAllSaved(true)}>
                        and {shownSaved.length - SHELF_CARDS} more
                        <Icon name="forward" size={16} />
                      </Button>
                    </div>
                  )}
                </>
              )}
              {/* #472 fold: a draft is one of yours; no shelf head, the
                  marker says it was drafted and the gloss says by which model. */}
              {shownDrafted.length > 0 && (
                <div className="mt-3" data-testid="drafted-cards">
                  <CardGrid across={3}>
                    {shownDrafted.slice(0, q ? shownDrafted.length : SHELF_CARDS).map((d) => (
                      <ModelCard
                        key={d.key}
                        cacheKey={d.key}
                        source={d.sl}
                        name={d.description}
                        marker="drafted"
                        sub={`${draftedGloss(d)} · ${d.model}`}
                        onClick={() => onOpenDrafted(d.sl)}
                      />
                    ))}
                  </CardGrid>
                </div>
              )}
            </section>

            <section className="mt-12">
              <SectionHead label="From a file" />
              <button
                onClick={onOpenFile}
                className="home-panel flex w-full items-center gap-4 rounded-md border px-3 py-2 text-left"
                style={{ borderColor: "var(--hairline)", background: "var(--bg-secondary)" }}
              >
                <span
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border"
                  style={{ borderColor: "var(--hairline)", background: "var(--bg-primary)", color: "var(--text-muted)" }}
                >
                  <Icon name="file" size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block leading-tight" style={{ ...doorStyle, ...d3 }}>
                    Open a file…
                  </span>
                  <span className="mt-0.5 block truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                    a model .json from your computer
                  </span>
                </span>
              </button>
            </section>

            <div className="mt-8 pt-4" style={{ borderTop: "1px solid var(--hairline)" }}>
              <Button size={28} variant="quiet" onClick={() => setView("list")}>
                Browse all {all.length + savedCount} as a list
                <Icon name="forward" size={16} />
              </Button>
            </div>
          </>
        )}
      </Column>
    </div>
  );
}

/** The search field, set in the masthead opposite the title. It narrows every
 *  section on the page at once rather than filtering one of them, because the
 *  reader searching for "ribosome" does not know or care which section holds
 *  it. */
function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // The Input primitive (32 tall, 4px, the global focus ring) with the drawn
  // search mark set inside its left padding (rules 10, 14).
  return (
    <label className="relative flex w-full items-center sm:w-72">
      <Icon name="search" size={16} className="pointer-events-none absolute left-2" style={{ color: "var(--text-muted)" }} />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Find a model"
        aria-label="Find a model"
        className="w-full min-w-0 pl-8"
      />
    </label>
  );
}

/** By lens | By domain. One control with two states, a segmented pair: 28px
 *  cells in the label style (rules 5, 11), the chosen one filled with the
 *  accent (rule 8: the armed state wears the accent) and saying so with
 *  `aria-pressed`, the other on the sheet. */
function ArrangeToggle({ value, onChange }: { value: Arrange; onChange: (v: Arrange) => void }) {
  const cell = (v: Arrange, label: string) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      aria-pressed={value === v}
      className={`h-7 px-2.5 ${LABEL}`}
      style={{
        letterSpacing: "var(--tracking-label)",
        background: value === v ? "var(--accent)" : "var(--bg-secondary)",
        color: value === v ? "var(--text-on-accent)" : "var(--text-secondary)",
      }}
    >
      {label}
    </button>
  );
  return (
    <span
      className="inline-flex shrink-0 overflow-hidden rounded-sm border"
      style={{ borderColor: "var(--rule-strong)" }}
      role="group"
      aria-label="Arrange the shelves"
    >
      {cell("domain", "By domain")}
      {cell("lens", "By lens")}
    </span>
  );
}

/** A section that has nothing to show, saying so in one line on the rule. The
 *  page keeps its shape: an empty section is a sentence, never a gap. Plain
 *  Inter: the italic serif lede is on the charter's withdrawn list. */
function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <div className="border-t py-3 text-sm" style={{ borderColor: "var(--hairline)", color: "var(--text-muted)" }}>
      {children}
    </div>
  );
}

/** The saved tree, flattened to the grid's reading order — newest first, a
 *  child no less openable than its root. The nesting is the LIST view's
 *  subject; a card grid has no place to draw it and should not pretend. */
function flattenSaved(tree: LibraryNode[]): LibraryNode[] {
  const out: LibraryNode[] = [];
  const walk = (n: LibraryNode) => {
    out.push(n);
    n.children.forEach(walk);
  };
  tree.forEach(walk);
  return out.sort((a, b) => b.savedAt - a.savedAt);
}

/** What a saved model's card says under its name. Lineage when the record has
 *  it — "your copy · from The Steel-Plant…" is the fact that a reader looking
 *  at two similar names most needs. */
function savedSubline(node: LibraryNode, at?: number): string {
  const when = whenLabel(at ?? node.savedAt);
  return node.from ? `your copy · from ${node.from} · ${when}` : `yours · ${when}`;
}

/** One saved model as a card. In manage mode it grows the two controls the list
 *  view has always carried — rename in place (Enter or blur commits, Esc
 *  cancels, a refused name keeps the field open) and delete — running through
 *  the same handlers, so there is one delete in this app and not two. */
function SavedCard({
  node,
  manage,
  onLoad,
  onDelete,
  onRename,
}: {
  node: LibraryNode;
  manage: boolean;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
  onRename: (from: string, to: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  const commit = async () => {
    if (draft === null || cancelled.current) return;
    if (await onRename(node.name, draft)) setDraft(null);
  };
  if (draft !== null) {
    return (
      <div
        className="flex min-w-0 items-center gap-3 rounded-md border px-3 py-2"
        style={{ borderColor: "var(--hairline)", background: "var(--bg-secondary)" }}
      >
        <CardThumb cacheKey={`saved:${node.name}`} source={node.json} kind="archive" well={YOURS_WELL} />
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commit();
            if (e.key === "Escape") {
              cancelled.current = true;
              setDraft(null);
            }
          }}
          onBlur={() => void commit()}
          aria-label={`Rename ${node.name}`}
          className="min-w-0 flex-1"
        />
      </div>
    );
  }
  return (
    <ModelCard
      cacheKey={`saved:${node.name}`}
      source={node.json}
      sourceKind="archive"
      well={YOURS_WELL}
      name={node.name}
      sub={savedSubline(node)}
      onClick={manage ? undefined : () => onLoad(node.name)}
      trailing={
        manage ? (
          <span className="flex shrink-0 items-center gap-1">
            <Button
              size={28}
              variant="quiet"
              icon="edit"
              onClick={() => {
                cancelled.current = false;
                setDraft(node.name);
              }}
              title={`Rename ${node.name} — same model, new library name`}
              aria-label={`Rename ${node.name}`}
            />
            <Button
              size={28}
              variant="quiet"
              icon="delete"
              onClick={() => onDelete(node.name)}
              title={`Delete ${node.name}`}
              aria-label={`Delete ${node.name}`}
              style={{ color: "var(--verdict-error)" }}
            />
          </span>
        ) : undefined
      }
    />
  );
}

// ---------------------------------------------------------------------------
// the list view
// ---------------------------------------------------------------------------

/** The flat ledger the library used to open on: every model on one page in the
 *  canonical reading order, partitioned by provenance, with the facet filter
 *  above it. It is no longer the front door — the doors are — but it is the
 *  only view that shows the WHOLE library at once, and citations, sibling-set
 *  names and tags all read here, so it keeps every line it had. */
function LedgerView({
  all,
  allFacets,
  facet,
  setFacet,
  tree,
  savedCount,
  drafted,
  showAllSaved,
  setShowAllSaved,
  onOpenExample,
  onOpenCorpus,
  onOpenDrafted,
  onLoad,
  onDelete,
  onRename,
  onOpenFile,
  onBackToDoors,
}: {
  all: ShippedModel[];
  allFacets: Facet[];
  facet: Tag | null;
  setFacet: (f: Tag | null) => void;
  tree: LibraryNode[];
  savedCount: number;
  drafted: DraftedModel[];
  showAllSaved: boolean;
  setShowAllSaved: (v: boolean) => void;
  onOpenExample: (d: Demo) => void;
  onOpenCorpus: (e: CorpusEntry) => void;
  onOpenDrafted: (sl: string) => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
  onRename: (from: string, to: string) => Promise<boolean>;
  onOpenFile: () => void;
  onBackToDoors: () => void;
}) {
  const shown = all.filter((m) => matchesFacet(m, facet));
  const shownRoots = showAllSaved ? tree : tree.slice(0, INLINE_LIBRARY_ROOTS);
  const foldedRoots = tree.length - shownRoots.length;
  const genera = allFacets.filter((f) => f.kind === "genus");
  const traditions = allFacets.filter((f) => f.kind === "tradition");
  const isSelected = (f: Facet) => facet?.kind === f.kind && facet?.id === f.id;
  const toggle = (f: Facet) => setFacet(isSelected(f) ? null : f);
  return (
    <>
      <div className="mb-4">
        <Button size={28} variant="quiet" icon="back" onClick={onBackToDoors}>
          Doors
        </Button>
      </div>

      {/* The filter, immediately above the models — genus and tradition are
          facts about a model, not places a model lives, so they narrow the list
          in place. Counts come off the same list the section below renders
          (home.ts), so a facet's number cannot drift from what selecting it
          shows. */}
      <section className="pb-2">
        <FilterLine label="Genus">
          {genera.map((f) => (
            <FacetButton key={`genus:${f.id}`} facet={f} selected={isSelected(f)} onClick={() => toggle(f)} />
          ))}
        </FilterLine>
        <FilterLine label="Tradition">
          {traditions.map((f) => (
            <FacetButton
              key={`tradition:${f.id}`}
              facet={f}
              selected={isSelected(f)}
              onClick={() => toggle(f)}
            />
          ))}
          {facet && (
            <Button size={28} variant="quiet" icon="close" onClick={() => setFacet(null)}>
              clear · show all {all.length}
            </Button>
          )}
        </FilterLine>
      </section>

      {/* Ships. One flat list — every model that comes with the app, opened
          from the row it is listed on. */}
      <section className="mt-8">
        <BlockHeader label="Ships with the app" count={`${shown.length} model${shown.length === 1 ? "" : "s"}`} />
        {shown.length === 0 ? (
          <EmptyLine>no model carries that tag</EmptyLine>
        ) : (
          <Ledger>
            {shown.map((m, i) => (
              <ModelRow
                key={m.key}
                model={m}
                index={i + 1}
                onClick={() =>
                  m.open.kind === "example" ? onOpenExample(m.open.demo) : onOpenCorpus(m.open.entry)
                }
              />
            ))}
          </Ledger>
        )}
      </section>

      {/* Yours. The other half of the partition, and the half that grows:
          a release ships a handful of models and everything else is the
          user's own. Saved models carry no genus or tradition, so a facet
          selection empties this section rather than silently ignoring it. */}
      <section className="mt-12">
        <BlockHeader label="Yours" count={`${savedCount} model${savedCount === 1 ? "" : "s"}`} />
        {facet ? (
          <EmptyLine>your models carry no genus or tradition tag — clear the filter to see them</EmptyLine>
        ) : tree.length === 0 && drafted.length === 0 ? (
          <EmptyLine>no saved models yet</EmptyLine>
        ) : (
          <div style={{ borderTop: "1px solid var(--rule-strong)" }}>
            {shownRoots.map((root, i) => (
              <div
                key={root.name}
                className="grid w-full grid-cols-[3rem_1fr] items-stretch border-b"
                style={{ borderColor: "var(--hairline)" }}
              >
                <span
                  className="flex items-start justify-end pr-4 pt-3 text-xs tabular"
                  style={{ color: "var(--text-muted)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="py-2 pr-2">
                  <LibraryRow node={root} depth={0} onLoad={onLoad} onDelete={onDelete} onRename={onRename} />
                </div>
              </div>
            ))}
            {foldedRoots > 0 && (
              <div className="border-b py-2 pl-12" style={{ borderColor: "var(--hairline)" }}>
                <Button size={28} variant="quiet" onClick={() => setShowAllSaved(true)}>
                  show all {tree.length} saved models
                  <Icon name="forward" size={16} />
                </Button>
              </div>
            )}
            {/* #472 fold: drafts are yours too — rows in the same list, the
                chip saying so and naming the model that answered. */}
            {drafted.map((d, i) => (
              <LedgerRow
                key={d.key}
                index={shownRoots.length + i + 1}
                name={d.description}
                description={draftedGloss(d)}
                tag={`drafted · ${d.model}`}
                onClick={() => onOpenDrafted(d.sl)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <BlockHeader label="From a file" />
        <Ledger>
          <LedgerRow
            door
            folio={<Icon name="file" size={16} />}
            name="Open a file…"
            description="a model .json from your computer"
            tag="disk"
            onClick={onOpenFile}
          />
        </Ledger>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------
// the model row
// ---------------------------------------------------------------------------

/** One model in the flat list. Three cells, and the row is two lines tall so a
 *  list of forty scans:
 *
 *    [ gutter ] [ NAME + gloss ]                      [ tags / citation ]
 *
 *  The gutter is a fixed 3rem cell holding the folio numeral. It is sized to
 *  take a diagram thumbnail later (#311) — the thumbnail swaps into this cell
 *  and nothing else on the row moves.
 *
 *  Identical row for an example and a corpus entry; the CITATION is the
 *  separator, and it is per-row now that there are no shelves to hoist a shared
 *  one onto. The `runs` mark is the EXCEPTION, never the rule: every model here
 *  is structural, so a label saying so on every row says nothing. */
/** #311: the row's left cell. It holds the model's own diagram once the kernel
 *  has compiled it, and the folio numeral until then (or for good, if the model
 *  does not compile). The cell is the same 3rem either way, so nothing in the
 *  row moves when the drawing arrives. */
function ModelGutter({ model, index }: { model: ShippedModel; index: number }) {
  const sl = model.open.kind === "example" ? model.open.demo.sl : model.open.entry.sl;
  const compiled = useThumbnailModel(model.key, sl);
  return (
    <span
      className="record-folio flex items-start justify-end pr-1 pt-1 text-xs tabular"
      style={{ color: "var(--text-muted)", transition: "color var(--transition-base)" }}
    >
      {compiled ? <Thumbnail model={compiled} size={40} /> : String(index).padStart(2, "0")}
    </span>
  );
}

function ModelRow({
  model,
  index,
  onClick,
}: {
  model: ShippedModel;
  index: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="record-row grid w-full grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-4 border-b py-3 text-left sm:grid-cols-[3rem_minmax(0,1fr)_auto]"
      style={{ borderColor: "var(--hairline)" }}
    >
      <ModelGutter model={model} index={index} />
      <span className="block min-w-0">
        <span className="flex items-baseline gap-3">
          <span className="truncate leading-tight" style={{ ...nameStyle, ...d3 }}>
            {model.name}
          </span>
          {model.runs && <Pill tone="runs">runs</Pill>}
          {model.with && (
            <span className="shrink-0" data-testid="row-marker">
              <Pill tone="with">with {model.with}</Pill>
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-sm" style={{ color: "var(--text-secondary)" }}>
          {model.description}
        </span>
      </span>
      <span className="col-start-2 block min-w-0 pt-1 text-left sm:col-start-3 sm:max-w-[16rem] sm:shrink-0 sm:text-right">
        <span className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1 sm:justify-end">
          {/* Tags and the set name are labels; the citation is prose at meta. */}
          {model.tags.map((t) => (
            <span key={`${t.kind}:${t.id}`} className={`inline-flex items-center gap-1.5 ${LABEL}`} style={labelStyle}>
              {hueOf(t) && (
                <span aria-hidden className="h-2.5 w-0.5 shrink-0" style={{ background: hueOf(t) }} />
              )}
              {t.label}
            </span>
          ))}
          {model.set && (
            <span className={LABEL} style={labelStyle}>
              {model.set}
            </span>
          )}
        </span>
        {model.citation && (
          <span className="mt-1 block text-xs leading-4" style={{ color: "var(--text-muted)" }}>
            {model.citation}
          </span>
        )}
      </span>
    </button>
  );
}


// ---------------------------------------------------------------------------
// my library rows (rendered inline in the library browser)
// ---------------------------------------------------------------------------

function relTime(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// One library row plus, recursively, the rows of the children its `decomposes`
// references reach (#105) — the root at depth 0, each level indented one step
// with a connector glyph. Every row loads on click, deletes on ×, and renames
// on ✎ (#116 candidate 3): the name becomes an input, Enter or blur commits,
// Esc cancels — the same commit grammar as the click-to-edit membrane labels.
// A refused rename (name collision) keeps the row in edit mode so the user
// can pick again; the slot's identity never changes, so a renamed child stays
// exactly where its parent's stamp reaches it. Deleting a parent never touches
// its children (the next listing reads them as roots). A reference that
// resolves to no saved record shows as a quiet "n missing" note on the parent
// — the library-level echo of the kernel's missing-referent issue on the
// canvas.
function LibraryRow({
  node,
  depth,
  onLoad,
  onDelete,
  onRename,
}: {
  node: LibraryNode;
  depth: number;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
  onRename: (from: string, to: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  // Esc cancels by design, but the input's blur (fired as it leaves) must not
  // resurrect the commit from the pre-cancel render — the ref outlives the
  // stale closure.
  const cancelled = useRef(false);
  const commit = async () => {
    if (draft === null || cancelled.current) return;
    if (await onRename(node.name, draft)) setDraft(null);
  };
  return (
    <>
      <div
        className={depth === 0 ? "flex items-center gap-2" : "mt-1 flex items-center gap-2"}
        style={{ paddingLeft: depth === 0 ? 0 : (depth - 1) * 16 }}
      >
        {depth > 0 && (
          <Icon name="tree" size={16} className="shrink-0" style={{ color: "var(--text-muted)" }} />
        )}
        {draft !== null ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commit();
              if (e.key === "Escape") {
                cancelled.current = true;
                setDraft(null);
              }
            }}
            onBlur={() => void commit()}
            className="min-w-0 flex-1"
            aria-label={`Rename ${node.name}`}
          />
        ) : (
          <button onClick={() => onLoad(node.name)} className="min-w-0 flex-1 text-left" title={node.name}>
            <div
              className={depth === 0 ? "truncate leading-tight" : "truncate text-sm font-medium"}
              style={depth === 0 ? { ...nameStyle, ...d3 } : { color: "var(--text-primary)" }}
            >
              {node.name}
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              saved {relTime(node.savedAt)}
              {node.missingReferents > 0 &&
                ` · ${node.missingReferents} referent${node.missingReferents === 1 ? "" : "s"} missing`}
            </div>
          </button>
        )}
        {draft === null && (
          <Button
            size={28}
            variant="quiet"
            icon="edit"
            onClick={() => {
              cancelled.current = false;
              setDraft(node.name);
            }}
            title={`Rename ${node.name} — same model, new library name`}
            aria-label={`Rename ${node.name}`}
          />
        )}
        <Button
          size={28}
          variant="quiet"
          icon="delete"
          onClick={() => onDelete(node.name)}
          title={`Delete ${node.name}`}
          aria-label={`Delete ${node.name}`}
          style={{ color: "var(--verdict-error)" }}
        />
      </div>
      {node.children.map((c) => (
        <LibraryRow key={c.name} node={c} depth={depth + 1} onLoad={onLoad} onDelete={onDelete} onRename={onRename} />
      ))}
    </>
  );
}
