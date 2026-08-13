// #312 move 1: Type left the inspector dock for the model name in the menu bar.
// Two claims are bound here.
//
// 1. PLACEMENT. The declaration is still one click away and still the same
//    editor with the same value/onChange contract — it just hangs off the name,
//    which already stands for "which model is this".
// 2. WIDTH. The issue's premise was that the strip's horizontal scroll is a
//    COUNT problem. It is measured rather than assumed, because there is no
//    DOM layout here: the arithmetic is the widths the classes declare plus an
//    explicit per-character advance for the label face. It reads the real tab
//    list (DOCK_TABS), so re-adding a tab moves these numbers.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DOCK_TABS } from "./InspectorDock";
import { SystemTypeEditor } from "./SystemTypeEditor";
import { MenuBar, WORK_MODES } from "./App";

const menuBar = (props: Partial<Parameters<typeof MenuBar>[0]> = {}) =>
  renderToStaticMarkup(
    <MenuBar
      loaded
      hasModel
      canExport
      currentLabel="watershed"
      systemType={{ kingdom: "Concrete", genus: "Biological" }}
      onSystemTypeChange={() => {}}
      dirty={false}
      onNew={() => {}}
      onOpen={() => {}}
      onSave={() => {}}
      onExport={() => {}}
      onSaveToFolder={() => {}}
      onSaveToLibrary={() => {}}
      onHome={() => {}}
      libraryModels={[]}
      onSwitchDemo={() => {}}
      onSwitchLibrary={() => {}}
      onOpenFull={() => {}}
      {...props}
    />,
  );

describe("the model name carries the system type (#312)", () => {
  it("is an affordance, not a label: the name opens the declaration", () => {
    const html = menuBar();
    expect(html).toMatch(/<button[^>]*aria-label="watershed[^"]*system type"/);
    expect(html).toMatch(/aria-expanded="false"/);
  });

  it("reads the asserted kind back without opening anything", () => {
    expect(menuBar()).toContain("Concrete / Biological");
    expect(menuBar({ systemType: undefined })).toContain("unasserted");
  });

  it("stays inert when the shell hands over no writer", () => {
    const html = menuBar({ onSystemTypeChange: undefined });
    expect(html).toMatch(/<button disabled=""[^>]*aria-label="watershed[^"]*system type"/);
    expect(html).toContain("cursor:default");
  });

  it("the editor it opens is the same component the dock used, same contract", () => {
    const html = renderToStaticMarkup(
      <SystemTypeEditor value={{ kingdom: "Concrete", genus: "Social" }} onChange={() => {}} />,
    );
    expect(html).toContain("System type");
    expect(html).toContain('value="Social"');
  });

  it("does not become a modal: the dock is gone from the strip, not moved into one", () => {
    expect(DOCK_TABS.map((t) => t.id)).not.toContain("type");
  });
});

describe("the run is a mode, not a tab (#312 move 2)", () => {
  // The architectural claim, bound where the tab list lives so the two cannot
  // drift: what the dock carries is READINGS. A run is an activity with a
  // timeline, inputs and results, and #304 settles it as a mode transition.
  it("the dock carries four faces, and every one of them is a reading", () => {
    expect(DOCK_TABS.map((t) => t.id)).toEqual(["element", "formal", "review", "analyst"]);
  });

  it("run is on the mode axis, beside structure and data", () => {
    expect(WORK_MODES).toContain("run");
    expect(DOCK_TABS.map((t) => t.id)).not.toContain("run");
  });
});

describe("the inspector dock's tab strip at 24rem (#312)", () => {
  // What the classes declare. `px-2.5` is 10px a side (it was `px-3.5`/14px
  // until the width lever landed); the pinned controls cell
  // is two `px-3` glyph buttons; the dock prefers `basis-96` (24rem) and yields
  // to `min-w-72` (18rem) under pressure, less the 1px `border-l`.
  const TAB_PADDING = 20;
  const CONTROLS = 2 * (12 + 12 + 10);
  const BADGE = 6 + 17.6; // gap-1.5 + the min-w-[1.1rem] issue count
  // Inter, 12px, semibold, uppercase, tracking-wide (0.025em). MEASURED, not
  // estimated: after move 1 shipped, every tab was read with
  // getBoundingClientRect() in the running app at a 1382px viewport, and the
  // face runs 8.4px per character (Analyst = 87px = 28px padding + 59px of text
  // over 7 characters). The 7.0 this file used before move 1 was a guess, low
  // by a fifth, and it is what made the four-tab case look like it would fit.
  const CHAR = 8.4;

  const strip = (labels: readonly string[], badged = false) =>
    labels.reduce(
      (w, l) => w + TAB_PADDING + l.length * CHAR + (badged && l === "Review" ? BADGE : 0),
      0,
    );
  const room = (dockPx: number) => dockPx - 1 - CONTROLS;

  const shown = DOCK_TABS.map((t) => t.label);
  const unselected = shown.filter((l) => l !== "Element");

  it("recovers two tabs: four faces, and neither Type nor Run is one of them", () => {
    expect(shown).toHaveLength(4);
    expect(shown).not.toContain("Type");
    expect(shown).not.toContain("Run");
    // What the two departed tabs cost the strip, for the record.
    expect(strip([...shown, "Type"]) - strip(shown)).toBeCloseTo(53.6, 1);
    expect(strip([...shown, "Run"]) - strip(shown)).toBeCloseTo(45.2, 1);
  });

  it("fits at 24rem with an element selected — the count was never the whole story", () => {
    // The line that was owed. Removing Type and then Run were ARCHITECTURAL
    // moves and neither one stopped the scrolling: four tabs plus a selection
    // measured 331px against 311px of room in the running app. Tightening the
    // tab padding from 14px a side to 10px is the third lever, and it is what
    // closes the gap. Kept as an assertion rather than a comment so the strip
    // cannot silently start scrolling again.
    expect(strip(shown)).toBeLessThan(room(384));
  });

  it("fits at 24rem with nothing selected, which six tabs did not", () => {
    expect(strip([...unselected, "Type", "Run"])).toBeGreaterThan(room(384));
    expect(strip(unselected)).toBeLessThan(room(384));
    expect(strip(unselected, true)).toBeLessThan(room(384));
  });

  it("overflows at the shrunk 18rem width even unselected", () => {
    expect(strip(unselected)).toBeGreaterThan(room(288));
  });
});
