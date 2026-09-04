// The home screen — a menu with three doors, not a modal stacked on an empty
// canvas. Two levels, one surface:
//
//   home     Start (Draw your system · Build from data) · Continue (Open a model)
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
// something: --seal marks a selected filter and the one exception tag, and
// --world-* names a tradition. These tokens are scoped to this file's root, so
// the workspace surface is untouched.
//
// The printed-page devices this surface briefly carried (a rubric rule opening
// every title block, a display serif on the masthead, roman folios, a narrow
// measure) came from a design brief, not from a stated preference, and were
// withdrawn 2026-08-12 when asked about directly.
//
// Names keep their authored case — small caps, never text-transform (the model
// is named `hal`, not `HAL`).
import { useState, useRef, useEffect, type CSSProperties, type ReactNode } from "react";
import type { Demo } from "./demos";
import type { CorpusEntry } from "./corpus";
import type { LibraryNode } from "./libraryTree";
import { draftedModels, type DraftedModel } from "./drafted";
import {
  facets,
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
import { openExternal } from "./desktop";
import { buildInfo, provenanceLines } from "./buildInfo";
import Thumbnail from "./canvas/Thumbnail";
import { useThumbnailModel } from "./canvas/useThumbnail";

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
  /** #309: the Klir lens's data-first front door — author a data system before
   *  (or instead of) any structure. */
  onStartFromData: () => void;
  onOpenExample: (d: Demo) => void;
  onOpenCorpus: (e: CorpusEntry) => void;
  onOpenDrafted: (sl: string) => void;
  onOpenFile: () => void;
  libraryTree: LibraryNode[];
  onLoadFromLibrary: (name: string) => void;
  onDeleteFromLibrary: (name: string) => void;
  onRenameInLibrary: (from: string, to: string) => Promise<boolean>;
  /** Back to the model on the canvas — null when nothing is loaded. */
  onClose: (() => void) | null;
}

export function HomeScreen(props: HomeProps) {
  const [route, setRoute] = useState<HomeRoute>(props.initialRoute ?? { view: "home" });
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      style={{ backgroundColor: "var(--paper-ground)", color: "var(--ink)" }}
    >
      {/* One page, one measure. Every level sets inside the same reading column
          — there is no full-bleed device, because the page ground IS the
          identity and a band would interrupt it.

          The sheet: the content sits on --paper against a --paper-ground that
          is one neutral step away, so the page has an edge without a border,
          a shadow, or a tint doing the work. Its measure is wider than the
          reading column's, so the type keeps real margins rather than running
          to the paper's edge. */}
      <div
        className="mx-auto w-full max-w-4xl flex-1 border-x"
        style={{ backgroundColor: "var(--paper)", borderColor: "var(--rule-soft)" }}
      >
        {route.view === "home" && (
          <HomeMenu
            onCreate={props.onCreate}
            onStartFromData={props.onStartFromData}
            onOpenLibrary={() => setRoute({ view: "library" })}
            onAbout={() => setRoute({ view: "about" })}
          />
        )}
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
          />
        )}
        {props.onClose && (
          <Column className="pb-12">
            <button
              onClick={props.onClose}
              className="text-[11px] uppercase tracking-[0.2em]"
              style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}
            >
              ‹ back to the model on the canvas
            </button>
          </Column>
        )}
      </div>
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
    <div className={`mx-auto w-full max-w-4xl px-8 ${className}`}>
      {children}
    </div>
  );
}

const mono = "var(--font-mono)";
const display = "var(--font-display)";

/** A folio: the small letterspaced mono line that sits above a title block and
 *  under a table. Back links and kickers are the same object. */
const folioStyle: CSSProperties = {
  fontFamily: mono,
  color: "var(--ink-muted)",
};

/** A name as this instrument sets names: letterspaced small caps with the
 *  AUTHORED case intact. text-transform would print `hal` as `HAL` and lie
 *  about the model's name; small caps buys the same even ledger colour without
 *  touching the string. */
const nameStyle: CSSProperties = {
  fontFamily: display,
  fontVariantCaps: "small-caps",
  letterSpacing: "0.045em",
  color: "var(--ink)",
};

/** UI copy that names a door rather than a record — set in the serif at full
 *  case, so a DOOR ("Create a model") and a NAME (`hal`) are visibly different
 *  kinds of thing on the same page. */
