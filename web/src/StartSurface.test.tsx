// The start surface over a new blank canvas. Static-markup checks, like the
// pane tests beside it: what it asks for, what it offers instead, and what it
// says about the reasoner before anything is sent.
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

  it("leads with describing a system and keeps a visible way past it", () => {
    const m = renderToStaticMarkup(<StartSurface onDescribe={noop} onSkip={noop} />);
    expect(m).toContain("Describe a system");
    expect(m).toContain("<textarea");
    expect(m).toContain("Draft");
    expect(m).toContain("skip");
    expect(m).toContain("Draw it by hand");
  });

  it("no longer asks for a name or a system type", () => {
    const m = renderToStaticMarkup(<StartSurface onDescribe={noop} onSkip={noop} />);
    expect(m).not.toContain("What are you modeling");
    expect(m).not.toContain("Kingdom");
  });

  it("offers the data and library doors only when the shell supplies them", () => {
    const bare = renderToStaticMarkup(<StartSurface onDescribe={noop} onSkip={noop} />);
    expect(bare).not.toContain("Build from data");
    expect(bare).not.toContain("Open an example");
    const full = renderToStaticMarkup(
      <StartSurface onDescribe={noop} onSkip={noop} onStartFromData={noop} onOpenLibrary={noop} />,
    );
    expect(full).toContain("Build from data");
    expect(full).toContain("Open an example");
  });

  it("says the co-author is off, and that nothing is sent before the author chooses", () => {
    const m = renderToStaticMarkup(<StartSurface onDescribe={noop} onSkip={noop} />);
    expect(m).toContain("The co-author is off");
  });

  it("names which reasoner drafts once it is on", async () => {
    await reasoner({ enabled: true, endpoint: "https://api.facets.systems" });
    const m = renderToStaticMarkup(<StartSurface onDescribe={noop} onSkip={noop} />);
    expect(m).toContain("Drafts with the facets reasoner");
  });
});
