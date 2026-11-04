// The inputs rail's engine floor (#463 move 3): every engine field a
// component line declares and no `param` names gets a row under the
// component; a field a param already covers does not appear twice; the
// primitive's own knob takes the kernel palette's label.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ElementSettings, RunInputs, applyKnob, engineRows, knobSliderRange } from "./RunInputs";
import type { CanvasModel, EngineKnob, FlowKnob, Thing } from "./kernel/types";

const barrel = {
  id: 2,
  name: "Barrel",
  role: "Component",
  primitive: "Buffering",
  stock_unit: "L",
  initial_state: { storage: 60 },
  cognitive_params: { release_rate: 12, capacity: 200 },
} as unknown as Thing;
const amp = { id: 3, name: "Amp", role: "Component", primitive: "Amplifying", agency_capacity: 2 } as unknown as Thing;
const gate = { id: 4, name: "Gate", role: "Component", passway: true, interface: true } as unknown as Thing;

const model = {
  name: "m",
  lens: "Mobus",
  things: [barrel, amp, gate],
  relations: [],
  params: [{ name: "drain", anchor: { Field: { thing: 2, field: "release_rate" } }, range: { min: "0", max: "40" } }],
} as unknown as CanvasModel;

describe("engine floor", () => {
  it("lists declared engine fields not already named by a param", () => {
    const rows = engineRows(barrel, new Set(["release_rate"]));
    expect(rows.map((r) => [r.key, r.label, r.value])).toEqual([
      ["initial_storage", "initial stock", 60],
      ["capacity", "capacity", 200],
    ]);
    expect(rows[1].put(250).cognitive_params).toEqual({ release_rate: 12, capacity: 250 });
    expect(rows[0].put(10).initial_state).toEqual({ storage: 10 });
  });

  it("labels the primitive's own knob from the palette and skips pass-ways", () => {
    expect(engineRows(amp, new Set(), { Amplifying: "gain" })[0]).toMatchObject({ key: "param", label: "gain", value: 2 });
    expect(engineRows(amp, new Set())[0].label).toBe("parameter");
    expect(engineRows(gate, new Set())).toEqual([]);
  });

  it("renders a group per component with the declared param kept to its own row", () => {
    const html = renderToStaticMarkup(
      <RunInputs model={model} manifest={null} onEdit={() => {}} onEditThing={() => {}} engineLabels={{ Amplifying: "gain" }} />,
    );
    expect(html).toContain("field-param-drain");
    expect(html).toContain("Barrel · engine");
    expect(html).toContain("initial stock");
    expect(html).toContain("Amp · engine");
    expect(html).toContain("gain");
    expect(html).not.toContain("Gate · engine");
    // No duplicate: the barrel's release is the param's row, not an engine row.
    expect(html.match(/aria-label="release"/g)).toBeNull();
  });

  it("shows a knob a command-form agent drives as set by the agent, with no slider (ADR 0008 D1)", () => {
    const fish = { id: 5, name: "Fish", role: "Component", primitive: "Buffering" } as unknown as Thing;
    const landing = { id: 6, name: "Landing", role: "Component", passway: true, interface: true } as unknown as Thing;
    const back = { id: 7, name: "Return", role: "Component", primitive: "Combining" } as unknown as Thing;
    const quota = {
      id: 8,
      name: "Quota",
      role: "Component",
      rule: "threshold",
      manages_param: "landed share",
      cognitive_params: { above: 0.3, emit: 1, else: 0 },
    } as unknown as Thing;
    const split = {
      name: "m",
      lens: "Mobus",
      things: [fish, landing, back, quota],
      relations: [
        { id: 20, a: 5, b: 6, name: "landed", is_bond: true, kind: "Matter", amount: "0" },
        { id: 21, a: 5, b: 7, name: "released", is_bond: true, kind: "Matter", amount: "1" },
      ],
      params: [{ name: "landed share", anchor: { Shares: { thing: 5 } } }],
    } as unknown as CanvasModel;
    const html = renderToStaticMarkup(<RunInputs model={split} manifest={null} onEdit={() => {}} />);
    expect(html).toContain("landed share · % of split");
    expect(html.match(/set by “Quota”/g)?.length).toBe(2);
    expect(html).not.toContain('aria-label="share of Landing"');
  });
});

