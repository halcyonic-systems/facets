// The home screen — a menu with three doors, not a modal stacked on an empty
// canvas. Three levels, one surface:
//
//   home     Create a model · Open a model · Documentation
//   library  the shelves: examples by genus, corpus by author, your saved
//            models listed inline, a file from disk
//   shelf    one shelf's models, name + description (+ citation, corpus only)
//
// Counts on the shelf buttons are derived (home.ts) — a new example or a new
// corpus tradition lights up its button with no edit here.
//
// The examples/corpus separation is the point of the two-section library: an
// example is ours, a corpus entry is an author's. The CITATION LINE is what
// tells them apart on the page — identical row layout, corpus rows render a
// citation and example rows do not.
//
// Visual language: docs/design/visual-language.md, "printed record" variant.
// This surface is set as a printed page rather than as software chrome: paper
// ground, ink text, the serif carrying the title, hairline rules for structure,
// and ONE rubric stroke (--seal) as the only colour. Identity comes from type —
// scale, family, and rhythm — not from a filled band. The tokens are scoped to
// this file's root, so the workspace surface is untouched.
//
// Names keep their authored case — small caps, never text-transform (the model
// is named `hal`, not `HAL`).
import { useState, useRef, type CSSProperties, type ReactNode } from "react";
import { isRunnable, type Demo } from "./demos";
import { firstSentence, type CorpusEntry } from "./corpus";
import type { LibraryNode } from "./libraryTree";
import {
  corpusShelfEntries,
  corpusShelves,
  exampleShelfEntries,
  exampleShelves,
  standardLibraryCount,
  CORPUS_NOTE,
  EXAMPLES_NOTE,
  type Shelf,
} from "./home";
import { openExternal } from "./desktop";
import { buildInfo, provenanceLines } from "./buildInfo";

const DOCS_URL = "https://github.com/halcyonic-systems/bert-lenses/tree/main/docs";

export type HomeRoute =
  | { view: "home" }
  | { view: "library" }
  | { view: "about" }
  | { view: "shelf"; area: "examples" | "corpus"; id: string };

