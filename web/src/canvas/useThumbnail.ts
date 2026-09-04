// #311: compile a shipped model's SL just far enough to draw its thumbnail.
//
// The library holds SL TEXT, not a compiled model, so a thumbnail needs the
// kernel. Two properties make that affordable:
//
//   - MEMOISED per key, module-level. Thirty rows scrolling in and out of view
//     compile each model at most once for the life of the page.
//   - DEFERRED to an effect, so the first paint of the library is never blocked
//     on wasm. A row renders its folio numeral and swaps in the drawing.
//
// A compile failure is not surfaced: a model that will not compile has no shape
// to show, the row keeps its numeral, and the real complaint about it belongs on
// the canvas that opens it, not in a 40px gutter.
import { useEffect, useState } from "react";
import { compileSl, openModel } from "../kernel";
import type { CanvasModel } from "../kernel/types";

const cache = new Map<string, CanvasModel | null>();

/** The same deferred, memoised read for a SAVED model, whose shape lives in a
 *  stored archive rather than in SL text. A hand-imported or legacy record that
 *  the decoder refuses draws nothing, exactly as an SL that will not compile
 *  draws nothing. */
export function useThumbnailModel(
  key: string,
  source: string | undefined,
  kind: "sl" | "archive" = "sl",
): CanvasModel | null {
  const [model, setModel] = useState<CanvasModel | null>(() => cache.get(key) ?? null);

  useEffect(() => {
    if (!source) return;
    const hit = cache.get(key);
    if (hit !== undefined) {
      setModel(hit);
      return;
    }
    let live = true;
    // A macrotask, not just an effect: this yields the frame that paints the
    // list before any wasm runs.
    const id = setTimeout(() => {
      let out: CanvasModel | null = null;
      try {
        if (kind === "archive") out = openModel(source);
        else {
          const res = compileSl(source);
          out = "ok" in res ? res.ok : null;
        }
      } catch {
        out = null;
      }
      cache.set(key, out);
      if (live) setModel(out);
    }, 0);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [key, source, kind]);

  return model;
}