// 2026-11-02 walk: a model drawn on the canvas (environment object → process →
// environment object, no amounts typed) showed no inputs at all. The drawn
// objects are neutral, so only the kernel's source set says which one emits.
describe("drivers of a drawn model", () => {
  const drawn = {
    name: "m",
    lens: "Mobus",
    things: [
      { id: 1, name: "E5", role: "Environment", env_kind: "Neutral" },
      { id: 2, name: "T1", role: "Component", primitive: "Buffering" },
      { id: 3, name: "E6", role: "Environment", env_kind: "Neutral" },
    ],
    relations: [
      { id: 10, a: 1, b: 2, is_bond: true, kind: "Matter", name: "" },
      { id: 11, a: 2, b: 3, is_bond: true, kind: "Matter", name: "" },
    ],
    params: [],
  } as unknown as CanvasModel;

  it("lists a source's unset flow as an empty field, named by where it goes", () => {
    const html = renderToStaticMarkup(
      <RunInputs model={drawn} manifest={null} onEdit={() => {}} sourceIds={[1]} />,
    );
    expect(html).toContain("drivers · absolute rates");
    expect(html).toContain("E5 · to T1");
    expect(html).toContain('placeholder="not set"');
    // The flow into the sink is not a driver.
    expect(html).not.toContain("E6 ·");
  });

  it("lists nothing without the kernel's word, as before, for a neutral thing", () => {
    const html = renderToStaticMarkup(<RunInputs model={drawn} manifest={null} onEdit={() => {}} />);
    expect(html).toBe("");
  });
});

// Decision 2 (2026-11-02): every knob shown at the value the run uses; moving
// it declares, clearing it withdraws the declaration.
describe("knobs at their defaults", () => {
  const tank = { id: 2, name: "T1", role: "Component", primitive: "Buffering" } as unknown as Thing;

  it("declares a field on a number and withdraws it on empty", () => {
    const set = applyKnob(tank, "release_rate", 4)!;
    expect(set.cognitive_params).toEqual({ release_rate: 4 });
    expect(applyKnob(set, "release_rate", null)!.cognitive_params).toEqual({});
  });

  it("refuses what SL refuses: a non-positive release, a negative level", () => {
    expect(applyKnob(tank, "release_rate", 0)).toBeNull();
    expect(applyKnob(tank, "initial_storage", -1, "L")).toBeNull();
  });

  it("writes a starting level only with a unit, and sets the unit with it", () => {
    expect(applyKnob(tank, "initial_storage", 5)).toBeNull();
    const filled = applyKnob(tank, "initial_storage", 5, "L")!;
    expect(filled.stock_unit).toBe("L");
    expect(filled.initial_state).toEqual({ storage: 5 });
    // A thing that has a unit keeps it.
    const litres = { ...tank, stock_unit: "L" } as Thing;
    expect(applyKnob(litres, "initial_storage", 0)!.initial_state).toEqual({ storage: 0 });
  });

  it("puts a sensor's gain on its own parameter", () => {
    const sensor = { ...tank, primitive: "Sensing" } as Thing;
    expect(applyKnob(sensor, "gain", 2)!.agency_capacity).toBe(2);
  });

  // Walk row 18: a process's own parameter is written through the kernel's
  // map, so the face never holds it, and refused outside the word's range.
  it("writes an own parameter through the kernel's map and its range", () => {
    const choke = { ...tank, primitive: "Impeding" } as Thing;
    const impedance = { offset: 1, scale: -1, max_param: 1, range: "at least 0 and less than 1" };
    expect(applyKnob(choke, "impedance", 0.25, undefined, impedance)!.agency_capacity).toBe(0.75);
    expect(applyKnob(choke, "impedance", 0, undefined, impedance)!.agency_capacity).toBe(1);
    expect(applyKnob(choke, "impedance", 1, undefined, impedance)).toBeNull();
    expect(applyKnob(choke, "impedance", -0.1, undefined, impedance)).toBeNull();
    const horn = { ...tank, primitive: "Amplifying", agency_capacity: 0.5 } as Thing;
    const gain = { offset: 1, scale: 9, max_param: null, range: "greater than 1" };
    expect(applyKnob(horn, "gain", 10, undefined, gain)!.agency_capacity).toBe(1);
    expect(applyKnob(horn, "gain", 1, undefined, gain)).toBeNull();
    expect(applyKnob(horn, "gain", null, undefined, gain)!.agency_capacity).toBeUndefined();
  });

  it("shows an unset knob as an empty field over its default, marked default", () => {
    const model = { name: "m", lens: "Mobus", things: [tank], relations: [], params: [] } as unknown as CanvasModel;
    const knobs: EngineKnob[] = [
      { thing: 2, field: "release_rate", word: "release", value: 1, declared: false },
      { thing: 2, field: "capacity", word: "capacity", value: null, declared: false },
      { thing: 2, field: "initial_storage", word: "starting level", value: 0, declared: false, needs_unit: "" },
    ];
    const html = renderToStaticMarkup(
      <RunInputs model={model} manifest={null} onEdit={() => {}} onEditThing={() => {}} knobs={knobs} />,
    );
    expect(html).toContain("T1 · engine");
    expect(html).toContain('placeholder="1 default"');
    expect(html).toContain('placeholder="none"');
    expect(html).toContain('placeholder="unit"');
    expect(html).toContain(">default<");
  });
});