const doorStyle: CSSProperties = {
  fontFamily: display,
  color: "var(--ink)",
};

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
        <button
          onClick={back.onClick}
          className={`${dense ? "mb-6" : "mb-10"} block text-[11px] uppercase tracking-[0.22em]`}
          style={folioStyle}
        >
          ‹ {back.label}
        </button>
      )}
      <div className={`flex items-start justify-between gap-10 ${dense ? "pt-1" : "pt-6"}`}>
        <div className="flex min-w-0 items-center gap-6">
          {mark}
          <div className="min-w-0">
            {eyebrow && (
              <div className="mb-3 text-[11px] uppercase tracking-[0.3em]" style={folioStyle}>
                {eyebrow}
              </div>
            )}
            <h1
              className={`${dense ? "text-5xl" : "text-6xl"} leading-[0.95] tracking-tight`}
              style={{ fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}
            >
              {title}
            </h1>
          </div>
        </div>
        {aside && <div className="shrink-0 pt-2">{aside}</div>}
        {stat !== undefined && (
          <div className="shrink-0 pt-1 text-right">
            <div
              className="text-5xl leading-none"
              style={{ fontWeight: 600, color: "var(--ink)" }}
            >
              {stat}
            </div>
            <div className="mt-2 text-[10px] uppercase tracking-[0.24em]" style={folioStyle}>
              {statLabel}
            </div>
          </div>
        )}
      </div>
      {lede && (
        <p
          className={`${dense ? "mt-4 max-w-2xl text-lg" : "mt-6 max-w-xl text-xl"} leading-snug`}
          style={{ color: "var(--ink-secondary)" }}
        >
          {lede}
          {note ? ` — ${note}` : ""}
        </p>
      )}
      {!lede && note && (
        <p className="mt-5 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ink-secondary)" }}>
          {note}
        </p>
      )}
      <div className={dense ? "mt-6" : "mt-8"} style={{ borderTop: "1px solid var(--rule)" }} />
    </Column>
  );
}

/** A section mark: a letterspaced label, a hairline running out to the margin,
 *  and — where the section has one — its count at the right. A printed section
 *  head, not a tinted strip. */
function BlockHeader({ label, count }: { label: string; count?: string }) {
  return (
    <div className="flex items-baseline gap-4 pb-3">
      <span className="text-[11px] uppercase tracking-[0.28em]" style={folioStyle}>
        {label}
      </span>
      <span className="h-px min-w-6 flex-1" style={{ background: "var(--rule-soft)" }} />
      {count && (
        <span className="shrink-0 text-[11px] tabular" style={{ color: "var(--ink-muted)" }}>
          {count}
        </span>
      )}
    </div>
  );
}

/** The table. It opens on a head rule; its entries close on hairlines. */
function Ledger({ children }: { children: ReactNode }) {
  return <div style={{ borderTop: "1px solid var(--rule)" }}>{children}</div>;
}

/** The folio column: a numeral in the left margin of the entry, in mono so the
 *  column stays true, separated from the entry by nothing but space. It takes
 *  the rubric under the cursor (see .record-row in index.css). */
function Gutter({ index, folio }: { index?: number; folio?: string }) {
  return (
    <span
      className="record-folio flex items-start justify-end pr-5 pt-5 text-[11px] tabular"
      style={{ color: "var(--ink-muted)", transition: "color var(--transition-base)" }}
    >
      {folio ?? (index === undefined ? "·" : String(index).padStart(2, "0"))}
    </span>
  );
}

/** The exception mark. Not a chip — a printed marginal note: the rubric, in the
 *  serif italic, set small beside the name. */
function Chip({ children }: { children: ReactNode }) {
  return (
    <span
      className="ml-auto shrink-0 self-baseline text-sm"
      style={{ fontFamily: display, fontStyle: "italic", color: "var(--seal)" }}
    >
      {children}
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
  folio?: string;
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
          <span className={door ? "text-2xl leading-tight" : "text-xl leading-tight"} style={door ? doorStyle : nameStyle}>
            {name}
          </span>
          {tag && <Chip>{tag}</Chip>}
        </span>
        <span
          className="mt-1.5 block max-w-xl text-sm leading-relaxed"
          style={{ color: "var(--ink-secondary)" }}
        >
          {description}
        </span>
        {trailing}
      </span>
    </>
  );
  const style = { borderColor: "var(--rule-soft)" };
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

function Gem() {
  return (
    <svg viewBox="0 0 80 80" width="72" height="72" aria-hidden="true" className="shrink-0">
      <polygon
        points={GEM_RIM.map((p) => p.join(",")).join(" ")}
        style={{ fill: "var(--paper)", stroke: "var(--ink)", strokeWidth: 0.35 }}
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
          style={{ stroke: "var(--ink)", strokeWidth: 0.2, opacity: 0.5 }}
        />
      ))}
    </svg>
  );
}

