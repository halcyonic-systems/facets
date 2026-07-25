// The home screen — a menu with three doors, not a modal stacked on an empty
// canvas. Three levels, one surface:
//
//   home     Create a model · Open a model · Documentation
//   library  the shelves: examples by genus, corpus by author, My library, a file
//   shelf    one shelf's models, name + description (+ citation, corpus only)
//
// Counts on the shelf buttons are derived (home.ts) — a new example or a new
// corpus tradition lights up its button with no edit here.
//
// The examples/corpus separation is the point of the two-section library: an
// example is ours, a corpus entry is an author's. The CITATION LINE is what
// tells them apart on the page — identical row layout, corpus rows render a
// citation and example rows do not.
import { useState, useRef, type ReactNode } from "react";
import { isRunnable, type Demo } from "./demos";
import { firstSentence, type CorpusEntry } from "./corpus";
import type { LibraryNode } from "./libraryTree";
import {
  corpusShelfEntries,
  corpusShelves,
  exampleShelfEntries,
  exampleShelves,
  CORPUS_NOTE,
  EXAMPLES_NOTE,
  type Shelf,
} from "./home";

const DOCS_URL = "https://github.com/halcyonic-systems/bert-lenses/tree/main/docs";

export type HomeRoute =
  | { view: "home" }
  | { view: "library" }
  | { view: "shelf"; area: "examples" | "corpus"; id: string }
  | { view: "mine" };

interface HomeProps {
  initialRoute?: HomeRoute;
  onCreate: () => void;
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
      style={{
        backgroundColor: "var(--bg-primary)",
        backgroundImage: "radial-gradient(120% 80% at 50% -10%, var(--stage-from), transparent 60%)",
      }}
    >
      <div className="mx-auto w-full max-w-2xl px-6 pb-20 pt-14">
        {route.view === "home" && (
          <HomeMenu onCreate={props.onCreate} onOpenLibrary={() => setRoute({ view: "library" })} />
        )}
        {route.view === "library" && (
          <LibraryBrowser
            savedCount={countLibrary(props.libraryTree)}
            onBack={() => setRoute({ view: "home" })}
            onShelf={(s) => setRoute({ view: "shelf", area: s.area, id: s.id })}
            onMine={() => setRoute({ view: "mine" })}
            onOpenFile={props.onOpenFile}
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
        {route.view === "mine" && (
          <MyLibraryPage
            tree={props.libraryTree}
            onBack={() => setRoute({ view: "library" })}
            onLoad={props.onLoadFromLibrary}
            onDelete={props.onDeleteFromLibrary}
            onRename={props.onRenameInLibrary}
          />
        )}
        {props.onClose && (
          <button
            onClick={props.onClose}
            className="mt-12 text-xs"
            style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
          >
            ‹ back to the model on the canvas
          </button>
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
// Shared page furniture. Hairlines and letterspaced small caps, no cards.
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
      style={{ color: "var(--text-muted)" }}
    >
      {children}
    </div>
  );
}

function PageTitle({ children, count }: { children: ReactNode; count?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
        {children}
      </h1>
      {count && (
        <span className="shrink-0 text-xs tabular" style={{ color: "var(--text-muted)" }}>
          {count}
        </span>
      )}
    </div>
  );
}

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mb-8 text-xs uppercase tracking-wide"
      style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}
    >
      ‹ {label}
    </button>
  );
}

/** One door on the home menu: a full-width hairline row, name in the display
 *  face, purpose beside it. No card, no shadow — a menu line. */
function Door({
  title,
  note,
  onClick,
  href,
}: {
  title: string;
  note: string;
  onClick?: () => void;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-baseline gap-3">
        <span className="text-xl" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          {title}
        </span>
        <span className="ml-auto text-sm" style={{ color: "var(--text-muted)" }}>
          {href ? "↗" : "›"}
        </span>
      </div>
      <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        {note}
      </div>
    </>
  );
  const style = { borderColor: "var(--hairline)" };
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block w-full border-b py-5 text-left"
      style={style}
    >
      {body}
    </a>
  ) : (
    <button onClick={onClick} className="block w-full border-b py-5 text-left" style={style}>
      {body}
    </button>
  );
}

// ---------------------------------------------------------------------------
// home
// ---------------------------------------------------------------------------

