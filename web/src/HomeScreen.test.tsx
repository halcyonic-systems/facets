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
import { facets, matchesFacet, shippedModels, type Tag } from "./home";
import { CORPUS } from "./corpus";
import type { LibraryNode } from "./libraryTree";

// renderToStaticMarkup never resolves an effect, so the drafted partition is
// always empty here — which is exactly the state these tests want to pin. The
// mock keeps the network door from being touched at all.
vi.mock("./drafted", () => ({ draftedModels: async () => [] }));

const noop = () => {};
const asyncTrue = async () => true;
const browser = (tree: LibraryNode[] = [], initialFacet: Tag | null = null) =>
  renderToStaticMarkup(
    <LibraryBrowser
      tree={tree}
      onBack={noop}
      onOpenExample={noop}
      onOpenCorpus={noop}
      onOpenDrafted={noop}
      onOpenFile={noop}
      onLoad={noop}
      onDelete={noop}
      onRename={asyncTrue}
      initialFacet={initialFacet}
    />,
  );

describe("home", () => {
  it("is four doors in three groups, with the docs in the colophon", () => {
    const html = renderToStaticMarkup(<HomeMenu onCreate={noop} onOpenLibrary={noop} />);
    expect(html).toContain("Draw your system");
    expect(html).toContain("Open a model");
    expect(html).toContain("Sandbox");
    expect(html).toContain("Documentation");
    // The docs link goes to the rendered README, not a repo tree (2026-09-03).
    expect(html).toContain('href="https://github.com/halcyonic-systems/facets/blob/main/docs/README.md"');
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

describe("the library is one flat list", () => {
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