// Walk row 13: a model whose only inflow is a signal runs empty; say why.
describe("a signal-only inflow", () => {
  const signal = {
    name: "m",
    lens: "Mobus",
    things: [
      { id: 1, name: "E5", role: "Environment", env_kind: "Neutral" },
      { id: 2, name: "T1", role: "Component", primitive: "Buffering" },
      { id: 3, name: "E6", role: "Environment", env_kind: "Neutral" },
    ],
    relations: [
      { id: 10, a: 1, b: 2, is_bond: true, kind: "Informational", name: "" },
      { id: 11, a: 2, b: 3, is_bond: true, kind: "Matter", name: "" },
    ],
    params: [],
  } as unknown as CanvasModel;

  it("says nothing material enters", () => {
    const html = renderToStaticMarkup(<RunInputs model={signal} manifest={null} onEdit={() => {}} sourceIds={[1]} />);
    expect(html).toContain("Nothing material enters the system");
  });

  it("stays quiet once a material flow comes in", () => {
    const fed = {
      ...signal,
      relations: [...signal.relations, { id: 12, a: 1, b: 2, is_bond: true, kind: "Matter", name: "feed" }],
    } as unknown as CanvasModel;
    const html = renderToStaticMarkup(<RunInputs model={fed} manifest={null} onEdit={() => {}} sourceIds={[1]} />);
    expect(html).not.toContain("Nothing material enters");
  });
});

/** The 2026-11-02 walk, rows 21, 22 and 24: a thing's settings in the
 *  inspector, every number from the kernel's knobs. */
describe("a thing's own settings", () => {
  const src = { id: 1, name: "E5", role: "Environment" } as unknown as Thing;
  const split = { id: 2, name: "T2", role: "Component", primitive: "Splitting" } as unknown as Thing;
  const tank = { id: 3, name: "T1", role: "Component", primitive: "Buffering" } as unknown as Thing;
  const out = { id: 4, name: "E6", role: "Environment" } as unknown as Thing;
  const flow = (id: number, a: number, b: number, amount?: string) =>
    ({ id, a, b, name: "", kind: "Matter", is_bond: true, ample: false, ...(amount ? { amount } : {}) }) as unknown as CanvasModel["relations"][number];
  const m = (relations: CanvasModel["relations"]) =>
    ({ name: "m", lens: "Mobus", things: [src, split, tank, out], relations }) as unknown as CanvasModel;
  const fk = (relation: number, value: number, declared = false): FlowKnob => ({ relation, value, declared });
  const render = (thing: Thing, model: CanvasModel, flowKnobs: FlowKnob[], knobs: EngineKnob[] = []) =>
    renderToStaticMarkup(
      <ElementSettings
        thing={thing}
        model={model}
        manifest={null}
        knobs={knobs}
        flowKnobs={flowKnobs}
        sourceIds={[1]}
        onEdit={() => {}}
        onEditThing={() => {}}
      />,
    );

  it("shows a source's undeclared rate at what it runs at, not 'not set'", () => {
    const html = render(src, m([flow(10, 1, 2)]), [fk(10, 1)]);
    expect(html).toContain("sends, per tick");
    expect(html).toContain('placeholder="1 default"');
    expect(html).not.toContain("not set");
  });

  it("says a splitter with one way out has nothing to split", () => {
    const html = render(split, m([flow(10, 1, 2), flow(11, 2, 3)]), [fk(10, 1), fk(11, 1)]);
    expect(html).toContain("nothing-to-split");
  });

  it("divides a splitter's output by weight, defaults counted at what they run at", () => {
    const html = render(split, m([flow(11, 2, 3, "3"), flow(12, 2, 4)]), [fk(11, 3, true), fk(12, 1)]);
    expect(html).toContain("how its output divides");
    expect(html).toContain("75%");
    expect(html).toContain("25%");
    expect(html).not.toContain("nothing-to-split");
  });

  it("puts a stock's knobs on the stock", () => {
    const knob: EngineKnob = { thing: 3, field: "release_rate", word: "release", value: 1, declared: false };
    const html = render(tank, m([]), [], [knob]);
    expect(html).toContain('data-knob="release_rate"');
    expect(html).toContain('placeholder="1 default"');
  });

  it("says nothing for a sink with nothing to set", () => {
    expect(render(out, m([flow(10, 3, 4)]), [fk(10, 1)])).toBe("");
  });
});