export function HomeMenu({ onCreate, onOpenLibrary }: { onCreate: () => void; onOpenLibrary: () => void }) {
  return (
    <div>
      <h1 className="text-5xl" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
        bert&#8202;·&#8202;lenses
      </h1>
      <p className="mt-3 max-w-lg text-sm" style={{ color: "var(--text-secondary)" }}>
        A modeling and simulation instrument for systems. Draw a system on the canvas
        or write it in SL; the kernel judges it under Klir, Bunge, and Mobus.
      </p>
      <nav className="mt-12 border-t" style={{ borderColor: "var(--hairline)" }}>
        <Door title="Create a model" note="Start from a blank canvas." onClick={onCreate} />
        <Door
          title="Open a model"
          note="The standard library, your own saved models, or a file from disk."
          onClick={onOpenLibrary}
        />
        <Door
          title="Documentation"
          note="The language, the kernel, and the traditions behind them."
          href={DOCS_URL}
        />
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------------------
// library browser
// ---------------------------------------------------------------------------

/** A shelf button: the shelf's name and how many models are on it, so the
 *  choice is informed before the click. Counts are derived (home.ts). */
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
      className="flex items-baseline gap-2 px-3 py-2 text-left"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-secondary)",
      }}
    >
      <span className="text-sm" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
        {label}
      </span>
      <span className="text-[11px] tabular" style={{ color: "var(--text-muted)" }}>
        ·&#8202;{count}
      </span>
    </button>
  );
}

