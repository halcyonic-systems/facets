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
import { MenuBar } from "./App";

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

describe("the inspector dock's tab strip at 24rem (#312)", () => {
  // What the classes declare. `px-3.5` is 14px a side; the pinned controls cell
  // is two `px-3` glyph buttons; the dock prefers `basis-96` (24rem) and yields
  // to `min-w-72` (18rem) under pressure, less the 1px `border-l`.
  const TAB_PADDING = 28;
  const CONTROLS = 2 * (12 + 12 + 10);
  const BADGE = 6 + 17.6; // gap-1.5 + the min-w-[1.1rem] issue count
  // Inter, 12px, semibold, uppercase, tracking-wide (0.025em). Held at the LOW
  // end of plausible for that face so the overflow verdict below is not an
  // artifact of a generous estimate.
  const CHAR = 7.0;

  const strip = (labels: readonly string[], badged = false) =>
    labels.reduce(
      (w, l) => w + TAB_PADDING + l.length * CHAR + (badged && l === "Review" ? BADGE : 0),
      0,
    );
  const room = (dockPx: number) => dockPx - 1 - CONTROLS;

  const shown = DOCK_TABS.map((t) => t.label);
  const unselected = shown.filter((l) => l !== "Element");

  it("recovers a tab: five faces, and Type is not one of them", () => {
    expect(shown).toHaveLength(5);
    expect(shown).not.toContain("Type");
    // What the sixth tab cost, for the record.
    expect(strip([...shown, "Type"]) - strip(shown)).toBeCloseTo(56, 0);
  });

  it("still overflows 24rem with an element selected, so one tab was not enough", () => {
    // The honest answer to the issue's sequencing question: dropping Type is a
    // real recovery and it is not sufficient. With something selected the strip
    // still scrolls, which is why move 2 is still owed.
    expect(strip(shown)).toBeGreaterThan(room(384));
  });

  it("bought back the unselected case, which six tabs did not have either", () => {
    // With Type present the strip overflowed even with nothing selected. That
    // is the width this move actually recovered.
    expect(strip([...unselected, "Type"])).toBeGreaterThan(room(384));
    expect(strip(unselected)).toBeLessThan(room(384));
    expect(strip(unselected, true)).toBeLessThan(room(384));
  });

  it("overflows at the shrunk 18rem width in every case", () => {
    expect(strip(unselected)).toBeGreaterThan(room(288));
  });
});
