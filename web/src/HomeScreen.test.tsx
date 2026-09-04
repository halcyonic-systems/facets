// The home screen's two levels, rendered to static markup.
//
// The load-bearing claims:
//   1. HOME is a menu of doors, not a list of models.
//   2. the LIBRARY is one flat list — every model that ships is on the page,
//      openable, with no drill-down between the reader and it.
//   3. the list is partitioned by PROVENANCE (ships / yours / drafted), and
//      genus and
//      tradition survive as TAGS plus a filter rather than as places. The
//      drafted partition is ABSENT, not empty, when there is nothing in it —
//      the reasoner is off by default, so these tests render with no history.
//   4. the filter's facet counts are DERIVED — a facet's number equals the
//      number of rows carrying that tag, so a new example or a new corpus
//      tradition can never drift from its facet.
//   5. the citation line IS the examples/corpus separator: a corpus row renders
//      its entry's citation, an example row renders none.
//   6. a tag on a model row marks the EXCEPTION (carries dynamics), never the
//      rule.
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AboutPage, HomeMenu, LibraryBrowser } from "./HomeScreen";
import { facets, matchesFacet, shelves, shippedModels, type Arrange, type Tag } from "./home";
import type { RecentEntry } from "./recent";
import { CORPUS } from "./corpus";
import type { LibraryNode } from "./libraryTree";

// renderToStaticMarkup never resolves an effect, so the drafted partition is
// always empty here — which is exactly the state these tests want to pin. The
// mock keeps the network door from being touched at all.
vi.mock("./drafted", () => ({ draftedModels: async () => [] }));

const noop = () => {};
const asyncTrue = async () => true;
const page = (opts: {
  tree?: LibraryNode[];
  initialFacet?: Tag | null;
  initialView?: "doors" | "list";
  initialQuery?: string;
  initialArrange?: Arrange;
  initialManage?: boolean;
  recent?: RecentEntry[];
}) =>
  renderToStaticMarkup(
    <LibraryBrowser
      tree={opts.tree ?? []}
      onBack={noop}
      onOpenExample={noop}
      onOpenCorpus={noop}
      onOpenDrafted={noop}
      onOpenFile={noop}
      onLoad={noop}
      onDelete={noop}
      onRename={asyncTrue}
      initialFacet={opts.initialFacet ?? null}
      initialView={opts.initialView ?? "doors"}
      initialQuery={opts.initialQuery ?? ""}
      initialArrange={opts.initialArrange}
      initialManage={opts.initialManage ?? false}
      recent={opts.recent ?? []}
    />,
  );

/** The LIST view — the flat ledger the library keeps behind "browse all as a
 *  list". Every claim about citations, tags, facets and folios is a claim about
 *  this view. */
const browser = (tree: LibraryNode[] = [], initialFacet: Tag | null = null) =>
  page({ tree, initialFacet, initialView: "list" });

/** The DOORS — what opening the library now shows. */
const doors = (opts: Parameters<typeof page>[0] = {}) => page({ ...opts, initialView: "doors" });

describe("home", () => {
  it("is four doors in three groups, with the docs in the colophon", () => {
    const html = renderToStaticMarkup(<HomeMenu onCreate={noop} onOpenLibrary={noop} />);
    expect(html).toContain("Draw your system");
    expect(html).toContain("Open a model");
    expect(html).toContain("Sandbox");
    expect(html).toContain("Documentation");
    // The docs link goes to the rendered docs on the site (#368), not a repo tree.
    expect(html).toContain('href="https://facets.systems/docs/"');
    // A real anchor, so right-click → Copy Link works. The desktop shim hangs
    // off its click handler; it must not replace the anchor with a button.
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
    // Removed entry points stay removed.
    expect(html).not.toContain("Start blank");
    expect(html).not.toContain("Write SL");
    expect(html).not.toContain("Open a folder");
  });

  // #229 — the landing page asserts the kernel judges under Klir, Bunge and
  // Mobus, so a reader must be able to find out which proofs, at which commit.
  // The provenance moved off the landing page to its own page (it was a whole
  // table of machine facts in front of a first-run reader); the reachability
  // claim survives the move, so the door is what home has to carry.
  it("offers a door to the build's provenance", () => {
    const html = renderToStaticMarkup(
      <HomeMenu onCreate={noop} onOpenLibrary={noop} onAbout={noop} />,
    );
    expect(html).toContain("This build");
  });

  // The values are injected by vite (absent here); the claim under test is that
  // the surface exists and names the right facts.
  it("names the right facts on the provenance page", () => {
    const html = renderToStaticMarkup(<AboutPage onBack={noop} />);
    expect(html).toContain("This build");
    expect(html).toContain("Built from");
    expect(html).toContain("Proof base");
    expect(html).toContain("systems-science-foundations");
    expect(html).toContain("Kernel wasm SHA-256");
    expect(html).toContain("shasum -a 256");
  });
});

