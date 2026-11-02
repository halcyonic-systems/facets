// The start surface over a new blank canvas. Static-markup checks, like the
// pane tests beside it: the two ways in, the describe field behind one of
// them, and what it says about the reasoner before anything is sent.
import { beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StartSurface } from "./StartSurface";
import {
  initReasoner,
  memoryReasonerBackend,
  resetReasonerForTest,
  setReasonerConfigBackend,
  type ReasonerConfig,
} from "./reasoner";

const noop = () => {};

async function reasoner(seed: ReasonerConfig | null) {
  resetReasonerForTest();
  setReasonerConfigBackend(memoryReasonerBackend(seed));
  await initReasoner();
}

describe("StartSurface", () => {
  beforeEach(async () => {
    await reasoner(null);
  });

  it("offers two ways in, each a card with a drawn icon (2026-11-02)", () => {
    const m = renderToStaticMarkup(<StartSurface onDescribe={noop} onSkip={noop} onBuild={noop} />);
    expect(m).toContain("Start your model");
    expect(m).toContain("Build it");
    expect(m).toContain("Describe it");
    expect(m).toContain("skip");
    expect((m.match(/<svg/g) ?? []).length).toBeGreaterThanOrEqual(2);
    // The field waits until Describe it is chosen.
    expect(m).not.toContain("<textarea");
  });

  it("no longer offers wiring processes: it was Build under another name", () => {
    const m = renderToStaticMarkup(<StartSurface onDescribe={noop} onSkip={noop} onBuild={noop} />);
    expect(m).not.toContain("Wire processes");
    expect(m).not.toContain("Draw it by hand");
  });

  it("opens on the describe field when asked, with a way back", () => {
    const m = renderToStaticMarkup(<StartSurface onDescribe={noop} onSkip={noop} initialStep="describe" />);
    expect(m).toContain('aria-label="Describe a system"');
    expect(m).toContain("<textarea");
    expect(m).toContain("Draft");
    expect(m).toContain("back");
  });

  it("no longer asks for a name or a system type", () => {
    const m = renderToStaticMarkup(<StartSurface onDescribe={noop} onSkip={noop} />);
    expect(m).not.toContain("What are you modeling");
    expect(m).not.toContain("Kingdom");
  });

  it("offers the library door only when the shell supplies it, and no data door", () => {
    const bare = renderToStaticMarkup(<StartSurface onDescribe={noop} onSkip={noop} />);
    expect(bare).not.toContain("open an example");
    const full = renderToStaticMarkup(<StartSurface onDescribe={noop} onSkip={noop} onOpenLibrary={noop} />);
    expect(full).toContain("open an example");
    // The data-first door left the face in the 2026-10-26 cut (#309 parked).
    expect(full).not.toContain("Build from data");
  });

  it("says the co-author is off, and that nothing is sent before the author chooses", () => {
    const m = renderToStaticMarkup(<StartSurface onDescribe={noop} onSkip={noop} initialStep="describe" />);
    expect(m).toContain("The co-author is off");
  });

  it("names which reasoner drafts once it is on", async () => {
    await reasoner({ enabled: true, endpoint: "https://api.facets.systems" });
    const m = renderToStaticMarkup(<StartSurface onDescribe={noop} onSkip={noop} initialStep="describe" />);
    expect(m).toContain("Drafts with the facets reasoner");
  });
});