// The door glyphs: line drawings in the instrument's own vocabulary — a
// boundary holding processes and flows, a table of observations, a stack of
// saved sheets, a loop that runs. Stroke and fill take the row's ink so the
// hover tint carries through (see .home-panel in index.css).
const glyphStroke: CSSProperties = { stroke: "currentColor", fill: "none" };
const glyphFill: CSSProperties = { fill: "currentColor" };
// A closed shape in a glyph wears the soft accent: colour as a filled region
// with an edge, never a fade — the one tint the page carries at rest.
const glyphWash: CSSProperties = { stroke: "currentColor", fill: "var(--accent-soft)" };

function DrawGlyph() {
  return (
    <svg viewBox="0 0 96 64" width="96" height="64" aria-hidden="true" className="home-glyph shrink-0">
      <ellipse cx={48} cy={32} rx={44} ry={27} style={glyphStroke} strokeWidth={1} strokeDasharray="3 3" />
      <circle cx={26} cy={40} r={7} style={glyphWash} strokeWidth={1.2} />
      <circle cx={48} cy={20} r={7} style={glyphWash} strokeWidth={1.2} />
      <circle cx={70} cy={40} r={7} style={glyphWash} strokeWidth={1.2} />
      <line x1={31.5} y1={35} x2={41} y2={26.5} style={glyphStroke} strokeWidth={1.2} />
      <polygon points="39,24 44,23.5 41.5,28" style={glyphFill} />
      <line x1={55} y1={26.5} x2={64.5} y2={35} style={glyphStroke} strokeWidth={1.2} />
      <polygon points="62,37.5 67,37 64.5,32.5" style={glyphFill} />
    </svg>
  );
}

function DataGlyph() {
  return (
    <svg viewBox="0 0 96 64" width="96" height="64" aria-hidden="true" className="home-glyph shrink-0">
      <rect x={6} y={8} width={84} height={48} style={glyphStroke} strokeWidth={1} />
      <rect x={6} y={8} width={84} height={12} style={{ fill: "var(--accent-soft)" }} />
      <line x1={6} y1={20} x2={90} y2={20} style={glyphStroke} strokeWidth={1} />
      <line x1={6} y1={32} x2={90} y2={32} style={glyphStroke} strokeWidth={0.6} strokeDasharray="2 2" />
      <line x1={6} y1={44} x2={90} y2={44} style={glyphStroke} strokeWidth={0.6} strokeDasharray="2 2" />
      <line x1={34} y1={8} x2={34} y2={56} style={glyphStroke} strokeWidth={0.6} />
      <line x1={62} y1={8} x2={62} y2={56} style={glyphStroke} strokeWidth={0.6} />
      <circle cx={20} cy={14} r={2} style={glyphFill} />
      <circle cx={48} cy={14} r={2} style={glyphFill} />
      <circle cx={76} cy={14} r={2} style={glyphFill} />
    </svg>
  );
}

function OpenGlyph() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true" className="home-glyph shrink-0">
      <rect x={12} y={6} width={26} height={32} style={{ ...glyphStroke, fill: "var(--paper)" }} strokeWidth={1} />
      <rect x={8} y={10} width={26} height={32} style={glyphWash} strokeWidth={1} />
      <line x1={14} y1={20} x2={28} y2={20} style={glyphStroke} strokeWidth={0.8} />
      <line x1={14} y1={26} x2={28} y2={26} style={glyphStroke} strokeWidth={0.8} />
    </svg>
  );
}

function SandboxGlyph() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true" className="home-glyph shrink-0">
      <circle cx={14} cy={24} r={6} style={glyphWash} strokeWidth={1.1} />
      <circle cx={36} cy={24} r={6} style={glyphWash} strokeWidth={1.1} />
      <path d="M20 24 Q25 14 30 24" style={glyphStroke} strokeWidth={1.1} />
      <path d="M30 24 Q25 34 20 24" style={glyphStroke} strokeWidth={1.1} strokeDasharray="2 2" />
    </svg>
  );
}

/** A door as a panel: a glyph, the door's name in the serif, and a gloss. The
 *  same shape for every door; Start's two carry a larger glyph. */