describe("the list view is one flat list", () => {
  const html = browser();

  // The whole point of the rebuild: opening the library puts openable models on
  // the page. Nothing may sit between the reader and a model.
  it("lists every shipped model, with no shelf in between", () => {
    const all = shippedModels();
    expect(all.length).toBeGreaterThan(0);
    for (const m of all) expect(html).toContain(escapeHtml(m.name));
    expect(html).toContain(`${all.length} model${all.length === 1 ? "" : "s"}`);
    // The browsing hierarchy is gone: no shelf sections, no per-author page.
    expect(html).not.toContain("Examples — by genus");
    expect(html).not.toContain("Source corpus — by author");
  });

  it("partitions by provenance, ships and yours", () => {
    expect(html).toContain("Ships with the app");
    expect(html).toContain("Yours");
    expect(html).not.toContain("Saved in this browser");
  });

  it("renders each model's description alongside its name", () => {
    for (const m of shippedModels()) {
      if (m.description) expect(html).toContain(escapeHtml(m.description));
    }
  });

  it("offers the file picker and no folder picker", () => {
    expect(html).toContain("Open a file…");
    expect(html).not.toContain("Chrome only");
  });
});

describe("genus and tradition are tags, not places", () => {
  const html = browser();

  // The claim the old shelf-count test made, restated for the flat list: a
  // facet's number is counted off the same rows the page renders, so it cannot
  // drift from what selecting it shows.
  it("shows a facet for every tag, counted off the rows themselves", () => {
    const rows = shippedModels();
    const all = facets(rows);
    expect(all.length).toBeGreaterThan(0);
    for (const f of all) {
      expect(f.count).toBe(rows.filter((r) => matchesFacet(r, f)).length);
      expect(html).toContain(escapeHtml(f.label));
    }
  });

  it("carries no traditions of its own — they come from the data", () => {
    const traditions = new Set(CORPUS.map((e) => e.tradition));
    const facetIds = new Set(facets().filter((f) => f.kind === "tradition").map((f) => f.id));
    expect(facetIds).toEqual(traditions);
  });

  it("tags every row with its genus or its tradition", () => {
    for (const m of shippedModels()) {
      expect(m.tags.length).toBeGreaterThan(0);
      for (const t of m.tags) expect(html).toContain(escapeHtml(t.label));
    }
  });

  it("narrows the list to the rows carrying the selected tag", () => {
    const genus = facets().find((f) => f.kind === "genus");
    expect(genus).toBeDefined();
    const kept = shippedModels().filter((m) => matchesFacet(m, genus!));
    const dropped = shippedModels().filter((m) => !matchesFacet(m, genus!));
    expect(kept.length).toBeGreaterThan(0);
    expect(dropped.length).toBeGreaterThan(0);
    const filtered = browser([], genus!);
    for (const m of kept) expect(filtered).toContain(escapeHtml(m.name));
    expect(filtered).toContain(`${kept.length} model${kept.length === 1 ? "" : "s"}`);
  });
});

describe("the citation is the separator", () => {
  // Every corpus row carries its own citation. On the shelves a set's shared
  // citation was hoisted to a set header; a flat list has no set header, so the
  // line lives on the row — which is the distinction the corpus file's own
  // header comment says has to survive.
  it("renders a citation on every corpus row", () => {
    const html = browser();
    const corpusRows = shippedModels().filter((m) => m.open.kind === "corpus");
    expect(corpusRows.length).toBe(CORPUS.length);
    for (const m of corpusRows) {
      expect(m.citation).toBeTruthy();
      expect(html).toContain(escapeHtml(m.citation!));
    }
  });

  it("renders no citation on an example row", () => {
    for (const m of shippedModels()) {
      if (m.open.kind === "example") expect(m.citation).toBeUndefined();
    }
    // …and on the page: filtered to a genus, the list is examples only, so no
    // corpus citation may appear anywhere on it.
    const genus = facets().find((f) => f.kind === "genus");
    const filtered = browser([], genus!);
    for (const e of CORPUS) expect(filtered).not.toContain(escapeHtml(e.citation));
  });

  // #148's sibling-sets were a shelf-page cluster. The FACT (this model teaches
  // by diff over one fixed composition) is a property of the entry, so it
  // survives as a note on the row.
  it("keeps a sibling-set's name on its members' rows", () => {
    const html = browser();
    const sets = new Set(CORPUS.flatMap((e) => (e.set ? [e.set] : [])));
    expect(sets.size).toBeGreaterThan(0);
    for (const s of sets) expect(html).toContain(escapeHtml(s));
  });
});