// SL v1.16: a param naming a process's own parameter is a slider in the run
// inputs, in its word's terms, read off the kernel's knob for that thing; the
// knob row it covers is not shown twice.
describe("an own-parameter param", () => {
  const stage = { id: 7, name: "Stage", role: "Component", primitive: "Amplifying", agency_capacity: 4 / 9 } as unknown as Thing;
  const own = { offset: 1, scale: 9, max_param: null, range: "greater than 1" };
  const knobs: EngineKnob[] = [{ thing: 7, field: "gain", word: "gain", value: 5, declared: true, own }];
  const ownModel = {
    name: "m",
    lens: "Mobus",
    things: [stage],
    relations: [],
    params: [{ name: "stage gain", anchor: { Own: { thing: 7 } }, range: { min: "1.1", max: "30" } }],
  } as unknown as CanvasModel;

  it("renders as a slider over the kernel's value, once", () => {
    const html = renderToStaticMarkup(
      <RunInputs model={ownModel} manifest={null} onEdit={() => {}} onEditThing={() => {}} knobs={knobs} />,
    );
    expect(html).toContain("own-param-stage gain");
    expect(html).toContain('aria-label="stage gain slider"');
    expect(html).toContain('min="1.1"');
    expect(html).toContain('max="30"');
    expect(html).toContain('value="5"');
    expect(html).not.toContain('data-knob="gain"');
  });

  it("renders on the thing's own settings too", () => {
    const html = renderToStaticMarkup(
      <ElementSettings
        thing={stage}
        model={ownModel}
        manifest={null}
        knobs={knobs}
        flowKnobs={[]}
        onEdit={() => {}}
        onEditThing={() => {}}
      />,
    );
    expect(html).toContain("own-param-stage gain");
    expect(html).not.toContain('data-knob="gain"');
  });

  it("renders nothing without the kernel's knob (no circuit, no map)", () => {
    const html = renderToStaticMarkup(
      <RunInputs model={ownModel} manifest={null} onEdit={() => {}} onEditThing={() => {}} knobs={[]} />,
    );
    expect(html).not.toContain("own-param-");
  });
});


// 2026-11-04 toy walk: every engine knob with a value gets a slider.
describe("knob sliders", () => {
  const imp = { offset: 1, scale: -1, max_param: 1, range: "at least 0 and less than 1" };
  const eff = { offset: 0, scale: 1, max_param: 1, range: "greater than 0 and at most 1" };
  const amp = { offset: 1, scale: 9, max_param: null, range: "greater than 1" };
  it("a word the kernel bounds slides over its legal range, excluded ends held in", () => {
    expect(knobSliderRange({ field: "impedance", own: imp }, 0.25)).toEqual({ min: 0, max: 0.995, step: 0.005 });
    expect(knobSliderRange({ field: "efficiency", own: eff }, 0.9)).toEqual({ min: 0.005, max: 1, step: 0.005 });
  });
  it("an unbounded knob slides from its floor to twice its value", () => {
    expect(knobSliderRange({ field: "capacity" }, 400)).toEqual({ min: 1, max: 800, step: 1 });
    expect(knobSliderRange({ field: "initial_storage" }, 100)).toEqual({ min: 0, max: 200, step: 1 });
    // An amplifier's gain floor is 1, never reached.
    const g = knobSliderRange({ field: "gain", own: amp }, 5)!;
    expect(g.max).toBe(9);
    expect(g.min).toBeGreaterThan(1);
  });
  it("a knob off by default has no slider until it has a value", () => {
    expect(knobSliderRange({ field: "capacity" }, null)).toBeNull();
  });
});

describe("knob markers on the story chart (walk row 52)", () => {
  it("marks the author's turns inside the run, one label per tick, never an agent's", async () => {
    const { knobMarks } = await import("./RunPanel");
    const human = { kind: "human" } as const;
    const marks = knobMarks(
      [
        { tick: 76, target: "Pond", field: "impedance", value: 0.9, by: human },
        { tick: 76, target: "Stream -> Pond : brook", field: "amount", value: 50, by: human },
        { tick: 5, target: "Valve", field: "param", value: 1, by: { kind: "agent", name: "Manager" } },
        { tick: 0, target: "Pond", field: "impedance", value: 0.5, by: human },
      ],
      192,
    );
    expect(marks).toEqual([{ tick: 76, label: "impedance 0.9, brook 50" }]);
  });
});
