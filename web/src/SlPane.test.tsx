// #10: the SL pane's manual-authoring surface is the base surface and must
// never be gated behind the co-author — it renders whether or not `coauthor`
// is supplied, and stays the default view even when the mode switch is
// present. Static-markup checks (no DOM events, so mode-switch clicking is
// exercised live — see the PR's manual verification note). The editor is a
// CodeMirror host mounted in an effect (#353 Tier 2), so static markup shows
// its host div, not the text; the text is asserted at the pure-module level
// (sl/mode.test.ts, sl/sync.test.ts).
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
    expect(m).toContain("sl-editor");
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
        coauthor={{ turns: [], onDraft: async () => {}, onCorrect: async () => {} }}
      />,
    );
    // Both the mode switch AND the manual editor/Compile are present —
    // co-author is an added mode, not a replacement for hand-authoring.
    expect(m).toContain("Co-author");
    expect(m).toContain("sl-editor");
    expect(m).toContain("Compile");
  });

  // The compile chain is an addition beside the authoring surface, on the same
  // terms as the co-author mode: absent without the prop, and never replacing
  // the textarea when present.
  it("shows the compile chain only when the parent supplies the kernel outputs", () => {
    const base = {
      text: "system Z",
      errors: [],
      onTextChange: noop,
      onErrors: noop,
      onCompiled: noop,
      onClose: noop,
      canvasModel: null,
    };
    expect(renderToStaticMarkup(<SlPane {...base} />)).not.toContain("the compile chain");
    const withChain = renderToStaticMarkup(
      <SlPane {...base} chain={{ desc: null, verdict: null, onShowFormal: noop }} />,
    );
    expect(withChain).toContain("the compile chain");
    expect(withChain).toContain("Compile");
  });
});
