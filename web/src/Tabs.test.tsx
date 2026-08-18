// The shared tab strip (ws3) — one primitive drawn for the inspector dock and
// the run dock alike. Selection lives with the caller; these tests pin the
// contract: every tab renders, the active one carries the accent underline,
// and a badge shows only when passed. Click behavior rides through
// InspectorDock.test.tsx, which exercises the same component interactively.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Tabs } from "./ui";

const TABS = [
  { key: "story", label: "Story" },
  { key: "fit", label: "Fit to data" },
  { key: "table", label: "Table", badge: 3 },
];

describe("Tabs", () => {
  it("renders every tab, marks the active one, and shows badges", () => {
    const m = renderToStaticMarkup(<Tabs tabs={TABS} active="fit" onSelect={() => {}} />);
    expect(m).toContain("Story");
    expect(m).toContain("Fit to data");
    expect(m).toContain("Table");
    expect(m).toContain(">3<");
    // Exactly one active underline (the accent); the rest are transparent.
    expect(m.match(/2px solid var\(--lens-accent\)/g)?.length).toBe(1);
    expect(m.match(/2px solid transparent/g)?.length).toBe(2);
  });

  it("renders pinned controls in their own cell when passed", () => {
    const m = renderToStaticMarkup(
      <Tabs tabs={TABS} active="story" onSelect={() => {}} controls={<button>⤢</button>} />,
    );
    expect(m).toContain("⤢");
  });
});
