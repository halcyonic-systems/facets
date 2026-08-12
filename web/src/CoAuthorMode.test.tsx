// #10 — the resident co-author, folded into the SL pane as a mode. Static-
// markup render checks (the pattern the Klir/Mobus register tests use): no
// DOM, no wasm, no network — just that the history renders each turn's status
// and content faithfully.
import { beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CoAuthorMode, drafterLine, drafterMismatch, stageLabel } from "./CoAuthorMode";
import { resetDrafterModelForTest, setDrafterModel } from "./drafterModel";
import type { CoauthorTurn, DraftStage } from "./coauthor";
import {
  initReasoner,
  memoryReasonerBackend,
  resetReasonerForTest,
  setReasonerConfigBackend,
} from "./reasoner";

const noopDraft = async () => {};
const noopLoad = () => {};

/** #199: the drafting surface only exists once the reasoner is on. */
async function reasonerOn(endpoint = "http://localhost:5010") {
  resetReasonerForTest();
  setReasonerConfigBackend(memoryReasonerBackend({ enabled: true, endpoint }));
  await initReasoner();
}

describe("CoAuthorMode", () => {
  beforeEach(async () => {
    await reasonerOn();
  });

  it("renders an empty state with no drafts yet", () => {
    const m = renderToStaticMarkup(
      <CoAuthorMode turns={[]} onDraft={noopDraft} onLoad={noopLoad} />,
    );
    expect(m).toContain("No drafts yet");
    expect(m).toContain("Draft");
  });

  it("asks for the reasoner's address — and offers no drafting surface — while it is off", async () => {
    resetReasonerForTest();
    setReasonerConfigBackend(memoryReasonerBackend(null));
    await initReasoner();
    const m = renderToStaticMarkup(
      <CoAuthorMode turns={[]} onDraft={noopDraft} onLoad={noopLoad} />,
    );
    expect(m).toContain("Turn on the co-author");
    expect(m).toContain("The reasoner&#x27;s address");
    expect(m).toContain("http://localhost:5010");
    expect(m).not.toContain("Describe a system in plain language");
    // #229 — the enable moment offers no hosted alternative, and names no host
    // but this machine's. The gate is where a remote URL would be published.
    expect(m).not.toMatch(/reasoner\.halcyonic\.systems|hosted/i);
  });

  it("says which reasoner is in use once it is on, and offers to turn it off", async () => {
    await reasonerOn("http://127.0.0.1:5010");
    const m = renderToStaticMarkup(
      <CoAuthorMode turns={[]} onDraft={noopDraft} onLoad={noopLoad} />,
    );
    expect(m).toContain("Co-author is on");
    expect(m).toContain("your reasoner");
    expect(m).toContain("http://127.0.0.1:5010");
    expect(m).toContain("Turn off");
  });

  it("renders a previewing turn with its description and SL", () => {
    const turns: CoauthorTurn[] = [
      {
        id: "t1",
        description: "a home thermostat with a sensor and a furnace",
        sl: "system Thermostat\ncomponent Sensor interface\ncomponent Furnace interface",
        at: new Date("2026-07-24T12:00:00Z").toISOString(),
        status: "previewing",
      },
    ];
    const m = renderToStaticMarkup(
      <CoAuthorMode turns={turns} onDraft={noopDraft} onLoad={noopLoad} />,
    );
    expect(m).toContain("a home thermostat with a sensor and a furnace");
    expect(m).toContain("component Sensor interface");
    expect(m).toContain("previewing");
    expect(m).toContain("Load");
  });

  it("surfaces a compile error's fault text instead of hiding it", () => {
    const turns: CoauthorTurn[] = [
      {
        id: "t2",
        description: "an unfinished sketch",
        sl: "system X",
        at: new Date().toISOString(),
        status: "compile-error",
        errorText: "line 2: unknown keyword `foo`",
      },
    ];
    const m = renderToStaticMarkup(
      <CoAuthorMode turns={turns} onDraft={noopDraft} onLoad={noopLoad} />,
    );
    expect(m).toContain("kernel rejected");
    expect(m).toContain("unknown keyword");
  });

  it("distinguishes accepted from discarded turns", () => {
    const turns: CoauthorTurn[] = [
      { id: "a", description: "accepted one", sl: "system A", at: new Date().toISOString(), status: "accepted" },
      { id: "b", description: "discarded one", sl: "system B", at: new Date().toISOString(), status: "discarded" },
    ];
    const m = renderToStaticMarkup(
      <CoAuthorMode turns={turns} onDraft={noopDraft} onLoad={noopLoad} />,
    );
    expect(m).toContain("accepted");
    expect(m).toContain("discarded");
  });
});

describe("stageLabel (#218 — naming the stage instead of a static 'Drafting…')", () => {
  const LOCAL = "http://localhost:5010";
  // A reasoner the user runs somewhere other than this machine. Since #229 this
  // is the only non-loopback case there is — the app ships no remote address.
  const REMOTE = "http://gsr.example.com:5010";

  it("falls back to the static label when no stage is known yet", () => {
    expect(stageLabel(null, LOCAL)).toBe("Drafting…");
  });

  it("names the local default model when asking one's own endpoint", () => {
    expect(stageLabel({ kind: "asking" }, LOCAL)).toBe("Asking the local reasoner (gemma4)…");
  });

  it("does not invent a model name for a reasoner that is not on this machine", () => {
    const label = stageLabel({ kind: "asking" }, REMOTE);
    expect(label).toBe("Asking your reasoner…");
    expect(label).not.toMatch(/gemma|claude/i);
  });

  it("names the compile phase", () => {
    expect(stageLabel({ kind: "compiling" }, LOCAL)).toBe("Compiling the draft…");
  });

  it("makes the heal-loop retry legible, with the attempt count", () => {
    const stage: DraftStage = { kind: "retrying", attempt: 2, maxAttempts: 3 };
    expect(stageLabel(stage, LOCAL)).toBe("Draft did not compile, retrying (2 of 3)…");
  });

  it("reflects the final attempt distinctly from the first retry", () => {
    const stage: DraftStage = { kind: "retrying", attempt: 3, maxAttempts: 3 };
    expect(stageLabel(stage, LOCAL)).toBe("Draft did not compile, retrying (3 of 3)…");
  });

  it("states a chosen model as an ASK, since who answered is not known yet", () => {
    expect(stageLabel({ kind: "asking" }, LOCAL, "claude-sonnet-4-6")).toBe(
      "Asking the reasoner for claude-sonnet-4-6…",
    );
  });
});

