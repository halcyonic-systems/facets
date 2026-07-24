// #10: the SL pane's manual-authoring surface is the base surface and must
// never be gated behind the co-author — it renders whether or not `coauthor`
// is supplied, and stays the default view even when the mode switch is
// present. Static-markup checks (no DOM events, so mode-switch clicking is
// exercised live — see the PR's manual verification note).
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SlPane } from "./SlPane";

const noop = () => {};

describe("SlPane — manual authoring is preserved", () => {
  it("renders the textarea and Compile button with no coauthor prop at all", () => {
    const m = renderToStaticMarkup(
      <SlPane
        text="system X"
        errors={[]}
        onTextChange={noop}
        onErrors={noop}
        onCompiled={noop}
        onClose={noop}
        canvasModel={null}
      />,
    );
    expect(m).toContain("system X");
    expect(m).toContain("Compile");
    expect(m).not.toContain("Co-author");
  });

  it("still defaults to the SL (manual) view when coauthor is supplied", () => {
    const m = renderToStaticMarkup(
      <SlPane
        text="system Y"
        errors={[]}
        onTextChange={noop}
        onErrors={noop}
        onCompiled={noop}
        onClose={noop}
        canvasModel={null}
        coauthor={{ turns: [], onDraft: async () => {} }}
      />,
    );
    // Both the mode switch AND the manual textarea/Compile are present —
    // co-author is an added mode, not a replacement for hand-authoring.
    expect(m).toContain("Co-author");
    expect(m).toContain("system Y");
    expect(m).toContain("Compile");
  });
});
