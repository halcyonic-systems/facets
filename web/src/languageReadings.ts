// The front door's language figure, read as any system and as each model on
// the public shelf (the entry pass, 2026-10-27).
//
// The figure is one fixed shape: something outside sends a flow across an
// interface to a component inside the system, and a flow leaves across a
// second interface to something outside again. A READING puts names on that
// shape. The generic reading names the language's own words; a model's reading
// names one real path through that model, every name and flow as its SL
// declares them, so switching readings shows a model's words landing on the
// same shapes as any system's.
//
// To show another model: add a reading below whose `model` is the file name in
// assets/examples (and a key `featured()` can open), then run the tests.
// languageReadings.test.ts checks every name, keyword, flow name and kind
// against the model's SL, so a reading cannot drift from its model.

export type FlowKind = "matter" | "energy" | "informational";

/** A flow on the figure: its name as the SL declares it, and its kind. */
export interface ReadingFlow {
  name: string;
  kind: FlowKind;
}

export interface LanguageReading {
  id: string;
  /** The switch's label. */
  tab: string;
  /** The model's file name in assets/examples, or null for the generic reading. */
  model: string | null;
  system: string;
  /** Outside, where the path starts: a source, or an environment object. */
  start: { name: string; keyword: "source" | "environment" };
  inPort: string;
  component: string;
  outPort: string;
  /** Outside, where the path ends: a sink, or an environment object. */
  end: { name: string; keyword: "sink" | "environment" };
  flowIn: ReadingFlow;
  flowOut: ReadingFlow;
}

export const GENERIC_READING: LanguageReading = {
  id: "any",
  tab: "Any system",
  model: null,
  system: "System",
  start: { name: "Source", keyword: "source" },
  inPort: "Interface",
  component: "Component",
  outPort: "Interface",
  end: { name: "Sink", keyword: "sink" },
  flowIn: { name: "Flow", kind: "matter" },
  flowOut: { name: "Flow", kind: "informational" },
};

/** One path through each public model, in the order the shelf carries them
 *  (home.ts FEATURED). */
export const MODEL_READINGS: LanguageReading[] = [
  {
    id: "llm-market",
    tab: "LLM market",
    model: "llm-market",
    system: "LLM Serving Market",
    start: { name: "Self-hosted demand", keyword: "source" },
    inPort: "Self-hosting",
    component: "Open-weight serving",
    outPort: "Serving endpoint",
    end: { name: "Customers", keyword: "sink" },
    flowIn: { name: "self-hosted workload", kind: "energy" },
    flowOut: { name: "tokens served", kind: "informational" },
  },
  {
    id: "federal-reserve",
    tab: "Federal Reserve",
    model: "federal-reserve",
    system: "Federal Reserve",
    start: { name: "U.S. Treasury", keyword: "environment" },
    inPort: "Treasury Account",
    component: "Balance Sheet",
    outPort: "Reserve Accounts",
    end: { name: "Banking System", keyword: "environment" },
    flowIn: { name: "TGA deposits", kind: "matter" },
    flowOut: { name: "interest on reserves", kind: "matter" },
  },
  {
    id: "bitcoin",
    tab: "Bitcoin",
    model: "bitcoin",
    system: "Bitcoin",
    start: { name: "Energy Market", keyword: "source" },
    inPort: "Power Connection",
    component: "Mining",
    outPort: "Exchange Link",
    end: { name: "Asset Market", keyword: "environment" },
    flowIn: { name: "electricity burned", kind: "energy" },
    flowOut: { name: "coins sold", kind: "matter" },
  },
];

export const LANGUAGE_READINGS: LanguageReading[] = [GENERIC_READING, ...MODEL_READINGS];