// The model choice, and the hazard it carries. GSR falls back to a local model
// when it holds no key for the Claude one asked for, and the call SUCCEEDS —
// the draft arrives, nothing errors. These bind the only thing that stops a
// demo audience being told Claude wrote a draft a local 12B wrote.
describe("the answering model is what gets shown", () => {
  it("names the model that answered, not the one requested", () => {
    expect(drafterLine({ model: "gemma4:12b" })).toBe("Drafted by gemma4:12b.");
  });

  it("says nothing about a model for a turn that never reached one", () => {
    expect(drafterLine({})).toBeNull();
  });

  it("does not borrow the requested name when the reasoner named no model", () => {
    const line = drafterLine({ model: "" });
    expect(line).toBe("The reasoner did not name the model that answered.");
    expect(line).not.toContain("claude");
  });

  it("reports no mismatch when the model that answered is the one asked for", () => {
    expect(drafterMismatch({ model: "claude-sonnet-4-6", requestedModel: "claude-sonnet-4-6" })).toBeNull();
  });

  it("reports no mismatch against the reasoner's own default, which asks for whatever it serves", () => {
    expect(drafterMismatch({ model: "gemma4:12b", requestedModel: "" })).toBeNull();
  });

  it("names both models when a Claude ask was answered by a local one", () => {
    const notice = drafterMismatch({ model: "gemma4:12b", requestedModel: "claude-sonnet-4-6" });
    expect(notice).toContain("claude-sonnet-4-6");
    expect(notice).toContain("gemma4:12b");
    expect(notice).toContain("key");
    expect(notice).not.toContain("—");
  });

  it("surfaces the mismatch in the turn itself, not in a tooltip", async () => {
    await reasonerOn();
    const turns: CoauthorTurn[] = [
      {
        id: "m1",
        description: "a thermostat",
        sl: "system Thermostat",
        at: new Date().toISOString(),
        status: "previewing",
        model: "gemma4:12b",
        requestedModel: "claude-sonnet-4-6",
      },
    ];
    const m = renderToStaticMarkup(<CoAuthorMode turns={turns} onDraft={noopDraft} onLoad={noopLoad} />);
    expect(m).toContain("Asked for claude-sonnet-4-6");
    expect(m).toContain("Answered by gemma4:12b");
    expect(m).toContain("var(--verdict-warning)");
    expect(m).not.toContain("title=\"Asked for");
  });

  it("offers the model choice, saying where each one runs, once the reasoner is on", async () => {
    await reasonerOn();
    resetDrafterModelForTest();
    const m = renderToStaticMarkup(<CoAuthorMode turns={[]} onDraft={noopDraft} onLoad={noopLoad} />);
    expect(m).toContain("Drafts with");
    expect(m).toContain("claude-sonnet-4-6");
    expect(m).toContain("on the reasoner&#x27;s machine");
  });

  it("shows the chosen model's home once a frontier model is picked", async () => {
    await reasonerOn();
    resetDrafterModelForTest();
    setDrafterModel("claude-sonnet-4-6");
    const m = renderToStaticMarkup(<CoAuthorMode turns={[]} onDraft={noopDraft} onLoad={noopLoad} />);
    expect(m).toContain("through the reasoner&#x27;s cloud path");
    resetDrafterModelForTest();
  });
});

// The final runtime, which used to vanish with the live counter.
describe("the turn keeps its model time", () => {
  it("shows a single ask's time beside the model", () => {
    expect(drafterLine({ model: "gemma4:12b", modelMs: 12400, modelCalls: 1 })).toBe(
      "Drafted by gemma4:12b in 12.4s.",
    );
  });

  it("says the number covers several calls when the draft had to heal", () => {
    expect(drafterLine({ model: "gemma4:12b", modelMs: 31000, modelCalls: 3 })).toBe(
      "Drafted by gemma4:12b in 31.0s of model time over 3 calls.",
    );
  });

  it("prints no time at all rather than a zero when the reasoner reported none", () => {
    const line = drafterLine({ model: "gemma4:12b", modelCalls: 1 });
    expect(line).toBe("Drafted by gemma4:12b.");
    expect(line).not.toContain("0");
  });

  it("renders the completed turn's runtime in the history", async () => {
    await reasonerOn();
    const turns: CoauthorTurn[] = [
      {
        id: "t9",
        description: "a thermostat",
        sl: "system Thermostat",
        at: new Date().toISOString(),
        status: "accepted",
        model: "claude-sonnet-4-6",
        requestedModel: "claude-sonnet-4-6",
        modelMs: 8200,
        modelCalls: 1,
      },
    ];
    const m = renderToStaticMarkup(<CoAuthorMode turns={turns} onDraft={noopDraft} onLoad={noopLoad} />);
    expect(m).toContain("Drafted by claude-sonnet-4-6 in 8.2s.");
  });
});