function Panel({
  glyph,
  name,
  description,
  onClick,
  href,
}: {
  glyph: ReactNode;
  name: string;
  description: string;
  onClick?: () => void;
  href?: string;
}) {
  const cls = "home-panel flex w-full items-center gap-5 border px-6 py-5 text-left";
  const style = { borderColor: "var(--rule-soft)", color: "var(--ink)" };
  const body = (
    <>
      {glyph}
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-2xl leading-tight" style={doorStyle}>
          {name}
        </span>
        <span className="text-sm leading-relaxed" style={{ color: "var(--ink-secondary)" }}>
          {description}
        </span>
      </span>
    </>
  );
  return href ? (
    <a href={href} className={cls} style={style}>
      {body}
    </a>
  ) : (
    <button onClick={onClick} className={cls} style={style}>
      {body}
    </button>
  );
}

/** A group mark for a set of doors — the section head, with the lead group in
 *  the accent so the eye lands on Start. */
function GroupHeader({ label, lead }: { label: string; lead?: boolean }) {
  return (
    <div className="flex items-baseline gap-4 pb-3.5">
      <span
        className="text-[11px] uppercase tracking-[0.28em]"
        style={{ ...folioStyle, color: lead ? "var(--accent)" : "var(--ink-muted)" }}
      >
        {label}
      </span>
      <span className="h-px min-w-6 flex-1" style={{ background: "var(--rule-soft)" }} />
    </div>
  );
}

const ledeLink: CSSProperties = {
  color: "var(--ink)",
  borderBottom: "1px solid var(--accent)",
  paddingBottom: 1,
};

