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
// Visual language: docs/design/visual-language.md. Every page with an identity
// opens on a FILLED band that carries it; below the band the page is modular
// blocks of ledger rows, straight-edged, separated by real rules. Names keep
// their authored case — small caps, never text-transform (the model is named
// `hal`, not `HAL`).
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
import type { Pin, WorkbenchEntry } from "./workbench";

const DOCS_URL = "https://github.com/halcyonic-systems/bert-lenses/tree/main/docs";

export type HomeRoute =
  | { view: "home" }
  | { view: "library" }
  | { view: "shelf"; area: "examples" | "corpus"; id: string };

interface HomeProps {
  initialRoute?: HomeRoute;
  /** The workbench (workbench.ts): resolved pins, listed above "Start here". */
  workbench?: WorkbenchEntry[];
  onOpenPin?: (pin: Pin) => void;
  onUnpin?: (pin: Pin) => void;
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
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {/* All three levels are full-bleed: the masthead band runs edge to edge,
          and the reading column is re-established under it by Column. */}
      <div className="w-full flex-1">
        {route.view === "home" && (
          <HomeMenu
            onCreate={props.onCreate}
            onStartFromData={props.onStartFromData}
            onOpenLibrary={() => setRoute({ view: "library" })}
            workbench={props.workbench ?? []}
            onOpenPin={props.onOpenPin}
            onUnpin={props.onUnpin}
          />
        )}
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
          <Column className="pb-10">
            <button
              onClick={props.onClose}
              className="text-xs"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
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
// The language: band, column, block, ledger row. Straight edges, real rules,
// colour with surface area.
// ---------------------------------------------------------------------------

/** The reading column each block re-establishes under the full-bleed band. */
function Column({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-5xl px-6 ${className}`}>{children}</div>;
}

/** A name as this instrument sets names: letterspaced small caps with the
 *  AUTHORED case intact. text-transform would print `hal` as `HAL` and lie
 *  about the model's name; small caps buys the same even ledger colour without
 *  touching the string. */
const nameStyle: CSSProperties = {
  fontVariantCaps: "small-caps",
  letterSpacing: "0.06em",
  color: "var(--text-primary)",
};

/** The identity device. A page with a name opens on a filled accent band that
 *  carries it — back link, eyebrow, title, and the page's one number — instead
 *  of a line of dark text floating on the page ground. */
function Masthead({
  eyebrow,
  title,
  lede,
  note,
  stat,
  statLabel,
  back,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: string;
  note?: string;
  stat?: number;
  statLabel?: string;
  back?: { label: string; onClick: () => void };
}) {
  return (
    <div className="w-full px-6 pb-8 pt-8" style={{ background: "var(--accent-strong)" }}>
      <div className="mx-auto max-w-5xl">
        {back && (
          <button
            onClick={back.onClick}
            className="mb-7 text-[11px] uppercase tracking-[0.2em]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--accent-soft)" }}
          >
            ‹ {back.label}
          </button>
        )}
        <div className="flex items-end justify-between gap-8">
          <div>
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.3em]"
              style={{ color: "var(--accent-soft)" }}
            >
              {eyebrow}
            </div>
            <h1
              className="mt-2 text-4xl font-semibold tracking-tight"
              style={{ color: "var(--text-on-accent)" }}
            >
              {title}
            </h1>
          </div>
          {stat !== undefined && (
            <div className="shrink-0 text-right">
              <div className="text-3xl tabular" style={{ color: "var(--text-on-accent)" }}>
                {stat}
              </div>
              <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: "var(--accent-soft)" }}>
                {statLabel}
              </div>
            </div>
          )}
        </div>
        {lede && (
          <p className="mt-4 max-w-lg text-sm" style={{ color: "var(--accent-soft)" }}>
            {lede}
            {note ? ` — ${note}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

/** A block's header: a tinted strip, not a floating label. What follows is one
 *  region and the strip is where the region starts. */
function BlockHeader({ label, count }: { label: string; count?: string }) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 border-x border-t px-4 py-2"
      style={{ background: "var(--accent-soft)", borderColor: "var(--border)" }}
    >
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.2em]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--accent-strong)" }}
      >
        {label}
      </span>
      {count && (
        <span className="shrink-0 text-[11px] tabular" style={{ color: "var(--accent-strong)" }}>
          {count}
        </span>
      )}
    </div>
  );
}

