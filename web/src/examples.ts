// The examples library, faceted by genus (#148). Two shapes merge into one
// list: the runnable demos (bundled model + CSV) and the structural examples
// (SL text that opens as a diagram). Both are `Demo`; `isRunnable` tells them
// apart. The list is DATA-DRIVEN: a new structural example is a `.sl` file
// dropped in assets/examples/ — it self-sorts into its genus with no code
// change, because the genus is parsed from the file's own `system` line.
import { DEMOS, type Demo } from "./demos";
import steelPlantWalk from "../../assets/walkthroughs/steel-plant/level-0.sl?raw";

const files = import.meta.glob("../../assets/examples/*.sl", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

/** Bunge's five genera of concrete systems (Treatise Vol. 4, Postulate 6.4),
 *  in the canonical order the gallery renders. A genus outside the five (should
 *  not happen — the parser reads Bunge's own vocabulary) lists after them. */
const GENUS_ORDER = ["Physical", "Chemical", "Biological", "Social", "Technical"];

const SYSTEM_RE = /^\s*system\s+"([^"]+)"\s*:\s*\w+\/(\w+)/;
const DOMAIN_RE = /^\s*domain\s+"([^"]+)"/;

/** Parse a structural example from its SL text. Title from `system "…"`, genus
 *  from the `: Kingdom/Genus` type (the part after `/`), blurb from `domain "…"`
 *  or, failing that, the first prose comment. No run bundle — it opens as a
 *  diagram. Exported for tests. */
export function parseExample(path: string, text: string): Demo {
  const lines = text.split("\n");
  let title = "";
  let genus = "";
  let domain = "";
  for (const line of lines) {
    const sys = SYSTEM_RE.exec(line);
    if (sys) {
      title = sys[1];
      genus = sys[2];
    }
    const dom = DOMAIN_RE.exec(line);
    if (dom) domain = dom[1];
  }
  const blurb = domain || firstComment(lines) || title;
  const key = `example:${path.slice(path.lastIndexOf("/") + 1).replace(/\.sl$/, "")}`;
  return { key, title, genus, blurb, sl: text };
}

/** The first prose comment line — the blurb fallback when a file has no
 *  `domain`. Skips box-drawing rules and empty comment markers. */
function firstComment(lines: string[]): string {
  for (const line of lines) {
    const m = /^\s*#\s?(.*)$/.exec(line);
    if (!m) continue;
    const body = m[1].replace(/[─—–|]/g, "").trim();
    if (body) return body;
  }
  return "";
}

const structural: Demo[] = Object.entries(files).map(([path, text]) => parseExample(path, text));

// The three-level steel-plant walk's entry level. It ships beside the two
// levels it opens onto (assets/walkthroughs/, where the kernel's
// steel_walkthrough gate holds the seams and the pinned child ids), not in
// assets/examples/ — so it is registered here by hand rather than by the glob,
// and that is the whole reason its title and blurb are written rather than
// parsed. The file's own `system` line names the editorial walkthrough; the
// gallery row has to say what opening it gets you, which is depth. It is the
// shelf's one steel plant: the corpus transcription of Fig. 4.14 stays in the
// corpus (cited, linted, Bunge-refused for the README's lesson) but off the
// shelf, and this card carries the citation for both.
const STEEL_PLANT_WALK: Demo = {
  key: "example:steel-plant-walk",
  title: "The Steel-Plant, three levels deep",
  genus: "Technical",
  blurb:
    "Mobus's ch. 4 procedure as a walkable hierarchy: the opaque SOI of Fig. 4.14, " +
    "its interior at Fig. 4.16, and Iron-Inventory's room at Fig. 4.17 — three models " +
    "joined by decomposition references whose seams the kernel checks. Zoom into a " +
    "decomposed component to see its interior in place, or double-click to enter it. " +
    "George Mobus, Systems Science: Theory, Analysis, Modeling, and Design (2022), Ch. 4 §4.5.",
  sl: steelPlantWalk,
};

/** An `.sl` file that also ships a run bundle lists once, as the runnable
 *  entry — the `.sl` stays its SOURCE (`sl_demos.rs` pins the bundled model
 *  to the projection of the `.sl`), the gallery just must not show the same
 *  system twice. */
const demoTitles = new Set(DEMOS.map((d) => d.title));

/** The merged library: runnable demos + structural examples, each carrying its
 *  genus. Order within the list is demos-first, then structural — the gallery
 *  regroups by genus, so this order only affects within-genus card order. */
export const EXAMPLES: Demo[] = [
  ...DEMOS,
  ...structural.filter((s) => !demoTitles.has(s.title)),
  STEEL_PLANT_WALK,
];

/** Group the library by genus in the canonical order, dropping empty genera.
 *  The shape the gallery renders (#148). */
export function groupedExamples(list: Demo[] = EXAMPLES): { genus: string; entries: Demo[] }[] {
  const byGenus = new Map<string, Demo[]>();
  for (const ex of list) {
    const bucket = byGenus.get(ex.genus);
    if (bucket) bucket.push(ex);
    else byGenus.set(ex.genus, [ex]);
  }
  const ordered: { genus: string; entries: Demo[] }[] = [];
  for (const g of GENUS_ORDER) {
    const entries = byGenus.get(g);
    if (entries) {
      ordered.push({ genus: g, entries });
      byGenus.delete(g);
    }
  }
  for (const g of [...byGenus.keys()].sort()) {
    ordered.push({ genus: g, entries: byGenus.get(g)! });
  }
  return ordered;
}
