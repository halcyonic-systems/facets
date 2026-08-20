// The bands, made visible: a hairline over each band's first line and the
// band's name in a margin gutter beside it. Pure detection lives in
// bands.ts; this file only paints what bandStarts reports, so the visuals
// can never disagree with the text (every mark is DERIVED, nothing stored).
import type { EditorState, Text } from "@codemirror/state";
import { RangeSetBuilder } from "@codemirror/state";
import type { DecorationSet, ViewUpdate } from "@codemirror/view";
import { Decoration, EditorView, GutterMarker, ViewPlugin, gutter } from "@codemirror/view";
import type { Band } from "./bands";
import { bandStarts } from "./bands";

// One starts-map per document value; the WeakMap makes recomputation an
// identity check instead of a re-lex on every gutter query.
const cache = new WeakMap<Text, Map<number, Band>>();

function startsMap(doc: Text): Map<number, Band> {
  const hit = cache.get(doc);
  if (hit) return hit;
  const lines: string[] = [];
  for (let n = 1; n <= doc.lines; n++) lines.push(doc.line(n).text);
  const map = new Map<number, Band>();
  for (const s of bandStarts(lines)) map.set(s.line, s.band);
  cache.set(doc, map);
  return map;
}

const bandStartLine = Decoration.line({ class: "sl-band-start" });

const bandDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view.state);
    }
    update(u: ViewUpdate) {
      if (u.docChanged) this.decorations = this.build(u.state);
    }
    build(state: EditorState): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      for (const line of startsMap(state.doc).keys()) {
        // The very first band needs no separator over it.
        if (line > 1) builder.add(state.doc.line(line).from, state.doc.line(line).from, bandStartLine);
      }
      return builder.finish();
    }
  },
  { decorations: (v) => v.decorations }
);

class BandLabel extends GutterMarker {
  constructor(readonly band: Band) {
    super();
  }
  override eq(other: BandLabel) {
    return other.band === this.band;
  }
  override toDOM() {
    const el = document.createElement("span");
    el.className = "sl-band-label";
    el.textContent = this.band;
    return el;
  }
}

const bandGutter = gutter({
  class: "sl-band-gutter",
  lineMarker(view, block) {
    const line = view.state.doc.lineAt(block.from);
    const band = startsMap(view.state.doc).get(line.number);
    return band ? new BandLabel(band) : null;
  },
  lineMarkerChange: (u) => u.docChanged,
});

export const bandExtension = [bandDecorations, bandGutter];