interface HomeProps {
  initialRoute?: HomeRoute;
  onCreate: () => void;
  /** #309: the Klir lens's data-first front door — author a data system before
   *  (or instead of) any structure. */
  onStartFromData: () => void;
  onOpenExample: (d: Demo) => void;
  onOpenCorpus: (e: CorpusEntry) => void;
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
      style={{ backgroundColor: "var(--paper)", color: "var(--ink)" }}
    >
      {/* One page, one measure. Every level sets inside the same reading column
          — there is no full-bleed device, because the page ground IS the
          identity and a band would interrupt it. */}
      <div className="w-full flex-1">
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
            onShelf={(s) => setRoute({ view: "shelf", area: s.area, id: s.id })}
            onOpenFile={props.onOpenFile}
            onLoad={props.onLoadFromLibrary}
            onDelete={props.onDeleteFromLibrary}
            onRename={props.onRenameInLibrary}
          />
        )}
        {route.view === "shelf" && (
          <ShelfPage
            area={route.area}
            id={route.id}
            onBack={() => setRoute({ view: "library" })}
            onOpenExample={props.onOpenExample}
            onOpenCorpus={props.onOpenCorpus}
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
// Everything here is set, not painted. Structure is carried by two weights of
// rule (a near-ink head rule at 1px, a soft hairline between entries), by the
// serif/sans opposition (a NAME is serif, a gloss is sans, a machine fact is
// mono), and by vertical rhythm. The single rubric stroke opens a title block
// and marks a folio under the cursor; nothing else takes colour.
// ---------------------------------------------------------------------------

/** The measure. A reading column, not a layout container — narrow enough that
 *  a gloss line stays under ~75 characters, with margins wide enough to read
 *  as page margins rather than padding. */
function Column({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-3xl px-10 ${className}`}>{children}</div>;
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
 *  set as a display numeral in the outer margin, and an italic lede beneath.
 *  It closes on a head rule — the block ends, and the table begins under it. */
function Masthead({
  eyebrow,
  title,
  lede,
  note,
  stat,
  statLabel,
  back,
  hue,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: string;
  note?: string;
  stat?: number;
  statLabel?: string;
  back?: { label: string; onClick: () => void };
  /** Overrides the rubric rule with a world hue, so a corpus shelf opens in the
   *  colour of the tradition it belongs to. Defaults to the seal. */
  hue?: string;
}) {
  return (
    <Column className="pt-12">
      {back && (
        <button
          onClick={back.onClick}
          className="mb-10 block text-[11px] uppercase tracking-[0.22em]"
          style={folioStyle}
        >
          ‹ {back.label}
        </button>
      )}
      <div style={{ borderTop: `2px solid ${hue ?? "var(--seal)"}` }} />
      <div className="flex items-start justify-between gap-10 pt-6">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-3 text-[11px] uppercase tracking-[0.3em]" style={folioStyle}>
              {eyebrow}
            </div>
          )}
          <h1
            className="text-6xl leading-[0.95] tracking-tight"
            style={{ fontFamily: display, fontWeight: 500, color: "var(--ink)" }}
          >
            {title}
          </h1>
        </div>
        {stat !== undefined && (
          <div className="shrink-0 pt-1 text-right">
            <div
              className="text-5xl leading-none"
              style={{ fontFamily: display, fontWeight: 500, color: "var(--ink)" }}
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
          className="mt-6 max-w-xl text-xl leading-snug"
          style={{ fontFamily: display, fontStyle: "italic", color: "var(--ink-secondary)" }}
        >
          {lede}
          {note ? ` — ${note}` : ""}
        </p>
      )}
      <div className="mt-9" style={{ borderTop: "1px solid var(--rule)" }} />
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

const LEDE =
  "A modeling and simulation instrument for systems. Draw a system on the canvas or write it in SL; the kernel judges it under Klir, Bunge, and Mobus.";

export function HomeMenu({
  onCreate,
  onStartFromData,
  onOpenLibrary,
  onAbout,
}: {
  onCreate: () => void;
  onStartFromData?: () => void;
  onOpenLibrary: () => void;
  /** Open the provenance page (#229). Optional so the menu renders standalone. */
  onAbout?: () => void;
}) {
  // Presentation only: the contents of a printed page are numbered in roman,
  // and the doors are a contents list. Nothing downstream reads these.
  const folios = ["i", "ii", "iii", "iv", "v"];
  let f = 0;
  const next = () => folios[f++] ?? "·";
  return (
    <div>
      <Masthead title={<span>bert&#8202;·&#8202;lenses</span>} lede={LEDE} />
      <Column className="pb-20 pt-12">
        <BlockHeader label="Contents" />
        <Ledger>
          <LedgerRow
            door
            folio={next()}
            name="Create a model"
            description="Start from a blank canvas and draw the structure."
            onClick={onCreate}
          />
          {onStartFromData && (
            <LedgerRow
              door
              folio={next()}
              name="Start from data"
              description="Create one the other way instead: bring a CSV or type observations, and let the structure come later."
              onClick={onStartFromData}
            />
          )}
          <LedgerRow
            door
            folio={next()}
            name="Open a model"
            description="The standard library, your own saved models, or a file from disk."
            onClick={onOpenLibrary}
          />
          <LedgerRow
            door
            folio={next()}
            name="Documentation"
            description="The language, the kernel, and the traditions behind them."
            tag="external"
            href={DOCS_URL}
          />
        </Ledger>
        {/* The colophon. A printed record states its edition at the foot of the
            page, not in its table of contents — and the provenance is what this
            page's claim rests on, so it belongs on the page, quietly, rather
            than among the doors. */}
        {onAbout && (
          <div className="mt-14 border-t pt-4" style={{ borderColor: "var(--rule-soft)" }}>
            <button
              onClick={onAbout}
              className="record-folio text-[11px] uppercase tracking-[0.2em]"
              style={folioStyle}
            >
              This build · {buildInfo.gitSha}
            </button>
          </div>
        )}
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

/** A shelf entry, set as a line of an index: the shelf's name in the serif, a
 *  leader running out to the margin, the count as a folio numeral at the right.
 *  Counts are derived (home.ts). */
/** The WORLD hue of a corpus shelf — the reading it belongs to. This is the one
 *  colour channel on the library page, and it is semantic: `--world-*` already
 *  means "which tradition" across the instrument (index.css), so a reader who
 *  learns it here reads it unchanged on the canvas. An examples shelf is ours
 *  and carries no tradition, so it takes no hue — the absence is the fact. */
const WORLD_HUE: Record<string, string> = {
  klir: "var(--world-klir)",
  bunge: "var(--world-bunge)",
  mobus: "var(--world-mobus)",
};

function ShelfButton({
  label,
  count,
  note,
  hue,
  onClick,
}: {
  label: string;
  count: number;
  note?: string;
  /** The tradition's world hue, for corpus shelves. Absent on examples. */
  hue?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={note || undefined}
      className="record-row flex flex-1 basis-64 items-baseline gap-3 border-b py-2.5 text-left"
      style={{ borderColor: "var(--rule-soft)" }}
    >
      {hue && (
        <span
          aria-hidden
          className="h-2.5 w-0.5 shrink-0 self-center"
          style={{ background: hue }}
        />
      )}
      <span className="truncate text-lg leading-tight" style={nameStyle}>
        {label}
      </span>
      <span className="h-px min-w-5 flex-1" style={{ background: "var(--rule-soft)" }} />
      <span
        className="record-folio shrink-0 text-[11px] tabular"
        style={{ color: hue ?? "var(--ink-muted)" }}
      >
        {count}
      </span>
    </button>
  );
}

/** The shelves as one index: two columns of ruled lines, each ending on its
 *  count. Column gap is real white space — the rules under the entries are what
 *  hold the set together, so no cell needs an outline. */
function ShelfGrid({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-x-10">{children}</div>;
}

/** How many saved roots list inline before the browser folds the rest behind a
 *  "show all" — enough that a normal library never folds at all. */
const INLINE_LIBRARY_ROOTS = 12;

export function LibraryBrowser({
  tree,
  onBack,
  onShelf,
  onOpenFile,
  onLoad,
  onDelete,
  onRename,
}: {
  tree: LibraryNode[];
  onBack: () => void;
  onShelf: (s: Shelf) => void;
  onOpenFile: () => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
  onRename: (from: string, to: string) => Promise<boolean>;
}) {
  const examples = exampleShelves();
  const corpus = corpusShelves();
  const standard = standardLibraryCount();
  const savedCount = countLibrary(tree);
  const [showAllSaved, setShowAllSaved] = useState(false);
  const shownRoots = showAllSaved ? tree : tree.slice(0, INLINE_LIBRARY_ROOTS);
  const foldedRoots = tree.length - shownRoots.length;
  return (
    <div>
      <Masthead
        eyebrow="Library"
        title="Open a model"
        lede="The standard library ships with the app and is maintained in the repository; My library is yours."
        stat={standard + savedCount}
        statLabel="models"
        back={{ label: "Home", onClick: onBack }}
      />

      <Column className="pb-20 pt-12">
        <section>
          <BlockHeader label="Standard library" count={`${standard} models`} />
          <div style={{ borderTop: "1px solid var(--rule)" }} className="pt-6">
            <div className="text-xl leading-tight" style={{ fontFamily: display, color: "var(--ink)" }}>
              Examples — by genus
            </div>
            <p className="mb-4 mt-1 max-w-xl text-sm leading-relaxed" style={{ color: "var(--ink-secondary)" }}>
              {EXAMPLES_NOTE}
            </p>
            <ShelfGrid>
              {examples.map((s) => (
                <ShelfButton key={s.id} label={s.label} count={s.count} onClick={() => onShelf(s)} />
              ))}
            </ShelfGrid>

            <div className="mt-10 text-xl leading-tight" style={{ fontFamily: display, color: "var(--ink)" }}>
              Source corpus — by author
            </div>
            <p className="mb-4 mt-1 max-w-xl text-sm leading-relaxed" style={{ color: "var(--ink-secondary)" }}>
              {CORPUS_NOTE}
            </p>
            <ShelfGrid>
              {corpus.map((s) => (
                <ShelfButton
                  key={s.id}
                  label={s.label}
                  count={s.count}
                  note={s.note}
                  hue={WORLD_HUE[s.id]}
                  onClick={() => onShelf(s)}
                />
              ))}
            </ShelfGrid>
          </div>
        </section>

        {/* Saved models list HERE, not behind a shelf-of-one: there was never a
            branch to take, so the drill-in was a click that bought nothing. */}
        <section className="mt-16">
          <BlockHeader label="My library" count={`${savedCount} model${savedCount === 1 ? "" : "s"}`} />
          <div style={{ borderTop: "1px solid var(--rule)" }} className="py-4">
            <p className="max-w-xl text-sm leading-relaxed" style={{ color: "var(--ink-secondary)" }}>
              Models you have saved from this app. A model reached by a decomposition
              reference nests under the system of interest that reaches it.
            </p>
          </div>
          {tree.length === 0 ? (
            <div
              className="border-t py-3 text-sm"
              style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)", fontFamily: display, fontStyle: "italic" }}
            >
              no saved models yet
            </div>
          ) : (
            <div style={{ borderTop: "1px solid var(--rule-soft)" }}>
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
      </Column>
    </div>
  );
}

// ---------------------------------------------------------------------------
// shelf page
// ---------------------------------------------------------------------------

/** One model on a shelf: a ledger row, plus — corpus only — the citation
 *  beneath the gloss. Same row on both shelves; the citation is the separator.
 *
 *  `tag` marks the EXCEPTION, never the rule: every model on a shelf is
 *  structural, so a per-row "diagram" label repeats identically down the whole
 *  column and says nothing. Only the models that also carry dynamics are
 *  tagged. */
function ShelfRow({
  name,
  description,
  citation,
  tag,
  index,
  onClick,
}: {
  name: string;
  description: string;
  citation?: string;
  tag?: string;
  index?: number;
  onClick: () => void;
}) {
  return (
    <LedgerRow
      index={index}
      name={name}
      description={description}
      tag={tag}
      onClick={onClick}
      trailing={
        citation ? (
          <span
            className="mt-2 block text-[10px] tracking-[0.08em]"
            style={{ fontFamily: mono, color: "var(--ink-muted)" }}
          >
            {citation}
          </span>
        ) : undefined
      }
    />
  );
}

/** The citation every member of a sibling-set shares, or null if they differ.
 *  Derived from the entries themselves — no set is named here. */
export function sharedCitation(entries: CorpusEntry[]): string | null {
  const first = entries[0]?.citation;
  if (!first || entries.length < 2) return null;
  return entries.every((e) => e.citation === first) ? first : null;
}

export function ShelfPage({
  area,
  id,
  onBack,
  onOpenExample,
  onOpenCorpus,
}: {
  area: "examples" | "corpus";
  id: string;
  onBack: () => void;
  onOpenExample: (d: Demo) => void;
  onOpenCorpus: (e: CorpusEntry) => void;
}) {
  const shelf =
    area === "examples"
      ? exampleShelves().find((s) => s.id === id)
      : corpusShelves().find((s) => s.id === id);
  const entries = area === "examples" ? exampleShelfEntries(id) : [];
  const corpus = area === "corpus" ? corpusShelfEntries(id) : { sets: [], loose: [] };
  const count = shelf?.count ?? 0;
  // Corpus rows number continuously across the sibling-sets and the loose
  // entries: one shelf, one run of numerals.
  let n = 0;
  return (
    <div>
      <Masthead
        eyebrow={area === "examples" ? "Examples" : "Source corpus"}
        title={shelf?.label ?? id}
        lede={area === "examples" ? EXAMPLES_NOTE : CORPUS_NOTE}
        note={area === "corpus" ? shelf?.note : undefined}
        stat={count}
        statLabel={`model${count === 1 ? "" : "s"}`}
        back={{ label: "Open a model", onClick: onBack }}
        hue={area === "corpus" ? WORLD_HUE[id] : undefined}
      />

      <Column className="pb-20 pt-12">
        <Ledger>
          {area === "examples" &&
            entries.map((d, i) => (
              <ShelfRow
                key={d.key}
                name={d.title}
                description={d.blurb}
                index={i + 1}
                tag={isRunnable(d) ? "runs" : undefined}
                onClick={() => onOpenExample(d)}
              />
            ))}
          {area === "corpus" && (
            <>
              {corpus.sets.map((s) => {
                // A set that teaches by diff over one figure cites that one
                // figure; repeating the line on every variant is the citation
                // saying nothing. Hoist it to the header when it is shared, and
                // fall back to per-row when the members actually cite differently.
                const shared = sharedCitation(s.entries);
                return (
                  <div key={s.name}>
                    <div className="border-b pb-2 pt-6" style={{ borderColor: "var(--rule)" }}>
                      <div className="flex items-baseline gap-3">
                        <span className="text-base" style={nameStyle}>
                          {s.name}
                        </span>
                        <span
                          className="text-sm"
                          style={{ fontFamily: display, fontStyle: "italic", color: "var(--ink-secondary)" }}
                        >
                          {s.entries.length} variants · one lesson by diff
                        </span>
                      </div>
                      {shared && (
                        <div
                          className="mt-1 text-[10px] tracking-[0.08em]"
                          style={{ fontFamily: mono, color: "var(--seal)" }}
                        >
                          {shared}
                        </div>
                      )}
                    </div>
                    {s.entries.map((e) => (
                      <ShelfRow
                        key={e.file}
                        name={e.title}
                        description={firstSentence(e.teaches)}
                        citation={shared ? undefined : e.citation}
                        index={(n += 1)}
                        onClick={() => onOpenCorpus(e)}
                      />
                    ))}
                  </div>
                );
              })}
              {corpus.loose.map((e) => (
                <ShelfRow
                  key={e.file}
                  name={e.title}
                  description={firstSentence(e.teaches)}
                  citation={e.citation}
                  index={(n += 1)}
                  onClick={() => onOpenCorpus(e)}
                />
              ))}
            </>
          )}
        </Ledger>
      </Column>
    </div>
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
