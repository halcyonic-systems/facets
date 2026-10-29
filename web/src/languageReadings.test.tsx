// Every model reading on the front door's language figure is one real path
// through its model: each name is declared with the keyword the figure shows,
// and each of the four flows exists in the SL with the name and kind drawn.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LANGUAGE_READINGS, MODEL_READINGS, type FlowKind } from "./languageReadings";
import { LanguageFigure, LanguagePanel, wrapName } from "./LanguageFigure";
import { featured } from "./home";

const NAME = String.raw`(?:"([^"]+)"|(\S+))`;
const pick = (m: RegExpMatchArray, i: number) => m[i] ?? m[i + 1];

/** The declarations and flows of one SL file, read just far enough to check
 *  a reading: keyword per name, and flows as from, to, kind, name. */
function readSl(model: string) {
  const src = fs.readFileSync(path.resolve(__dirname, `../../assets/examples/${model}.sl`), "utf8");
  const declared = new Map<string, string>();
  let system = "";
  for (const line of src.split("\n")) {
    const sys = line.match(new RegExp(`^system ${NAME}`));
    if (sys) system = pick(sys, 1);
    const d = line.match(new RegExp(`^(source|sink|environment|component|interface) ${NAME}`));
    if (d) declared.set(pick(d, 2), d[1]);
  }
  const flows: { from: string; to: string; kind: FlowKind; name: string }[] = [];
  for (const m of src.matchAll(new RegExp(`^flow ${NAME} -> ${NAME} : (matter|energy|informational) "([^"]+)"`, "gm"))) {
    flows.push({ from: pick(m, 1), to: pick(m, 3), kind: m[5] as FlowKind, name: m[6] });
  }
  return { system, declared, flows };
}

describe("the language figure's model readings", () => {
  for (const r of MODEL_READINGS) {
    describe(r.tab, () => {
      const sl = readSl(r.model!);

      it("names the model's system", () => {
        expect(sl.system).toBe(r.system);
      });

      it("declares every name with the keyword the figure shows", () => {
        expect(sl.declared.get(r.start.name)).toBe(r.start.keyword);
        expect(sl.declared.get(r.inPort)).toBe("interface");
        expect(sl.declared.get(r.component)).toBe("component");
        expect(sl.declared.get(r.outPort)).toBe("interface");
        expect(sl.declared.get(r.end.name)).toBe(r.end.keyword);
      });

      it("draws four flows the model declares, with their names and kinds", () => {
        const has = (from: string, to: string, f: { name: string; kind: FlowKind }) =>
          sl.flows.some((x) => x.from === from && x.to === to && x.name === f.name && x.kind === f.kind);
        expect(has(r.start.name, r.inPort, r.flowIn)).toBe(true);
        expect(has(r.inPort, r.component, r.flowIn)).toBe(true);
        expect(has(r.component, r.outPort, r.flowOut)).toBe(true);
        expect(has(r.outPort, r.end.name, r.flowOut)).toBe(true);
      });

      it("is a model the front door can open", () => {
        expect(featured().some((m) => m.key === r.model || m.key === `example:${r.model}`)).toBe(true);
      });
    });
  }
});

describe("the language figure", () => {
  it("draws every name of every reading, and each name's keyword", () => {
    for (const r of LANGUAGE_READINGS) {
      const svg = renderToStaticMarkup(<LanguageFigure reading={r} />);
      for (const name of [r.system, r.start.name, r.inPort, r.component, r.outPort, r.end.name, r.flowIn.name, r.flowOut.name]) {
        for (const part of wrapName(name, name === r.system ? 40 : 12)) expect(svg).toContain(part);
      }
      for (const k of [r.start.keyword, r.end.keyword, "interface", "component", "system", "flow", r.flowIn.kind, r.flowOut.kind]) {
        expect(svg).toContain(`>${k}<`);
      }
    }
  });

  it("breaks a long name at the space nearest its middle, and leaves a short one whole", () => {
    expect(wrapName("Bitcoin")).toEqual(["Bitcoin"]);
    expect(wrapName("interest on reserves")).toEqual(["interest on", "reserves"]);
    expect(wrapName("LLM Serving Market", 40)).toEqual(["LLM Serving Market"]);
  });

  it("opens on the language's own words, with a switch for each reading", () => {
    const html = renderToStaticMarkup(<LanguagePanel onOpenModel={() => {}} />);
    for (const r of LANGUAGE_READINGS) expect(html).toContain(`>${r.tab}<`);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("A source sends a flow across an interface");
    // the generic reading opens no model
    expect(html).not.toContain("Open the ");
  });
});