/** The ledger frame: rows live inside real edges, so the block ends somewhere. */
function Ledger({ children }: { children: ReactNode }) {
  return (
    <div className="border-x border-t" style={{ borderColor: "var(--border)" }}>
      {children}
    </div>
  );
}

/** The gutter numeral — a continuous tinted column down a ledger's left edge,
 *  not a rim. It is what makes the rows read as discrete entries. */
function Gutter({ index }: { index?: number }) {
  return (
    <span
      className="flex items-start justify-end py-3 pr-3 tabular text-[11px]"
      style={{
        background: "var(--accent-soft)",
        color: "var(--accent-strong)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {index === undefined ? "·" : String(index).padStart(2, "0")}
    </span>
  );
}

/** A filled chip. The exception gets a solid mark with real surface area,
 *  never a 1px rim. */
function Chip({ children }: { children: ReactNode }) {
  return (
    <span
      className="ml-auto shrink-0 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
      style={{
        background: "var(--accent)",
        color: "var(--text-on-accent)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {children}
    </span>
  );
}

const ROW_GRID = "grid w-full grid-cols-[3.25rem_1fr] items-stretch border-b text-left";

/** One ledger row: numbered gutter, name, gloss, optional trailing line. */
function LedgerRow({
  index,
  name,
  description,
  trailing,
  tag,
  onClick,
  href,
}: {
  index?: number;
  name: string;
  description: string;
  trailing?: ReactNode;
  tag?: string;
  onClick?: () => void;
  href?: string;
}) {
  const body = (
    <>
      <Gutter index={index} />
      <span className="block py-3 pl-5 pr-4">
        <span className="flex items-center gap-3">
          <span className="text-base font-semibold" style={nameStyle}>
            {name}
          </span>
          {tag && <Chip>{tag}</Chip>}
        </span>
        <span className="mt-1 block max-w-2xl text-sm" style={{ color: "var(--text-secondary)" }}>
          {description}
        </span>
        {trailing}
      </span>
    </>
  );
  const style = { borderColor: "var(--border)" };
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
  workbench = [],
  onOpenPin,
  onUnpin,
}: {
  onCreate: () => void;
  onStartFromData?: () => void;
  onOpenLibrary: () => void;
  workbench?: WorkbenchEntry[];
  onOpenPin?: (pin: Pin) => void;
  onUnpin?: (pin: Pin) => void;
}) {
  return (
    <div>
      <Masthead
        eyebrow="Halcyonic Systems"
        title={<span>bert&#8202;·&#8202;lenses</span>}
        lede={LEDE}
        stat={standardLibraryCount()}
        statLabel="models on the shelves"
      />
      <Column className="pb-16 pt-10">
        {/* The workbench: what is being worked on right now, pinned by hand
            from the menu bar. Absent entirely until something is pinned — an
            empty block would put furniture where the first-run reader starts. */}
        {workbench.length > 0 && onOpenPin && onUnpin && (
          <div className="mb-10">
            <BlockHeader label="Workbench" count={`${workbench.length} pinned`} />
            <Ledger>
              {workbench.map((w, i) => (
                <div
                  key={`${w.pin.kind}:${w.pin.ref}`}
                  className="grid w-full grid-cols-[3.25rem_1fr_auto] items-stretch border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Gutter index={i + 1} />
                  <button onClick={() => onOpenPin(w.pin)} className="py-2.5 pl-5 pr-4 text-left">
                    <span className="block text-sm font-semibold" style={nameStyle}>
                      {w.title}
                    </span>
                    <span className="mt-0.5 block text-xs" style={{ color: "var(--text-muted)" }}>
                      {w.detail}
                    </span>
                  </button>
                  <button
                    onClick={() => onUnpin(w.pin)}
                    className="px-4 text-xs"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
                    title="Remove from the workbench"
                  >
                    unpin
                  </button>
                </div>
              ))}
            </Ledger>
          </div>
        )}
        <BlockHeader label="Start here" />
        <Ledger>
          <LedgerRow name="Create a model" description="Start from a blank canvas." onClick={onCreate} />
          {onStartFromData && (
            <LedgerRow
              name="Start from data"
              description="Bring a CSV or type observations — author a Klir data system; structure can come later."
              onClick={onStartFromData}
            />
          )}
          <LedgerRow
            name="Open a model"
            description="The standard library, your own saved models, or a file from disk."
            onClick={onOpenLibrary}
          />
          <LedgerRow
            name="Documentation"
            description="The language, the kernel, and the traditions behind them."
            tag="external"
            href={DOCS_URL}
          />
        </Ledger>
        <About />
      </Column>
    </div>
  );
}

/** What this build is (#229). The instrument tells its users that every verdict
 *  is machine-checked against Lean proofs in another repository; a person
 *  holding the binary had no way to find out WHICH proofs. This is that way —
 *  the version, the commit it was built from, the SSF commit the claims are
 *  pinned to, and a hash of the kernel wasm they can recompute from the file in
 *  their own bundle. It sits on the landing page rather than behind a menu
 *  because the claim it substantiates is on the landing page too. */
function About() {
  return (
    <div className="mt-10">
      <BlockHeader label="This build" count={buildInfo.gitSha} />
      <div className="border-x border-t" style={{ borderColor: "var(--border)" }}>
        {provenanceLines().map((line) => (
          <div
            key={line.label}
            className="grid grid-cols-[9rem_1fr] gap-3 border-b px-4 py-2"
            style={{ borderColor: "var(--border)" }}
          >
            <span
              className="text-[11px] uppercase tracking-[0.14em]"
              style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
            >
              {line.label}
            </span>
            <span className="min-w-0">
              <span
                className="block break-all text-[11px]"
                style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}
              >
                {line.value}
              </span>
              {line.note && (
                <span className="mt-1 block text-[11px]" style={{ color: "var(--text-muted)" }}>
                  {line.note}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 max-w-2xl text-[11px]" style={{ color: "var(--text-muted)" }}>
        Licence and third-party notices ship beside this app, in its{" "}
        <span style={{ fontFamily: "var(--font-mono)" }}>Contents/Resources</span> folder.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// library browser
// ---------------------------------------------------------------------------

/** A shelf tile: the shelf's name against a filled count cell. Counts are
 *  derived (home.ts). */
function ShelfButton({
  label,
  count,
  note,
  onClick,
}: {
  label: string;
  count: number;
  note?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={note || undefined}
      className="grid flex-1 basis-52 grid-cols-[2.75rem_1fr] items-stretch text-left"
      style={{ background: "var(--bg-secondary)" }}
    >
      <span
        className="flex items-center justify-center py-2.5 tabular text-[11px]"
        style={{
          background: "var(--accent-soft)",
          color: "var(--accent-strong)",
          borderRight: "1px solid var(--border)",
        }}
      >
        {count}
      </span>
      <span className="truncate px-3 py-2.5 text-sm font-semibold" style={nameStyle}>
        {label}
      </span>
    </button>
  );
}

/** The shelf tiles as one region: a 1px gap over the border colour draws the
 *  rules BETWEEN cells, so a set of shelves is one ruled block of discrete
 *  cells rather than a scatter of outlined boxes. The tiles flex so a row is
 *  always full — an empty grid slot would show as a dead cell. */
function ShelfGrid({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-wrap gap-px border"
      style={{ background: "var(--border)", borderColor: "var(--border)" }}
    >
      {children}
    </div>
  );
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

      <Column className="pb-16 pt-10">
        <section>
          <BlockHeader label="Standard library" count={`${standard} models`} />
          <div className="border-x border-b px-4 py-5" style={{ borderColor: "var(--border)" }}>
            <div className="text-sm font-semibold" style={nameStyle}>
              Examples — by genus
            </div>
            <p className="mb-3 mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
              {EXAMPLES_NOTE}
            </p>
            <ShelfGrid>
              {examples.map((s) => (
                <ShelfButton key={s.id} label={s.label} count={s.count} onClick={() => onShelf(s)} />
              ))}
            </ShelfGrid>

            <div className="mt-7 text-sm font-semibold" style={nameStyle}>
              Source corpus — by author
            </div>
            <p className="mb-3 mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
              {CORPUS_NOTE}
            </p>
            <ShelfGrid>
              {corpus.map((s) => (
                <ShelfButton key={s.id} label={s.label} count={s.count} note={s.note} onClick={() => onShelf(s)} />
              ))}
            </ShelfGrid>
          </div>
        </section>

        {/* Saved models list HERE, not behind a shelf-of-one: there was never a
            branch to take, so the drill-in was a click that bought nothing. */}
        <section className="mt-10">
          <BlockHeader label="My library" count={`${savedCount} model${savedCount === 1 ? "" : "s"}`} />
          <div className="border-x border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
            <p className="max-w-2xl text-sm" style={{ color: "var(--text-secondary)" }}>
              Models you have saved from this app. A model reached by a decomposition
              reference nests under the system of interest that reaches it.
            </p>
          </div>
          {tree.length === 0 ? (
            <div
              className="border-x border-b px-4 py-3 text-sm"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              no saved models yet
            </div>
          ) : (
            <Ledger>
              {shownRoots.map((root, i) => (
                <div
                  key={root.name}
                  className="grid w-full grid-cols-[3.25rem_1fr] items-stretch border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <Gutter index={i + 1} />
                  <div className="py-2.5 pl-5 pr-4">
                    <LibraryRow node={root} depth={0} onLoad={onLoad} onDelete={onDelete} onRename={onRename} />
                  </div>
                </div>
              ))}
              {foldedRoots > 0 && (
                <button
                  onClick={() => setShowAllSaved(true)}
                  className="block w-full border-b px-5 py-2 text-left text-xs"
                  style={{
                    borderColor: "var(--border)",
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-muted)",
                  }}
                >
                  show all {tree.length} saved models
                </button>
              )}
            </Ledger>
          )}
        </section>

        <section className="mt-10">
          <BlockHeader label="From a file" />
          <Ledger>
            <LedgerRow
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
            className="mt-1 block text-[10px]"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
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
      />

      <Column className="pb-16 pt-10">
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
                    <div
                      className="border-b px-4 py-2"
                      style={{ background: "var(--accent-soft)", borderColor: "var(--border)" }}
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold" style={nameStyle}>
                          {s.name}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                          {s.entries.length} variants · one lesson by diff
                        </span>
                      </div>
                      {shared && (
                        <div
                          className="mt-0.5 text-[10px]"
                          style={{ fontFamily: "var(--font-mono)", color: "var(--accent-strong)" }}
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
          <span aria-hidden className="shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>
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
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-primary)",
            }}
            aria-label={`Rename ${node.name}`}
          />
        ) : (
          <button onClick={() => onLoad(node.name)} className="min-w-0 flex-1 text-left" title={node.name}>
            <div className={depth === 0 ? "truncate text-sm font-semibold" : "truncate text-xs"} style={nameStyle}>
              {node.name}
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
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
            style={{ color: "var(--text-muted)" }}
          >
            ✎
          </button>
        )}
        <button
          onClick={() => onDelete(node.name)}
          title={`Delete ${node.name}`}
          className="shrink-0 px-1.5 text-sm"
          style={{ color: "var(--text-muted)" }}
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
