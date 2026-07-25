// The home screen's three levels, rendered to static markup.
//
// The load-bearing claims:
//   1. HOME is a menu of three doors, not a list of models.
//   2. the library browser's shelf counts are DERIVED — they equal the entries
//      the corresponding shelf page actually lists, so a new example or a new
//      corpus tradition can never drift from its button.
//   3. the citation line IS the examples/corpus separator: a corpus row renders
//      its entry's citation, an example row renders none.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeMenu, LibraryBrowser, MyLibraryPage, ShelfPage } from "./HomeScreen";
import { corpusShelves, exampleShelfEntries, exampleShelves, corpusShelfEntries } from "./home";
import { CORPUS } from "./corpus";

const noop = () => {};
const shelfPage = (area: "examples" | "corpus", id: string) =>
  renderToStaticMarkup(
    <ShelfPage area={area} id={id} onBack={noop} onOpenExample={noop} onOpenCorpus={noop} />,
  );

describe("home", () => {
  it("is a menu of three doors", () => {
    const html = renderToStaticMarkup(<HomeMenu onCreate={noop} onOpenLibrary={noop} />);
    expect(html).toContain("Create a model");
    expect(html).toContain("Open a model");
    expect(html).toContain("Documentation");
    // The docs door links out; it is not an in-app page.
    expect(html).toContain('href="https://github.com/halcyonic-systems/bert-lenses/tree/main/docs"');
    // Removed entry points stay removed.
    expect(html).not.toContain("Start blank");
    expect(html).not.toContain("Write SL");
    expect(html).not.toContain("Open a folder");
  });
});

describe("library browser", () => {
  const html = renderToStaticMarkup(
    <LibraryBrowser savedCount={3} onBack={noop} onShelf={noop} onMine={noop} onOpenFile={noop} />,
  );

  it("names both standard-library shelves and My library", () => {
    expect(html).toContain("Standard library");
    expect(html).toContain("Examples — by genus");
    expect(html).toContain("Source corpus — by author");
    expect(html).toContain("My library");
    expect(html).not.toContain("Saved in this browser");
  });

  it("shows a count on every shelf button, derived from the shelf itself", () => {
    for (const s of exampleShelves()) {
      expect(s.count).toBe(exampleShelfEntries(s.id).length);
      expect(html).toContain(s.label);
    }
    for (const s of corpusShelves()) {
      const { sets, loose } = corpusShelfEntries(s.id);
      expect(s.count).toBe(sets.reduce((n, x) => n + x.entries.length, 0) + loose.length);
      expect(html).toContain(s.label);
    }
    expect(html).toContain("Saved models");
  });

  it("carries no traditions of its own — the corpus shelves come from the data", () => {
    const traditions = new Set(CORPUS.map((e) => e.tradition));
    expect(new Set(corpusShelves().map((s) => s.id))).toEqual(traditions);
  });

  it("offers the file picker and no folder picker", () => {
    expect(html).toContain("Open a file…");
    expect(html).not.toContain("Chrome only");
  });
});

describe("shelf page", () => {
  it("lists that shelf's models with their descriptions", () => {
    const shelf = exampleShelves()[0];
    const html = shelfPage("examples", shelf.id);
    const entries = exampleShelfEntries(shelf.id);
    expect(entries.length).toBeGreaterThan(0);
    for (const d of entries) expect(html).toContain(d.title);
    expect(html).toContain(`${entries.length} model`);
  });

  it("renders a citation on every corpus row", () => {
    const shelf = corpusShelves()[0];
    const html = shelfPage("corpus", shelf.id);
    const { sets, loose } = corpusShelfEntries(shelf.id);
    const entries = [...sets.flatMap((s) => s.entries), ...loose];
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(html).toContain(e.title);
      expect(html).toContain(escapeHtml(e.citation));
    }
  });

  it("renders no citation on an example row", () => {
    const html = shelfPage("examples", exampleShelves()[0].id);
    for (const e of CORPUS) expect(html).not.toContain(escapeHtml(e.citation));
  });
});

describe("my library", () => {
  it("lists saved models, or says there are none", () => {
    const empty = renderToStaticMarkup(
      <MyLibraryPage tree={[]} onBack={noop} onLoad={noop} onDelete={noop} onRename={async () => true} />,
    );
    expect(empty).toContain("no saved models yet");
    const filled = renderToStaticMarkup(
      <MyLibraryPage
        tree={[
          {
            name: "steel plant",
            savedAt: Date.now(),
            missingReferents: 0,
            children: [{ name: "boiler", savedAt: Date.now(), missingReferents: 0, children: [] }],
          },
        ]}
        onBack={noop}
        onLoad={noop}
        onDelete={noop}
        onRename={async () => true}
      />,
    );
    expect(filled).toContain("steel plant");
    expect(filled).toContain("boiler");
    expect(filled).toContain("2 models");
  });
});

// react-dom/server escapes text; compare against the same escaping.
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