describe("the runs mark is the exception", () => {
  // Every model in the library is structural, so a label saying so on every row
  // is noise; only the ones that also carry dynamics are marked.
  it("marks the models that carry dynamics and nothing else", () => {
    const html = browser();
    const runnable = shippedModels().filter((m) => m.runs);
    expect(runnable.length).toBeGreaterThan(0);
    expect(runnable.length).toBeLessThan(shippedModels().length);
    expect(occurrences(html, ">runs<")).toBe(runnable.length);
    expect(html).not.toContain(">diagram<");
  });

  // A model's name is data. The ledger sets it in small caps for an even
  // column, but never text-transform: `hal` is named `hal`.
  it("keeps a model's authored case", () => {
    expect(shippedModels().some((m) => m.name === "hal")).toBe(true);
    const html = browser();
    expect(html).toContain(">hal<");
    expect(html).not.toContain("HAL");
    expect(html).not.toContain("text-transform");
  });
});

describe("yours", () => {
  it("lists saved models inline in the browser, or says there are none", () => {
    expect(browser()).toContain("no saved models yet");
    const filled = browser([
      {
        name: "steel plant",
        savedAt: Date.now(),
        missingReferents: 0,
        children: [{ name: "boiler", savedAt: Date.now(), missingReferents: 0, children: [] }],
      },
    ]);
    expect(filled).toContain("steel plant");
    expect(filled).toContain("boiler");
    expect(filled).toContain("2 models");
    // Inline means no drill-in: the shelf-of-one button is gone.
    expect(filled).not.toContain("Saved models");
    // Rename and delete came along with the list.
    expect(filled).toContain("Rename steel plant");
    expect(filled).toContain("Delete boiler");
  });

  it("folds a long list behind one control rather than truncating it", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({
      name: `model ${i}`,
      savedAt: Date.now(),
      missingReferents: 0,
      children: [],
    }));
    const html = browser(many);
    expect(html).toContain("model 11");
    expect(html).not.toContain("model 12");
    expect(html).toContain("show all 15 saved models");
  });

  // Saved models carry no genus and no tradition, so a facet selection must
  // empty this section rather than silently ignore the filter.
  it("says so when a filter excludes every saved model", () => {
    const genus = facets().find((f) => f.kind === "genus");
    const html = browser(
      [{ name: "steel plant", savedAt: Date.now(), missingReferents: 0, children: [] }],
      genus!,
    );
    expect(html).not.toContain("steel plant");
    expect(html).toContain("clear the filter");
  });
});