export function LibraryBrowser({
  savedCount,
  onBack,
  onShelf,
  onMine,
  onOpenFile,
}: {
  savedCount: number;
  onBack: () => void;
  onShelf: (s: Shelf) => void;
  onMine: () => void;
  onOpenFile: () => void;
}) {
  const examples = exampleShelves();
  const corpus = corpusShelves();
  return (
    <div>
      <BackLink label="Home" onClick={onBack} />
      <PageTitle>Open a model</PageTitle>

      <section className="mt-10">
        <SectionLabel>Standard library</SectionLabel>
        <p className="mb-5 text-sm" style={{ color: "var(--text-secondary)" }}>
          Ships with the app, maintained in the repository.
        </p>

        <div className="mb-6">
          <div className="text-sm" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Examples — by genus
          </div>
          <p className="mb-2 mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {EXAMPLES_NOTE}
          </p>
          <div className="flex flex-wrap gap-2">
            {examples.map((s) => (
              <ShelfButton key={s.id} label={s.label} count={s.count} onClick={() => onShelf(s)} />
            ))}
          </div>
        </div>

        <div>
          <div className="text-sm" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Source corpus — by author
          </div>
          <p className="mb-2 mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {CORPUS_NOTE}
          </p>
          <div className="flex flex-wrap gap-2">
            {corpus.map((s) => (
              <ShelfButton
                key={s.id}
                label={s.label}
                count={s.count}
                note={s.note}
                onClick={() => onShelf(s)}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10 border-t pt-8" style={{ borderColor: "var(--hairline)" }}>
        <SectionLabel>My library</SectionLabel>
        <p className="mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Models you have saved from this app.
        </p>
        <div className="flex flex-wrap gap-2">
          <ShelfButton label="Saved models" count={savedCount} onClick={onMine} />
        </div>
      </section>

      <section className="mt-10 border-t pt-8" style={{ borderColor: "var(--hairline)" }}>
        <SectionLabel>From a file</SectionLabel>
        <button
          onClick={onOpenFile}
          className="mt-2 flex items-baseline gap-2 px-3 py-2 text-left"
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-secondary)",
          }}
        >
          <span className="text-sm" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Open a file…
          </span>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            a model .json from your computer
          </span>
        </button>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// shelf page
// ---------------------------------------------------------------------------

/** One model on a shelf. Name in the display face, description on its own line
 *  so it WRAPS instead of clipping mid-word, and — corpus only — the citation
 *  beneath it. Same row on both shelves; the citation is the separator. */
function ShelfRow({
  name,
  description,
  citation,
  tag,
  onClick,
}: {
  name: string;
  description: string;
  citation?: string;
  tag?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="block w-full border-b py-3 text-left"
      style={{ borderColor: "var(--hairline)" }}
    >
      <div className="flex items-baseline gap-3">
        <span className="text-base" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          {name}
        </span>
        {tag && (
          <span
            className="ml-auto shrink-0 text-[10px] uppercase tracking-wide"
            style={{ color: "var(--text-muted)" }}
          >
            {tag}
          </span>
        )}
      </div>
      <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        {description}
      </div>
      {citation && (
        <div className="mt-1 text-[10px]" style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
          {citation}
        </div>
      )}
    </button>
  );
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
  return (
    <div>
      <BackLink label="Open a model" onClick={onBack} />
      <SectionLabel>{area === "examples" ? "Examples" : "Source corpus"}</SectionLabel>
      <PageTitle count={`${count} model${count === 1 ? "" : "s"}`}>{shelf?.label ?? id}</PageTitle>
      <p className="mt-2 max-w-lg text-sm" style={{ color: "var(--text-secondary)" }}>
        {area === "examples" ? EXAMPLES_NOTE : CORPUS_NOTE}
      </p>
      {area === "corpus" && shelf?.note && (
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          {shelf.note}
        </p>
      )}

      <div className="mt-8 border-t" style={{ borderColor: "var(--hairline)" }}>
        {area === "examples" &&
          entries.map((d) => (
            <ShelfRow
              key={d.key}
              name={d.title}
              description={d.blurb}
              tag={isRunnable(d) ? "runs" : "diagram"}
              onClick={() => onOpenExample(d)}
            />
          ))}
        {area === "corpus" && (
          <>
            {corpus.sets.map((s) => (
              <div key={s.name}>
                <div className="flex items-baseline gap-2 pt-4">
                  <span
                    className="text-xs font-semibold"
                    style={{ fontFamily: "var(--font-display)", color: "var(--text-secondary)" }}
                  >
                    {s.name}
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {s.entries.length} variants · one lesson by diff
                  </span>
                </div>
                {s.entries.map((e) => (
                  <ShelfRow
                    key={e.file}
                    name={e.title}
                    description={firstSentence(e.teaches)}
                    citation={e.citation}
                    onClick={() => onOpenCorpus(e)}
                  />
                ))}
              </div>
            ))}
            {corpus.loose.map((e) => (
              <ShelfRow
                key={e.file}
                name={e.title}
                description={firstSentence(e.teaches)}
                citation={e.citation}
                onClick={() => onOpenCorpus(e)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// my library
// ---------------------------------------------------------------------------

export function MyLibraryPage({
  tree,
  onBack,
  onLoad,
  onDelete,
  onRename,
}: {
  tree: LibraryNode[];
  onBack: () => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
  onRename: (from: string, to: string) => Promise<boolean>;
}) {
  const count = countLibrary(tree);
  return (
    <div>
      <BackLink label="Open a model" onClick={onBack} />
      <SectionLabel>My library</SectionLabel>
      <PageTitle count={`${count} model${count === 1 ? "" : "s"}`}>Saved models</PageTitle>
      <p className="mt-2 max-w-lg text-sm" style={{ color: "var(--text-secondary)" }}>
        Models you have saved from this app. A model reached by a decomposition
        reference nests under the system of interest that reaches it.
      </p>
      <div className="mt-8 border-t" style={{ borderColor: "var(--hairline)" }}>
        {tree.length === 0 ? (
          <p className="py-4 text-sm" style={{ color: "var(--text-muted)" }}>
            no saved models yet
          </p>
        ) : (
          tree.map((root) => (
            <div key={root.name} className="border-b py-2" style={{ borderColor: "var(--hairline)" }}>
              <LibraryRow node={root} depth={0} onLoad={onLoad} onDelete={onDelete} onRename={onRename} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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
            className={
              depth === 0 ? "min-w-0 flex-1 rounded px-1 text-sm" : "min-w-0 flex-1 rounded px-1 text-xs"
            }
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
            aria-label={`Rename ${node.name}`}
          />
        ) : (
          <button onClick={() => onLoad(node.name)} className="min-w-0 flex-1 text-left" title={node.name}>
            <div
              className={depth === 0 ? "truncate text-sm" : "truncate text-xs"}
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
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
            className="shrink-0 rounded px-1.5 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            ✎
          </button>
        )}
        <button
          onClick={() => onDelete(node.name)}
          title={`Delete ${node.name}`}
          className="shrink-0 rounded px-1.5 text-sm"
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