export function HomeMenu({
  onCreate,
  onStartFromData,
  onOpenLibrary,
  onAbout,
}: {
  /** Open a blank canvas; `{ sl: true }` opens it with the SL pane showing,
   *  which is where "describe it in a few lines" lands. */
  onCreate: (opts?: { sl?: boolean }) => void;
  onStartFromData?: () => void;
  onOpenLibrary: () => void;
  /** Open the provenance page (#229). Optional so the menu renders standalone. */
  onAbout?: () => void;
}) {
  const lede = (
    <>
      <button className="home-lede-link" style={ledeLink} onClick={() => onCreate()}>
        Draw a system
      </button>
      , or{" "}
      <button className="home-lede-link" style={ledeLink} onClick={() => onCreate({ sl: true })}>
        describe it in a few lines
      </button>
      , and the instrument checks the structure as you go.
    </>
  );
  return (
    <div>
      <Masthead
        title={
          <span>
            facets&#8202;·&#8202;<span style={{ color: "var(--accent)" }}>model</span>
          </span>
        }
        mark={<Gem />}
        lede={lede}
      />
      <Column className="pb-16 pt-10">
        <GroupHeader label="Start" lead />
        <div className="grid grid-cols-2 gap-5">
          <Panel
            glyph={<DrawGlyph />}
            name="Draw your system"
            description="Components, flows, a boundary. Every step is checked as you draw."
            onClick={() => onCreate()}
          />
          {onStartFromData && (
            <Panel
              glyph={<DataGlyph />}
              name="Build from data"
              description="Start from a CSV or a few observations, and find the structure in them."
              onClick={onStartFromData}
            />
          )}
        </div>
        <div className="mt-9 grid grid-cols-2 gap-5">
          <div>
            <GroupHeader label="Continue" />
            <Panel
              glyph={<OpenGlyph />}
              name="Open a model"
              description="Library, your saved models, or a file."
              onClick={onOpenLibrary}
            />
          </div>
          <div>
            <GroupHeader label="Try" />
            <Panel
              glyph={<SandboxGlyph />}
              name="Sandbox"
              description="Drop in processes, wire them, press Run. Change a rate mid-run and watch the flow answer."
              href="?sandbox=1"
            />
          </div>
        </div>
        {/* The colophon. A printed record states its edition at the foot of the
            page, not in its table of contents — and the provenance is what this
            page's claim rests on, so it belongs on the page, quietly, rather
            than among the doors. The docs sit beside it: a reference, not a door. */}
        <div
          className="mt-14 flex items-baseline gap-8 border-t pt-4"
          style={{ borderColor: "var(--rule-soft)" }}
        >
          {onAbout && (
            <button
              onClick={onAbout}
              className="record-folio text-[11px] uppercase tracking-[0.2em]"
              style={folioStyle}
            >
              This build
            </button>
          )}
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noreferrer"
            onClick={openExternal}
            className="record-folio text-[11px] uppercase tracking-[0.2em]"
            style={folioStyle}
          >
            Documentation
          </a>
        </div>
      </Column>
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
      <Column className="pb-20 pt-12">
        <BlockHeader label="Provenance" count={buildInfo.gitSha} />
        <div style={{ borderTop: "1px solid var(--rule)" }}>
          {provenanceLines().map((line) => (
            <div
              key={line.label}
              className="grid grid-cols-[10rem_1fr] gap-5 border-b py-3"
              style={{ borderColor: "var(--rule-soft)" }}
            >
              <span
                className="text-[11px] uppercase tracking-[0.18em]"
                style={folioStyle}
              >
                {line.label}
              </span>
              <span className="min-w-0">
                <span
                  className="block break-all text-[11px]"
                  style={{ fontFamily: mono, color: "var(--ink)" }}
                >
                  {line.value}
                </span>
                {line.note && (
                  <span className="mt-1 block text-[11px]" style={{ color: "var(--ink-muted)" }}>
                    {line.note}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-5 max-w-xl text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
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
      className="record-row flex items-baseline gap-2 pb-1.5 pt-1 text-left"
      style={{
        borderBottom: selected
          ? `2px solid ${hue ?? "var(--seal)"}`
          : "1px solid var(--rule-soft)",
      }}
    >
      {hue && <span aria-hidden className="h-2 w-0.5 shrink-0 self-center" style={{ background: hue }} />}
      <span
        className="text-base leading-none"
        style={{ ...nameStyle, color: selected ? "var(--ink)" : "var(--ink-secondary)" }}
      >
        {facet.label}
      </span>
      <span className="shrink-0 text-[10px] tabular" style={{ color: "var(--ink-muted)" }}>
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
      <span className="w-24 shrink-0 text-[11px] uppercase tracking-[0.22em]" style={folioStyle}>
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
const YOURS_WELL = { fill: "var(--paper-edge)", edge: "var(--accent-slate)" };

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
      className="flex h-11 w-11 shrink-0 items-center justify-center border"
      style={{
        borderColor: well?.edge ?? hue ?? "var(--rule-soft)",
        // 22% (operator, 2026-09-04: 14 read as bland): three shelves read as
        // three colours at a glance, and the drawing inside the well still
        // reads as ink on paper.
        background: well?.fill ?? (hue ? `color-mix(in oklab, ${hue} 22%, var(--paper))` : "var(--paper-edge)"),
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
          <span className="line-clamp-2 text-lg leading-tight" style={nameStyle}>
            {name}
          </span>
          {runs && (
            <span
              className="shrink-0 text-[10px]"
              style={{ fontFamily: mono, letterSpacing: "0.12em", color: "var(--seal)" }}
            >
              runs
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[11px]" style={{ color: "var(--ink-secondary)" }}>
          {sub}
        </span>
      </span>
    </>
  );
  const style = {
    borderColor: "var(--rule-soft)",
    borderRadius: "var(--radius-sm)",
    background: "var(--paper)",
    // The hover hue, read by .hue-panel in index.css. A card with no hue falls
    // back to the app accent, which is what .home-panel does everywhere else.
    ...(hue ? { "--card-hue": hue } : {}),
  } as CSSProperties;
  const panel = `${hue ? "hue-panel" : "home-panel"} flex min-w-0 items-center gap-3 border px-3 py-2.5 text-left`;
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
    <div className={`grid gap-2.5 ${across === 4 ? "grid-cols-4" : "grid-cols-3"}`}>{children}</div>
  );
}

/** A section mark with something set against it at the right — the Recent
 *  strip's gloss, the arrangement toggle, the Yours count and its manage link.
 *  `BlockHeader` above is the same object with a count; this one takes a node,
 *  because these are controls rather than facts. */
function SectionHead({ label, right, lead }: { label: string; right?: ReactNode; lead?: boolean }) {
  return (
    <div className="flex items-baseline gap-4 pb-3">
      <span
        className="shrink-0 text-[11px] uppercase tracking-[0.28em]"
        style={{ ...folioStyle, color: lead ? "var(--accent)" : "var(--ink-muted)" }}
      >
        {label}
      </span>
      <span className="h-px min-w-6 flex-1" style={{ background: "var(--rule-soft)" }} />
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
    <div className="flex items-baseline gap-2.5 pb-2">
      {hue && <span aria-hidden className="h-3 w-[3px] shrink-0 self-center" style={{ background: hue }} />}
      <span className="text-[10px] uppercase tracking-[0.2em]" style={folioStyle}>
        {label}
        {note ? ` · ${note}` : ""}
      </span>
      <span className="flex-1" />
      {shown < total && (
        <button onClick={onExpand} className="record-folio shrink-0 text-[10px] tracking-[0.1em]" style={folioStyle}>
          all {total} →
        </button>
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
}) {
  const all = shippedModels();
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
  const openShipped = (m: ShippedModel) =>
    m.open.kind === "example" ? onOpenExample(m.open.demo) : onOpenCorpus(m.open.entry);
  const slOf = (m: ShippedModel) => (m.open.kind === "example" ? m.open.demo.sl : m.open.entry.sl);

  return (
    <div>
      <Masthead
        eyebrow="Library"
        title="Open a model"
        lede="Pick up where you left off, or come in through a lens or a domain."
        back={{ label: "Home", onClick: onBack }}
        aside={<SearchField value={query} onChange={setQuery} />}
        dense
      />

      <Column className="pb-14 pt-5">
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
                    <span className="shrink-0 text-[10px] tracking-[0.12em]" style={{ fontFamily: mono, color: "var(--ink-muted)" }}>
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
            <section className={recentCards.length > 0 ? "mt-8" : ""}>
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
                      sub={m.description}
                      onClick={() => openShipped(m)}
                    />
                  ))}
                </CardGrid>
              ) : (
                shelves(shownShipped, arrange).map((shelf) => {
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

            {/* Yours. The half that grows. Manage is a MODE rather than a
                control on every card: renaming and deleting are not what a
                reader came here to do, and a × on every card invites the one
                click this page cannot undo. */}
            <section className="mt-8">
              <SectionHead
                label="Yours"
                right={
                  <span className="flex shrink-0 items-baseline gap-3 text-[10px] tracking-[0.12em]" style={{ fontFamily: mono, color: "var(--ink-muted)" }}>
                    <span>
                      {savedCount} · newest first
                    </span>
                    {savedCount > 0 && (
                      <button onClick={() => setManage((m) => !m)} className="record-folio" style={folioStyle}>
                        {manage ? "done" : "manage →"}
                      </button>
                    )}
                  </span>
                }
              />
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
                    <button
                      onClick={() => setShowAllSaved(true)}
                      className="record-folio mt-2.5 text-[10px] tracking-[0.12em]"
                      style={folioStyle}
                    >
                      and {shownSaved.length - SHELF_CARDS} more →
                    </button>
                  )}
                </>
              )}
              {/* Drafted models are the reader's own asks, answered — they
                  belong under Yours and keep their marker, which is the model
                  that answered. Absent, not empty, when the co-author has never
                  been used (#324). */}
              {shownDrafted.length > 0 && (
                <div className="mt-5">
                  <ShelfHead
                    label="drafted with the co-author"
                    note=""
                    total={shownDrafted.length}
                    shown={shownDrafted.length}
                    onExpand={() => {}}
                  />
                  <CardGrid across={3}>
                    {shownDrafted.slice(0, q ? shownDrafted.length : SHELF_CARDS).map((d) => (
                      <ModelCard
                        key={d.key}
                        cacheKey={d.key}
                        source={d.sl}
                        name={d.description}
                        sub={`${draftedGloss(d)} · ${d.model}`}
                        onClick={() => onOpenDrafted(d.sl)}
                      />
                    ))}
                  </CardGrid>
                </div>
              )}
            </section>

            <section className="mt-8">
              <SectionHead label="From a file" />
              <button
                onClick={onOpenFile}
                className="home-panel flex w-full items-center gap-4 border px-3 py-2.5 text-left"
                style={{ borderColor: "var(--rule-soft)", borderRadius: "var(--radius-sm)", background: "var(--paper)" }}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center border text-[11px]"
                  style={{ borderColor: "var(--rule-soft)", background: "var(--paper-edge)", fontFamily: mono, color: "var(--ink-muted)" }}
                >
                  ·
                </span>
                <span className="min-w-0">
                  <span className="block text-lg leading-tight" style={doorStyle}>
                    Open a file…
                  </span>
                  <span className="mt-0.5 block truncate text-[11px]" style={{ color: "var(--ink-secondary)" }}>
                    a model .json from your computer
                  </span>
                </span>
              </button>
            </section>

            <div className="mt-8 pt-3.5" style={{ borderTop: "1px solid var(--rule-soft)" }}>
              <button
                onClick={() => setView("list")}
                className="record-folio text-[11px] uppercase tracking-[0.2em]"
                style={folioStyle}
              >
                Browse all {all.length + savedCount} as a list
              </button>
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
  return (
    <label
      className="flex min-w-[18rem] items-center gap-2.5 border px-3.5 py-2.5"
      style={{ borderColor: "var(--rule-soft)", borderRadius: "var(--radius-sm)" }}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden style={{ color: "var(--ink-muted)" }}>
        <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <line x1="11" y1="11" x2="15" y2="15" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Find a model"
        aria-label="Find a model"
        className="w-full min-w-0 bg-transparent text-sm outline-none"
        style={{ color: "var(--ink)" }}
      />
    </label>
  );
}

/** By lens | By domain. One control with two states, set as a printed toggle:
 *  the chosen half is reversed out of the ink, the other sits on the paper. */
function ArrangeToggle({ value, onChange }: { value: Arrange; onChange: (v: Arrange) => void }) {
  const cell = (v: Arrange, label: string) => (
    <button
      onClick={() => onChange(v)}
      aria-pressed={value === v}
      className="px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]"
      style={{
        fontFamily: mono,
        background: value === v ? "var(--ink)" : "transparent",
        color: value === v ? "var(--paper)" : "var(--ink-muted)",
      }}
    >
      {label}
    </button>
  );
  return (
    <span className="inline-flex shrink-0 border" style={{ borderColor: "var(--rule-soft)" }}>
      {cell("lens", "By lens")}
      {cell("domain", "By domain")}
    </span>
  );
}

/** A section that has nothing to show, saying so in one line on the rule. The
 *  page keeps its shape: an empty section is a sentence, never a gap. */
function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <div
      className="border-t py-3 text-sm"
      style={{
        borderColor: "var(--rule-soft)",
        color: "var(--ink-muted)",
        fontFamily: display,
        fontStyle: "italic",
      }}
    >
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
        className="flex min-w-0 items-center gap-3 border px-3 py-2.5"
        style={{ borderColor: "var(--rule-soft)", borderRadius: "var(--radius-sm)", background: "var(--paper)" }}
      >
        <CardThumb cacheKey={`saved:${node.name}`} source={node.json} kind="archive" well={YOURS_WELL} />
        <input
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
          className="min-w-0 flex-1 px-1 text-sm outline-none"
          style={{ background: "var(--paper-edge)", border: "1px solid var(--rule-soft)", color: "var(--ink)" }}
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
          <span className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={() => {
                cancelled.current = false;
                setDraft(node.name);
              }}
              title={`Rename ${node.name} — same model, new library name`}
              className="px-1.5 text-sm"
              style={{ color: "var(--ink-muted)" }}
            >
              ✎
            </button>
            <button
              onClick={() => onDelete(node.name)}
              title={`Delete ${node.name}`}
              className="px-1.5 text-sm"
              style={{ color: "var(--verdict-error)" }}
            >
              ×
            </button>
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
      <button
        onClick={onBackToDoors}
        className="record-folio mb-4 block text-[11px] uppercase tracking-[0.2em]"
        style={folioStyle}
      >
        ‹ Doors
      </button>

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
            <button
              onClick={() => setFacet(null)}
              className="record-folio pb-1.5 pt-1 text-[11px] uppercase tracking-[0.2em]"
              style={folioStyle}
            >
              clear · show all {all.length}
            </button>
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
      <section className="mt-16">
        <BlockHeader label="Yours" count={`${savedCount} model${savedCount === 1 ? "" : "s"}`} />
        {facet ? (
          <EmptyLine>your models carry no genus or tradition tag — clear the filter to see them</EmptyLine>
        ) : tree.length === 0 ? (
          <EmptyLine>no saved models yet</EmptyLine>
        ) : (
          <div style={{ borderTop: "1px solid var(--rule)" }}>
            {shownRoots.map((root, i) => (
              <div
                key={root.name}
                className="grid w-full grid-cols-[3rem_1fr] items-stretch border-b"
                style={{ borderColor: "var(--rule-soft)" }}
              >
                <span
                  className="flex items-start justify-end pr-5 pt-3 text-[11px] tabular"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="py-2.5 pr-2">
                  <LibraryRow node={root} depth={0} onLoad={onLoad} onDelete={onDelete} onRename={onRename} />
                </div>
              </div>
            ))}
            {foldedRoots > 0 && (
              <button
                onClick={() => setShowAllSaved(true)}
                className="block w-full border-b py-2.5 text-left text-[11px] uppercase tracking-[0.18em]"
                style={{ borderColor: "var(--rule-soft)", ...folioStyle }}
              >
                show all {tree.length} saved models
              </button>
            )}
          </div>
        )}
      </section>

      {/* Drafted. The third provenance (#324), and the only one that can be
          absent: it is read from the reasoner, which is off until the user
          turns it on. No turns means no section — not an empty state and not
          an explanation, because a user who has never used the co-author is
          not missing anything and should not be told that they are. */}
      {drafted.length > 0 && (
        <section className="mt-16">
          <BlockHeader
            label="Drafted with the co-author"
            count={`${drafted.length} draft${drafted.length === 1 ? "" : "s"}`}
          />
          {facet ? (
            <EmptyLine>your drafts carry no genus or tradition tag — clear the filter to see them</EmptyLine>
          ) : (
            <Ledger>
              {drafted.map((d, i) => (
                <LedgerRow
                  key={d.key}
                  index={i + 1}
                  name={d.description}
                  description={draftedGloss(d)}
                  tag={d.model}
                  onClick={() => onOpenDrafted(d.sl)}
                />
              ))}
            </Ledger>
          )}
        </section>
      )}

      <section className="mt-16">
        <BlockHeader label="From a file" />
        <Ledger>
          <LedgerRow
            door
            folio="·"
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
      className="record-folio flex items-start justify-end pr-1 pt-1 text-[11px] tabular"
      style={{ color: "var(--ink-muted)", transition: "color var(--transition-base)" }}
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
      className="record-row grid w-full grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-x-4 border-b py-3 text-left"
      style={{ borderColor: "var(--rule-soft)" }}
    >
      <ModelGutter model={model} index={index} />
      <span className="block min-w-0">
        <span className="flex items-baseline gap-3">
          <span className="truncate text-2xl leading-tight" style={nameStyle}>
            {model.name}
          </span>
          {model.runs && (
            <span
              className="shrink-0 text-xs"
              style={{ fontFamily: mono, letterSpacing: "0.12em", color: "var(--seal)" }}
            >
              runs
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-sm" style={{ color: "var(--ink-secondary)" }}>
          {model.description}
        </span>
      </span>
      <span className="block max-w-[16rem] shrink-0 pt-1 text-right">
        <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          {model.tags.map((t) => (
            <span
              key={`${t.kind}:${t.id}`}
              className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.14em]"
              style={{ fontFamily: mono, color: "var(--ink-muted)" }}
            >
              {hueOf(t) && (
                <span aria-hidden className="h-2.5 w-0.5 shrink-0" style={{ background: hueOf(t) }} />
              )}
              {t.label}
            </span>
          ))}
          {model.set && (
            <span
              className="text-[10px] tracking-[0.14em]"
              style={{ fontFamily: mono, color: "var(--ink-muted)" }}
            >
              {model.set}
            </span>
          )}
        </span>
        {model.citation && (
          <span
            className="mt-1 block text-[10px] leading-snug tracking-[0.04em]"
            style={{ fontFamily: mono, color: "var(--ink-muted)" }}
          >
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
        style={{ paddingLeft: depth === 0 ? 0 : (depth - 1) * 14 }}
      >
        {depth > 0 && (
          <span aria-hidden className="shrink-0 text-xs" style={{ color: "var(--ink-muted)" }}>
            └
          </span>
        )}
        {draft !== null ? (
          <input
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
            className={depth === 0 ? "min-w-0 flex-1 px-1 text-sm" : "min-w-0 flex-1 px-1 text-xs"}
            style={{
              background: "var(--paper-edge)",
              border: "1px solid var(--rule-soft)",
              borderRadius: "var(--radius-sm)",
              color: "var(--ink)",
            }}
            aria-label={`Rename ${node.name}`}
          />
        ) : (
          <button onClick={() => onLoad(node.name)} className="min-w-0 flex-1 text-left" title={node.name}>
            <div className={depth === 0 ? "truncate text-lg leading-tight" : "truncate text-sm"} style={nameStyle}>
              {node.name}
            </div>
            <div className="text-[10px]" style={{ fontFamily: mono, color: "var(--ink-muted)" }}>
              saved {relTime(node.savedAt)}
              {node.missingReferents > 0 &&
                ` · ${node.missingReferents} referent${node.missingReferents === 1 ? "" : "s"} missing`}
            </div>
          </button>
        )}
        {draft === null && (
          <button
            onClick={() => {
              cancelled.current = false;
              setDraft(node.name);
            }}
            title={`Rename ${node.name} — same model, new library name`}
            className="shrink-0 px-1.5 text-sm"
            style={{ color: "var(--ink-muted)" }}
          >
            ✎
          </button>
        )}
        <button
          onClick={() => onDelete(node.name)}
          title={`Delete ${node.name}`}
          className="shrink-0 px-1.5 text-sm"
          style={{ color: "var(--ink-muted)" }}
        >
          ×
        </button>
      </div>
      {node.children.map((c) => (
        <LibraryRow key={c.name} node={c} depth={depth + 1} onLoad={onLoad} onDelete={onDelete} onRename={onRename} />
      ))}
    </>
  );
}