describe("the doors", () => {
  const shipped = shippedModels();
  const at = (days: number) => Date.now() - days * 86_400_000;
  // Only what the Recent strip itself renders — every model on this page also
  // appears on a shelf below, so "is it in Recent" is a question about a REGION
  // of the page and not about the page.
  const recentRegion = (html: string) =>
    html.slice(html.indexOf("Recent"), html.indexOf("Start from one of ours"));

  it("opens on doors rather than on the ledger", () => {
    const html = doors();
    expect(html).toContain("Start from one of ours");
    expect(html).toContain("By lens");
    expect(html).toContain("From a file");
    // The ledger is still there, one control away, and it still says how much
    // it holds.
    expect(html).toContain(`Browse all ${shipped.length} as a list`);
    expect(html).not.toContain("Ships with the app");
  });

  it("reads as a page, not as gaps, on a first visit", () => {
    const html = doors();
    // Nothing opened and nothing saved: Recent is ABSENT (a reader who has
    // opened nothing is not missing anything), Yours is a sentence.
    expect(html).not.toContain("yours, and ours you have touched");
    expect(html).toContain("nothing saved yet");
  });

  it("orders Recent by when it was opened and caps it at four", () => {
    const five = shipped.slice(0, 5);
    const recent: RecentEntry[] = five.map((m, i) => ({
      kind: m.open.kind === "example" ? "example" : "corpus",
      key: m.key,
      at: at(i), // index 0 is the newest
    }));
    const region = recentRegion(doors({ recent }));
    const positions = five.map((m) => region.indexOf(escapeHtml(m.name)));
    // The fifth is over the cap and is not in the strip at all.
    expect(positions[4]).toBe(-1);
    // The other four are in newest-first order.
    for (const p of positions.slice(0, 4)) expect(p).toBeGreaterThan(-1);
    expect([...positions.slice(0, 4)].sort((a, b) => a - b)).toEqual(positions.slice(0, 4));
  });

  it("says where a copy came from", () => {
    const tree: LibraryNode[] = [
      { name: "my steel plant", savedAt: at(1), from: "The Steel-Plant in its environment", missingReferents: 0, children: [] },
      { name: "drawn from nothing", savedAt: at(2), missingReferents: 0, children: [] },
    ];
    const html = doors({ tree });
    expect(html).toContain("your copy · from The Steel-Plant in its environment");
    expect(html).toContain("yours · ");
    // Lineage rides the Recent card too, which is where two similar names are
    // most likely to be confused for each other.
    const region = recentRegion(
      doors({ tree, recent: [{ kind: "library", key: "my steel plant", at: at(1) }] }),
    );
    expect(region).toContain("your copy · from The Steel-Plant in its environment");
  });

  it("switches the shelves between the lens cut and the domain cut", () => {
    const lens = doors({ initialArrange: "lens" });
    const domain = doors({ initialArrange: "domain" });
    for (const shelf of shelves(shipped, "lens")) {
      expect(lens).toContain(escapeHtml(shelf.note));
      // A tradition shelf wears its world hue; a domain shelf wears none.
      expect(lens).toContain(`var(--world-${shelf.id})`);
      expect(domain).not.toContain(`var(--world-${shelf.id})`);
    }
    for (const shelf of shelves(shipped, "domain")) {
      expect(domain).toContain(`>${escapeHtml(shelf.label)}<`);
    }
  });

  it("keeps the two colour channels apart", () => {
    const lens = doors({ initialArrange: "lens" });
    const domain = doors({ initialArrange: "domain" });
    // A tradition is a reading and wears --world-*; a genus is a kingdom and
    // wears a chart ink. Neither channel appears in the other's cut.
    for (const id of ["klir", "bunge", "mobus"]) {
      expect(lens).toContain(`var(--world-${id})`);
      expect(domain).not.toContain(`var(--world-${id})`);
    }
    for (const ink of ["--chart-1", "--chart-3", "--chart-4"]) {
      expect(domain).toContain(`var(${ink})`);
      expect(lens).not.toContain(`var(${ink})`);
    }
    // The colour is a fill with an edge, never a gradient or a left border.
    expect(lens).toContain("color-mix(in oklab, var(--world-mobus) 14%, var(--paper))");
    expect(lens).not.toContain("gradient");
  });

  it("colours Recent by the reader and Yours by nothing at all", () => {
    const tree: LibraryNode[] = [
      { name: "steel plant", savedAt: at(1), missingReferents: 0, children: [] },
    ];
    const html = doors({
      tree,
      recent: [{ kind: "corpus", key: "mobus/steel-plant.sl", at: at(0) }],
    });
    // Recent is about the reader, so its wells take the app's own accent…
    expect(html).toContain("var(--accent-soft)");
    // …and a saved model, which belongs to no shelf, takes no shelf's colour.
    expect(html).toContain("var(--accent-slate)");
    // Delete is the one destructive control on the page and is marked as one.
    expect(doors({ tree, initialManage: true })).toContain("var(--verdict-error)");
  });

  it("leads each shelf with the model that teaches it", () => {
    // The one hand-made list on the page: every shelf opens on a model, and
    // that model is the shelf's first card.
    for (const arrange of ["lens", "domain"] as const) {
      for (const shelf of shelves(shipped, arrange)) {
        expect(shelf.models.length).toBeGreaterThan(0);
      }
    }
    // Mobus's lead is one of OURS, hoisted onto a shelf its tags do not put it
    // on — the editorial call, pinned so it cannot drift unnoticed.
    const mobus = shelves(shipped, "lens").find((s) => s.id === "mobus");
    expect(mobus?.models[0]?.key).toBe("example:steel-plant-walk");
  });

  it("narrows every section at once", () => {
    const tree: LibraryNode[] = [
      { name: "steel plant", savedAt: at(1), missingReferents: 0, children: [] },
    ];
    const html = doors({ tree, initialQuery: "ribosome" });
    expect(html).toContain("Ribosome");
    expect(html).not.toContain("Bitcoin");
    // Yours is narrowed by the same string, and says so rather than emptying.
    expect(html).not.toContain(">steel plant<");
    expect(html).toContain("none of your models matches");
  });

  it("exposes rename and delete only in manage mode", () => {
    const tree: LibraryNode[] = [
      { name: "steel plant", savedAt: at(1), missingReferents: 0, children: [] },
    ];
    expect(doors({ tree })).not.toContain("Delete steel plant");
    const managed = doors({ tree, initialManage: true });
    expect(managed).toContain("Delete steel plant");
    expect(managed).toContain("Rename steel plant");
  });

  it("lists a saved child as openable as its root", () => {
    const tree: LibraryNode[] = [
      {
        name: "steel plant",
        savedAt: at(1),
        missingReferents: 0,
        children: [{ name: "boiler", savedAt: at(3), missingReferents: 0, children: [] }],
      },
    ];
    const html = doors({ tree });
    expect(html).toContain("steel plant");
    expect(html).toContain("boiler");
  });
});

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

// react-dom/server escapes text; compare against the same escaping. The
// apostrophe matters now that whole descriptions are compared, not just
// citations — react writes it as &#x27;.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
