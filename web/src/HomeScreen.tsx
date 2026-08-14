// The home screen — a menu with three doors, not a modal stacked on an empty
// canvas. Two levels, one surface:
//
//   home     Create a model · Start from data · Open a model · Documentation
//   library  ONE FLAT LIST of every model, partitioned by provenance —
//            Ships with the app / Yours / Drafted with the co-author — plus a
//            file from disk
//
// The library is not a browsing hierarchy any more. Genus and tradition are
// facts ABOUT a model, not places a model lives, so they ride the row as tags
// and narrow the list through a filter; the page opens on openable models.
// The partition that survives is PROVENANCE, because it is the one that will
// matter on release: a bundle ships a handful of models and everything else is
// the user's own.
//
// Rows and facets are both derived (home.ts) from the same groupings the
// gallery has always read — a new example or a new corpus tradition appears
// with no edit here.
//
// The examples/corpus separation is still the point: an example is ours, a
// corpus entry is an author's. The CITATION LINE is what tells them apart on
// the page — identical row layout, corpus rows render a citation and example
// rows do not.
//
// The row's left cell is a fixed 3rem gutter holding the folio numeral. It is
// sized to take a diagram thumbnail later (#311) without the rest of the row
// moving.
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
  shippedModels,
  CORPUS_NOTE,
  EXAMPLES_NOTE,
  type Facet,
  type ShippedModel,
  type Tag,
} from "./home";
import { openExternal } from "./desktop";
import { buildInfo, provenanceLines } from "./buildInfo";
import Thumbnail from "./canvas/Thumbnail";
import { useThumbnailModel } from "./canvas/useThumbnail";

const DOCS_URL = "https://github.com/halcyonic-systems/bert-lenses/tree/main/docs";

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
  lede,
  note,
  stat,
  statLabel,
  back,
}: {
  eyebrow?: string;
  title: ReactNode;
  /** The page's opening line. Plain sans; the library's shorter `note` is the
   *  same object at a smaller size. */
  lede?: string;
  note?: string;
  stat?: number;
  statLabel?: string;
  back?: { label: string; onClick: () => void };
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
      <div className="flex items-start justify-between gap-10 pt-6">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-3 text-[11px] uppercase tracking-[0.3em]" style={folioStyle}>
              {eyebrow}
            </div>
          )}
          <h1
            className="text-6xl leading-[0.95] tracking-tight"
            style={{ fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}
          >
            {title}
          </h1>
        </div>
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
          className="mt-6 max-w-xl text-xl leading-snug"
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
      <div className="mt-8" style={{ borderTop: "1px solid var(--rule)" }} />
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
  return (
    <div>
      <Masthead title={<span>bert&#8202;·&#8202;lenses</span>} lede={LEDE} />
      <Column className="pb-20 pt-12">
        <BlockHeader label="Start here" />
        <Ledger>
          <LedgerRow
            door
            name="Create a model"
            description="Start from a blank canvas and draw the structure."
            onClick={onCreate}
          />
          {onStartFromData && (
            <LedgerRow
              door
              name="Start from data"
              description="Create one the other way instead: bring a CSV or type observations, and let the structure come later."
              onClick={onStartFromData}
            />
          )}
          <LedgerRow
            door
            name="Open a model"
            description="The standard library, your own saved models, or a file from disk."
            onClick={onOpenLibrary}
          />
          <LedgerRow
            door
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

function hueOf(tag: Tag): string | undefined {
  return tag.kind === "tradition" ? WORLD_HUE[tag.id] : undefined;
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

/** How many saved roots list inline before the browser folds the rest behind a
 *  "show all" — enough that a normal library never folds at all. */
const INLINE_LIBRARY_ROOTS = 12;

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
  const [facet, setFacet] = useState<Tag | null>(initialFacet ?? null);
  const shown = all.filter((m) => matchesFacet(m, facet));
  const savedCount = countLibrary(tree);
  const [showAllSaved, setShowAllSaved] = useState(false);
  const shownRoots = showAllSaved ? tree : tree.slice(0, INLINE_LIBRARY_ROOTS);
  const foldedRoots = tree.length - shownRoots.length;
  const genera = allFacets.filter((f) => f.kind === "genus");
  const traditions = allFacets.filter((f) => f.kind === "tradition");
  const isSelected = (f: Facet) => facet?.kind === f.kind && facet?.id === f.id;
  const toggle = (f: Facet) => setFacet(isSelected(f) ? null : f);
  return (
    <div>
      <Masthead
        eyebrow="Library"
        title="Open a model"
        note={`${EXAMPLES_NOTE} ${CORPUS_NOTE}`}
        stat={all.length + savedCount}
        statLabel="models"
        back={{ label: "Home", onClick: onBack }}
      />

      <Column className="pb-20 pt-6">
        {/* The filter, immediately under the masthead and immediately above the
            models — genus and tradition are facts about a model, not places a
            model lives, so they narrow the list in place. Counts come off the
            same list the section below renders (home.ts), so a facet's number
            cannot drift from what selecting it shows. */}
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
            <div
              className="border-t py-3 text-sm"
              style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)", fontFamily: display, fontStyle: "italic" }}
            >
              no model carries that tag
            </div>
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
            <div
              className="border-t py-3 text-sm"
              style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)", fontFamily: display, fontStyle: "italic" }}
            >
              your models carry no genus or tradition tag — clear the filter to see them
            </div>
          ) : tree.length === 0 ? (
            <div
              className="border-t py-3 text-sm"
              style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)", fontFamily: display, fontStyle: "italic" }}
            >
              no saved models yet
            </div>
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
              <div
                className="border-t py-3 text-sm"
                style={{ borderColor: "var(--rule-soft)", color: "var(--ink-muted)", fontFamily: display, fontStyle: "italic" }}
              >
                your drafts carry no genus or tradition tag — clear the filter to see them
              </div>
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
      </Column>
    </div>
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
