// The home screen's three levels, rendered to static markup.
//
// The load-bearing claims:
//   1. HOME is a menu of three doors, not a list of models.
//   2. the library browser's shelf counts are DERIVED — they equal the entries
//      the corresponding shelf page actually lists, so a new example or a new
//      corpus tradition can never drift from its button.
//   3. the citation line IS the examples/corpus separator: a corpus row renders
//      its entry's citation, an example row renders none.
//   4. a tag on a shelf row marks the EXCEPTION (carries dynamics), never the
//      rule; a shared citation hoists to the sibling-set header.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AboutPage, HomeMenu, LibraryBrowser, ShelfPage, sharedCitation } from "./HomeScreen";
import { corpusShelves, exampleShelfEntries, exampleShelves, corpusShelfEntries } from "./home";
import { CORPUS } from "./corpus";
import { isRunnable } from "./demos";
import type { CorpusEntry } from "./corpus";
import type { LibraryNode } from "./libraryTree";

const noop = () => {};
const asyncTrue = async () => true;
const browser = (tree: LibraryNode[] = []) =>
  renderToStaticMarkup(
    <LibraryBrowser
      tree={tree}
      onBack={noop}
      onShelf={noop}
      onOpenFile={noop}
      onLoad={noop}
      onDelete={noop}
      onRename={asyncTrue}
    />,
  );
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

describe("library browser", () => {
  const html = browser();

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
    // The count is the masthead's one number: numeral and unit are separate
    // cells of the band, not one "N models" string.
    expect(html).toContain(`>${entries.length}<`);
    expect(html).toContain(`model${entries.length === 1 ? "" : "s"}<`);
  });

  // A model's name is data. The ledger sets it in small caps for an even
  // column, but never text-transform: `hal` is named `hal`.
  it("keeps a model's authored case", () => {
    const shelf = exampleShelves().find((s) =>
      exampleShelfEntries(s.id).some((d) => d.title === "hal"),
    );
    expect(shelf).toBeDefined();
    const html = shelfPage("examples", shelf!.id);
    expect(html).toContain(">hal<");
    expect(html).not.toContain("HAL");
    expect(html).not.toContain("uppercase\" style=\"font-variant-caps");
    expect(html).not.toContain("text-transform");
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

  // The tag marks the exception. Every shelf model is structural, so a label
  // that says so on every row is noise; only the ones that also run are tagged.
  it("tags the models that carry dynamics and nothing else", () => {
    for (const shelf of exampleShelves()) {
      const html = shelfPage("examples", shelf.id);
      const entries = exampleShelfEntries(shelf.id);
      expect(html).not.toContain("diagram");
      if (entries.some(isRunnable)) expect(html).toContain("runs");
      else expect(html).not.toContain(">runs<");
    }
    // …and the shelves do carry runnable models, or the claim is vacuous.
    expect(exampleShelves().some((s) => exampleShelfEntries(s.id).some(isRunnable))).toBe(true);
  });
});

describe("sibling-set citations", () => {
  const entry = (title: string, citation: string): CorpusEntry => ({
    file: `x/${title}.sl`,
    tradition: "klir",
    title,
    citation,
    teaches: "A sentence.",
    sl: "",
  });

  it("hoists only when every member cites the same source", () => {
    expect(sharedCitation([entry("a", "Ch. 10"), entry("b", "Ch. 10")])).toBe("Ch. 10");
    expect(sharedCitation([entry("a", "Ch. 10"), entry("b", "Ch. 11")])).toBeNull();
    expect(sharedCitation([entry("a", "Ch. 10")])).toBeNull();
  });

  // Derived, not hardcoded: Klir's four goal-oriented paradigms share one
  // figure, so the shelf prints that citation once rather than four times.
  it("prints a set's shared citation once on the shelf", () => {
    for (const shelf of corpusShelves()) {
      const html = shelfPage("corpus", shelf.id);
      for (const s of corpusShelfEntries(shelf.id).sets) {
        const shared = sharedCitation(s.entries);
        if (!shared) continue;
        expect(occurrences(html, escapeHtml(shared))).toBe(1);
      }
    }
  });

  it("keeps the per-row citation when members cite differently", () => {
    const differing = [entry("a", "Ch. 10"), entry("b", "Ch. 11")];
    expect(sharedCitation(differing)).toBeNull();
    // The corpus shelves prove the fallback still renders: every loose entry
    // (no set, so never hoisted) keeps its own citation line.
    for (const shelf of corpusShelves()) {
      const html = shelfPage("corpus", shelf.id);
      for (const e of corpusShelfEntries(shelf.id).loose) {
        expect(html).toContain(escapeHtml(e.citation));
      }
    }
  });
});

describe("my library", () => {
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
});

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

// react-dom/server escapes text; compare against the same escaping.
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
