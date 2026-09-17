// #10: the resident co-author's shared drafter binding. One draft→retry loop,
// two surfaces — the SL pane's inline "Draft" affordance (one-shot, #10
// spike/Rung 1) and the resident Co-author dock (this issue, a persistent
// history of turns). Neither surface talks to GSR or the kernel directly;
// both call this. No new LLM plumbing — `authorSl` (GSR /author-sl) and
// `compile_sl` (kernel, deterministic) already exist.
import { authorSl } from "./gsr";
import { compileSl, emitSl, validateMode } from "./kernel";
import type { CanvasModel, Lens, SlError, VerdictFields } from "./kernel/types";
import { MODE_BY_LENS, findingsPhrase } from "./review";
import { effortOnWire, type DraftEffort } from "./draftEffort";

/** One draft attempt, kept for the resident dock's history. `previewing` means
 *  the compiled draft is (or was) the active canvas preview; `accepted` /
 *  `discarded` mirror the human-checks-meaning gate's outcome once the author
 *  resolves it. A turn that never compiled stays `compile-error` /
 *  `network-error` and is never silently dropped. */
export type CoauthorTurn = {
  id: string;
  description: string;
  sl: string;
  at: string;
  status: "previewing" | "accepted" | "discarded" | "compile-error" | "network-error";
  errorText?: string;
  /** The model that ACTUALLY answered, as the reasoner reported it on the
   *  response. Never the one that was asked for — those differ whenever the
   *  reasoner cannot reach the requested model, and the whole point of
   *  recording it is that a demo transcript stays readable afterwards. */
  model?: string;
  /** What was asked for ("" = the reasoner's own default), kept beside it so
   *  the difference is visible rather than inferred. */
  requestedModel?: string;
  /** Total model time for this turn, from the reasoner's own `latency_ms`,
   *  summed over every ask the turn made. Absent when the reasoner reported
   *  none, and absent on turns recorded before it was carried. */
  modelMs?: number;
  /** How many asks that total covers. */
  modelCalls?: number;
  /** Careful or Fast, as asked (draftEffort.ts). Recorded only when the
   *  requested drafter takes the setting; absent otherwise, and on turns
   *  recorded before it existed. */
  effort?: DraftEffort;
  /** The effort the answering call RAN under, from the reasoner's response:
   *  `"low"`, or null for the drafter's own default. Absent when the reasoner
   *  did not say, which is unknown and is shown as nothing. */
  effortRan?: string | null;
  /** The reasoner was asked for an effort and the drafter did not take it. */
  effortDropped?: boolean;
  /** #314. `"draft"` (or absent, on turns recorded before corrections existed)
   *  is a first draft from a description. `"correction"` is the author telling
   *  the drafter what is wrong with an existing draft and getting a revision.
   *  The two run the SAME path — ask, compile, preview, accept or discard —
   *  and the kernel judges both the same way. */
  kind?: "draft" | "correction" | "interior";
  /** Correction turns: the correction as the author wrote it. Kept separate
   *  from `description` so the transcript can show the original ask and the
   *  correction as two different things, which is what makes a re-read
   *  legible weeks later. */
  correction?: string;
  /** Correction turns: the id of the turn whose SL was being corrected. */
  correctsTurnId?: string;
  /** The named repairs applied to the drafter's text, one line each — today
   *  only the `interface` stamp derived from a crossing flow
   *  (`stampInterfacesFromCrossings`; interior turns since #377 M3, every
   *  turn since #399). Kept so the transcript and the ledger show what the
   *  drafter did NOT do. */
  repairs?: string[];
  /** Correction turns: the SL that went IN, so the record holds both sides of
   *  the change rather than only the result. */
  slBefore?: string;
  /** Correction turns: what the kernel said about the model being corrected,
   *  at the moment the correction was asked. Kernel-sourced, rendered to
   *  plain text, never edited — it is shown in the transcript so a later
   *  reader knows what the drafter was looking at. Absent when the model on
   *  the canvas was not this turn's SL, in which case the drafter saw the SL
   *  alone and the transcript says so. */
  priorFindings?: string;
};

export function newTurnId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// History persists across reloads (localStorage) — no cap.
//
// #325 DEMOTED this store rather than retiring it, and the distinction matters.
// The SL, description, model and timing are the ledger's (GSR #40) and are read
// from there; `status` moved to the ledger too, because the accept/discard
// verdict is the one field worth durable storage and it used to die with the
// browser profile. What CANNOT move stays here, because no server can know it:
//
//   - a `network-error` turn never reached GSR, so there is no row to attach to
//   - `requestedModel` is what was ASKED for; the ledger records what answered
//   - `modelCalls` counts retries inside one turn; GSR sees N unrelated rows
//   - the correction linkage (`slBefore`, `correctsTurnId`, `priorFindings`)
//     has no server-side edge, and `priorFindings` is a kernel verdict computed
//     in the browser
//
// So this is an OVERLAY of client-only facts, not a duplicate of the ledger.
const TURNS_KEY = "bert-lenses.coauthor-turns";

export function loadCoauthorTurns(): CoauthorTurn[] {
  try {
    const raw = localStorage.getItem(TURNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CoauthorTurn[]) : [];
  } catch {
    return [];
  }
}

export function saveCoauthorTurns(turns: CoauthorTurn[]): void {
  try {
    localStorage.setItem(TURNS_KEY, JSON.stringify(turns));
  } catch {
    // storage unavailable (private mode, quota) — history stays session-only
  }
}

/** What a draft or correction ask came to, as the pane needs to know it.
 *  `produced` is true when there is SL text to look at, compiled or faulty.
 *  When the drafter could not be reached there is none: the failed turn in
 *  the history says why, and the pane stays on the tab that shows it. */
export type DraftOutcome = { produced: boolean };

/** A description handed to the co-author tab from outside it (the start
 *  surface). `nonce` tells one hand-off from the next, so the same words sent
 *  twice are still two asks. */
export type CoauthorSeed = { description: string; nonce: number };

/** Which turns the pane shows before anyone opens the history. Turns arrive
 *  newest first. The newest stays in view unless it was discarded: a failed
 *  turn's fault text is the only record of that failure, and the draft just
 *  made is the one a correction is aimed at. A previewing turn and the turn
 *  being corrected stay in view whatever their age. The rest wait behind the
 *  history toggle, and discarded ones behind a second toggle inside it. */
export function splitHistory(
  turns: readonly CoauthorTurn[],
  correctingId: string | null,
): { current: CoauthorTurn[]; past: CoauthorTurn[]; discarded: CoauthorTurn[] } {
  const current: CoauthorTurn[] = [];
  const past: CoauthorTurn[] = [];
  const discarded: CoauthorTurn[] = [];
  turns.forEach((t, i) => {
    if (t.status === "previewing" || t.id === correctingId || (i === 0 && t.status !== "discarded")) current.push(t);
    else if (t.status === "discarded") discarded.push(t);
    else past.push(t);
  });
  return { current, past, discarded };
}

// #218: the loop below already knows which attempt it is on and whether it
// is waiting on the model or checking the model's output — that information
// simply never left the function. `onStage` surfaces it verbatim (no new
// network calls, no guessing) so a caller can turn "Drafting…" into "Asking
// the model…" / "Compiling the draft…" / "draft did not compile, retrying
// (2 of 3)…" instead of one static label for the whole ~90s call.
export const DRAFT_MAX_ATTEMPTS = 3;

export type DraftStage =
  | { kind: "asking" }
  | { kind: "compiling" }
  | { kind: "retrying"; attempt: number; maxAttempts: number }
  /** #377 M1: the draft compiled, and the kernel refused it at the lens's
   *  mode with `errors` Error-severity findings. One repair ask follows. */
  | { kind: "kernel-retry"; errors: number };

/** What one draft turn produced, and by whom. `answeredModel` is read off the
 *  reasoner's response — the model that wrote this SL — and is the only model
 *  any surface is allowed to display. */
export type DraftResult = {
  sl: string;
  /** What was asked for. "" = the reasoner's own default. */
  requestedModel: string;
  /** What answered the ask that produced `sl` ("" when the reasoner named none). */
  answeredModel: string;
  /** TOTAL model time for the turn: the reasoner's own `latency_ms` summed over
   *  every ask this turn made, retries included. Undefined unless every ask
   *  reported one, so a partial sum is never shown as if it were the whole. */
  modelMs?: number;
  /** How many asks that total covers (1 on a clean first-try draft). Shown
   *  with the time so a retried turn's number is not read as one call. */
  modelCalls: number;
  /** What the reasoner said about effort on the ask that produced `sl`
   *  (see `CoauthorTurn.effortRan`). Absent when it said nothing. */
  effortRan?: string | null;
  effortDropped?: boolean;
  /** The named repairs `sl` carries that the drafter did not write, one line
   *  each (`stampInterfacesFromCrossings`). Empty on an untouched draft. */
  repairs: string[];
};

/** The one repair made on the drafter's behalf, and why it is
 *  a derivation rather than a minted claim.
 *
 *  Ruled 2026-09-09 after the first hand walk of M3: draw 2 wired all three
 *  crossings to interior components and left `interface` off them, so
 *  Operational mode refused the model three times over. The kernel's own
 *  message for that refusal ends: "If this component IS the pass-way, the
 *  merged form stays valid: add `interface` to its component line." Under
 *  Mobus a component that carries a membrane crossing is a member of I by
 *  definition (SSF `bipartite_implies_boundary_complete`: every external flow
 *  passes through an interface), so the stamp adds no information the flow
 *  did not already assert — it reads the drafter's own flow back in the
 *  kernel's vocabulary. That is why it may be applied without a human, and
 *  it is the ONLY level claim this step will ever touch: `primitive` and a
 *  door are judgments about the inside of a component, which no flow
 *  asserts, and they stay the drafter's to make and the human's to accept.
 *
 *  Named, not silent: every stamp is returned as a line, recorded on the
 *  turn beside parse heals and kernel repairs, and said in the notice — so
 *  the ledger keeps the drafter's real failure rate on this claim and the
 *  human still sees the stamp at the gate. A pending crossing (one no flow
 *  took) is untouched: it is the human's or the drafter's to realise.
 *
 *  Extended 2026-09-17 from interior drafts to first drafts and corrections
 *  (#399). Across 162 kernel-scored first drafts every refusal was this
 *  missing stamp, its converse, or both, and two prompt iterations moved
 *  neither. A crossing reads the same at every level: a flow between a
 *  component and a source, sink or environment thing, in either direction.
 *  A `mere` relation is not one (the kernel never counts it).
 *
 *  ADD-ONLY, and the converse fault is deliberately out of reach. An
 *  `interface` stamp that carries no flow (`interface_carries_no_flow`) is
 *  never removed here: the drafter's stamp is a positive assertion and the
 *  missing flow is an absence, so two repairs are possible (drop the stamp,
 *  or add the flow the drafter forgot) and nothing in the text says which.
 *  That one goes back to the drafter through the heal loop
 *  (`FLOWLESS_INTERFACE_NOTE`). */
export function stampInterfacesFromCrossings(model: CanvasModel): { model: CanvasModel; repairs: string[] } {
  const env = new Map(model.things.filter((t) => t.role === "Environment").map((t) => [t.id, t.name]));
  const carriers = new Map<number, string[]>();
  for (const r of model.relations) {
    if (!r.is_bond) continue;
    const from = env.get(r.a);
    const to = env.get(r.b);
    if (from !== undefined && !env.has(r.b)) {
      carriers.set(r.b, [...(carriers.get(r.b) ?? []), `${r.name || "a flow"} from ${from}`]);
    } else if (to !== undefined && !env.has(r.a)) {
      carriers.set(r.a, [...(carriers.get(r.a) ?? []), `${r.name || "a flow"} to ${to}`]);
    }
  }
  const repairs: string[] = [];
  const things = model.things.map((t) => {
    if (t.role !== "Component" || t.interface) return t;
    const carried = carriers.get(t.id);
    if (!carried) return t;
    repairs.push(`interface stamped on ${t.name || "an unnamed component"} (carries ${carried.join(", ")})`);
    return { ...t, interface: true };
  });
  return repairs.length === 0 ? { model, repairs } : { model: { ...model, things }, repairs };
}

/** The reasoner's word on effort, as a turn keeps it. */
export function ranUnder(r: Pick<DraftResult, "effortRan" | "effortDropped">): Pick<CoauthorTurn, "effortRan" | "effortDropped"> {
  return {
    ...(r.effortRan !== undefined ? { effortRan: r.effortRan } : {}),
    ...(r.effortDropped !== undefined ? { effortDropped: r.effortDropped } : {}),
  };
}

/** The repairs as the notice says them, so all three draft paths read alike. */
export function repairsPhrase(repairs: readonly string[]): string {
  const n = repairs.length;
  if (n === 0) return "";
  return `; ${n} interface stamp${n === 1 ? "" : "s"} derived from the crossings (the drafter left ${n === 1 ? "it" : "them"} off)`;
}

/** SL v1 cannot write every model (a name holding a quote, say), and the
 *  emitter says so by throwing. */
function emitOrNull(model: CanvasModel): string | null {
  try {
    return emitSl(model);
  } catch {
    return null;
  }
}

/** The emitter writes an `@pos` for every thing and an `@lens`; a drafter
 *  almost never does. Left in, they would pin the whole layout of a repaired
 *  draft, so later pane edits stop re-running the auto-layout. Keep only the
 *  annotations the drafter wrote: `@lens` by exact trimmed line, `@pos` by
 *  thing name. A stopgap: #302 stage 2 (`reemit_sl`, authored-only `@pos` and
 *  comment preservation, kernel-side) replaces this filter. */
export function keepAuthoredAnnotations(emitted: string, drafted: string): string {
  const posName = (line: string) => /^@pos\s+(?:"([^"]*)"|(\S+))/.exec(line.trim());
  const lenses = new Set<string>();
  const placed = new Set<string>();
  for (const raw of drafted.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("@lens")) lenses.add(line);
    const m = posName(line);
    if (m) placed.add(m[1] ?? m[2]);
  }
  return emitted
    .split("\n")
    .filter((raw) => {
      const line = raw.trim();
      if (line.startsWith("@lens")) return lenses.has(line);
      const m = posName(line);
      return m ? placed.has(m[1] ?? m[2]) : true;
    })
    .join("\n");
}

const MISSING_STAMP = "crossing_flow_without_interface";
const FLOWLESS_INTERFACE = "interface_carries_no_flow";

/** What the heal ask adds when the kernel refuses a flowless interface. The
 *  harness's words, kept apart from the kernel's findings and said to be so:
 *  the fault has two repairs and the brief names both, because a drafter told
 *  only "carries no flow" tends to keep the stamp and invent nothing. */
export const FLOWLESS_INTERFACE_NOTE =
  "Note from the authoring harness, not the kernel: an interface that carries no boundary-crossing flow has two repairs, " +
  "and the description decides which. If nothing crosses the boundary at that component, remove `interface` from its component line. " +
  "If a crossing was meant, add the flow between that component and a source, sink or environment. " +
  "A `mere` relation never counts as a crossing.";

/** #314. What an ask starts FROM, when it does not start from nothing.
 *
 *  This is the retry loop's own shape, named and made reusable: `sl` is the
 *  draft being revised, `findings` are the kernel's complaints about it. The
 *  loop already sent both on every heal; a human correction sends the same
 *  pair on the FIRST ask, because a correction is a heal whose instruction
 *  came from a person instead of the parser.
 *
 *  Both fields stay kernel- or draft-sourced. The human's words travel in the
 *  description (see `buildCorrectionBrief`) — never in `findings`, so nothing
 *  a person typed is ever presented to the drafter as something the kernel
 *  said. */
export type PriorDraft = { sl: string; findings?: string };

/** #314. The kernel's current reading of a model, as plain text for the
 *  drafter to read alongside the human's correction.
 *
 *  Every sentence here is a rendering of a kernel verdict — the count, the
 *  mode, and each issue's own message. Nothing is added, nothing is judged,
 *  and this text travels ONE WAY: into the request. It never returns, and it
 *  never enters a `ValidationResult` (the provenance brand in `kernel/types`
 *  makes that a compile error; `verdictChannel.test.ts` keeps it that way).
 *
 *  Takes `VerdictFields`, not `ValidationIssue`, because reading a verdict
 *  needs no brand — only minting one does. */
export function kernelFindingsBrief(lens: Lens, issues: readonly VerdictFields[]): string {
  const errors = issues.filter((i) => i.severity === "Error").length;
  const warnings = issues.filter((i) => i.severity === "Warning").length;
  const head = `The kernel reads this model under ${lens}, ${MODE_BY_LENS[lens]} mode. ${findingsPhrase(errors, warnings)}.`;
  if (issues.length === 0) return head;
  const lines = issues.map((i) => `- ${i.severity} at ${i.location}: ${i.message}`);
  return `${head}\n${lines.join("\n")}`;
}

/** #314. The human's correction, framed for the drafter.
 *
 *  Kept as a pure function of the two strings so the wording is one reviewable
 *  thing rather than an f-string buried in a click handler, and so a test can
 *  pin that the correction survives into the request verbatim. The original
 *  description rides along: a correction is an amendment to an ask, not a
 *  replacement for it, and dropping it is how the second correction loses what
 *  the first one was for. */
export function buildCorrectionBrief(description: string, correction: string): string {
  const original = description.trim();
  const note = correction.trim();
  const head = original
    ? `The system was first described like this:\n${original}\n\n`
    : "";
  return (
    `${head}The author reviewed the draft below and asked for this correction:\n${note}\n\n` +
    `Rewrite the SL so the correction holds. Keep everything the correction does not touch.`
  );
}

/** #314. A correction turn's model call: the same `authorSl` seam and the same
 *  compile→heal loop a first draft rides, seeded with the draft being
 *  corrected and the kernel's current reading of it. Returns TEXT and nothing
 *  else — no model, no verdict. What the text becomes is the compiler's
 *  business, and `runCorrectionTurn` below is where that happens. */
export async function correctSlWithRetry(req: {
  description: string;
  correction: string;
  priorSl: string;
  /** The kernel's own findings, from `kernelFindingsBrief`. Absent when the
   *  model on the canvas is not the SL being corrected, since stale findings
   *  are worse than none. */
  findings?: string;
  lens?: Lens;
  model?: string;
  effort?: "low";
  onStage?: (stage: DraftStage) => void;
}): Promise<DraftResult> {
  return draftSlWithRetry(
    buildCorrectionBrief(req.description, req.correction),
    req.lens,
    req.onStage,
    req.model ?? "",
    { sl: req.priorSl, findings: req.findings },
    req.effort,
  );
}

/** description -> SL text, healing up to 2 parse faults and 1 kernel refusal
 *  before returning. The kernel's own messages (which name the fix) are fed
 *  back to the drafter — the harness carries correctness, the model only needs
 *  to be plausible (llm-sl-authoring-plan.md, scaffolding item 4).
 *
 *  Two kinds of fault, two budgets, one seam (`priorSl` + `errors`):
 *
 *  - the text is not a model: `compileSl`'s parse faults go back, up to twice
 *    (attempts "2 of 3", "3 of 3").
 *  - the text IS a model and the kernel refuses it (#377 M1): after a clean
 *    compile the model is validated at the lens's mode (`MODE_BY_LENS`), and
 *    Error-severity findings go back ONCE, rendered by `kernelFindingsBrief`.
 *    Warnings stay for the human. Before this pass the loop only ever asked the
 *    parser, so a draft that stamped `interface` on five flowless components
 *    compiled clean, drew, and left its four refusals behind the Review button.
 *
 *  Between the compile and that verdict sits the one named repair (#399):
 *  when the kernel refuses a crossing flow for want of an interface, the
 *  stamp is read off the drafter's own flow (`stampInterfacesFromCrossings`)
 *  and the text is re-emitted by the kernel from the stamped model, so the SL
 *  returned, the model it compiles to and the verdict are about one thing. A
 *  draft whose only fault was the missing stamp needs no second ask. The
 *  repair is keyed to the kernel's refusal, never to a guess made here, so a
 *  lens with no interface concept is never stamped. The re-emitted text is
 *  the kernel's canonical form: the drafter's comments and layout do not
 *  survive it, which is the price of the text and the model agreeing.
 *
 *  Every compiling draft is judged, the healed one included, so a repair ask
 *  that comes back without a stamp is still adopted. The heal budget is
 *  unchanged: one ask.
 *
 *  The lens read is the one asked for, or the compiled model's own when the
 *  caller named none — the same lens the canvas will judge the draft under.
 *
 *  `model` (the author's choice, "" = the reasoner's default) carries through
 *  every retry, so a heal never silently changes drafters; the answering model
 *  is re-read on every ask, so the reported one is the one that wrote the SL
 *  being returned. `effort` rides every ask the same way, so a heal is never
 *  drafted at a different setting than the draft it repairs. */
export async function draftSlWithRetry(
  description: string,
  lens?: Lens,
  onStage?: (stage: DraftStage) => void,
  model = "",
  prior?: PriorDraft,
  effort?: "low",
): Promise<DraftResult> {
  const latencies: (number | undefined)[] = [];
  onStage?.({ kind: "asking" });
  let reply = await authorSl({
    description,
    lens,
    model,
    priorSl: prior?.sl,
    errors: prior?.findings,
    effort,
  });
  let { sl, model: answeredModel, latencyMs } = reply;
  latencies.push(latencyMs);
  let parseHeals = 0;
  let kernelHeals = 0;
  const repairs: string[] = [];
  for (;;) {
    onStage?.({ kind: "compiling" });
    const outcome = compileSl(sl);
    if ("errors" in outcome) {
      if (parseHeals >= DRAFT_MAX_ATTEMPTS - 1) break;
      parseHeals++;
      const errs = outcome.errors.map((e) => `line ${e.line}: ${e.message}`).join("\n");
      onStage?.({ kind: "retrying", attempt: parseHeals + 1, maxAttempts: DRAFT_MAX_ATTEMPTS });
      reply = await authorSl({ description, lens, model, priorSl: sl, errors: errs, effort });
      ({ sl, model: answeredModel, latencyMs } = reply);
      latencies.push(latencyMs);
      continue;
    }
    const readLens = lens ?? outcome.ok.lens;
    const refusals = (m: CanvasModel) =>
      validateMode(m, MODE_BY_LENS[readLens]).issues.filter((i) => i.severity === "Error");
    let errors = refusals(outcome.ok);
    if (errors.some((i) => i.code === MISSING_STAMP)) {
      const stamped = stampInterfacesFromCrossings(outcome.ok);
      const emitted = stamped.repairs.length > 0 ? emitOrNull(stamped.model) : null;
      const text = emitted === null ? null : keepAuthoredAnnotations(emitted, sl);
      const again = text === null ? null : compileSl(text);
      // Judged on what the re-emitted text compiles to, not on the patched
      // object. A model the emitter cannot write, or text that will not
      // compile, goes to the heal loop as the drafter wrote it.
      if (text !== null && again && "ok" in again) {
        sl = text;
        for (const line of stamped.repairs) if (!repairs.includes(line)) repairs.push(line);
        errors = refusals(again.ok);
      }
    }
    if (errors.length === 0 || kernelHeals >= 1) break;
    kernelHeals++;
    onStage?.({ kind: "kernel-retry", errors: errors.length });
    const findings = kernelFindingsBrief(readLens, errors);
    reply = await authorSl({
      description,
      lens,
      model,
      priorSl: sl,
      errors: errors.some((i) => i.code === FLOWLESS_INTERFACE) ? `${findings}\n\n${FLOWLESS_INTERFACE_NOTE}` : findings,
      effort,
    });
    ({ sl, model: answeredModel, latencyMs } = reply);
    latencies.push(latencyMs);
  }
  const complete = latencies.every((ms) => typeof ms === "number");
  return {
    sl,
    requestedModel: model,
    answeredModel,
    modelMs: complete ? latencies.reduce((a: number, ms) => a + (ms as number), 0) : undefined,
    modelCalls: latencies.length,
    ...(reply.effortRan !== undefined ? { effortRan: reply.effortRan } : {}),
    ...(reply.effortDropped !== undefined ? { effortDropped: reply.effortDropped } : {}),
    repairs,
  };
}

// ---------------------------------------------------------------------------
// #314 — the correction turn, end to end.
//
// George Mobus, 2026-08-12, having found three real errors in a drafted
// ribosome: "If you could tell it that, oh by the way, this is good as far as
// it goes, but you've identified flows as sources and sinks." The draft was
// accurate enough for a domain expert to locate and explain each error, and
// the loop dead-ended there — accept it wrong, or hand-edit SL.
//
// THE INVARIANT, and the reason this lives here rather than in a click
// handler: no generated text reaches a verdict. A correction produces SL text
// and stops. That text is compiled by `compileSl` — the same deterministic
// Rust parser every other authoring path uses — and only the compiler's own
// output object travels onward. The human's words change what the drafter
// WRITES; they never change what the kernel CONCLUDES.
//
// Two shortcuts this shape forecloses:
//   1. applying the correction to the model directly. The only `CanvasModel`
//      this function can produce is the one `compileSl` returned, handed on
//      by identity.
//   2. letting a correction dismiss a kernel issue. The findings are an INPUT,
//      passed as a string, never returned and never mutated; the revised SL is
//      re-judged from scratch by whatever the canvas does next.
export type CorrectionOutcome =
  | { kind: "compiled"; turn: CoauthorTurn; sl: string; model: CanvasModel; lensExplicit: boolean }
  | { kind: "compile-error"; turn: CoauthorTurn; sl: string; errors: SlError[] }
  | { kind: "network-error"; turn: CoauthorTurn };

export async function runCorrectionTurn(req: {
  id: string;
  /** The turn being corrected: the original ask, its SL, its id. */
  target: Pick<CoauthorTurn, "id" | "description" | "sl">;
  correction: string;
  /** The kernel's current reading of the model being corrected, from
   *  `kernelFindingsBrief` — or undefined when the canvas is showing
   *  something else and the findings would be about a different model. */
  findings?: string;
  lens?: Lens;
  requestedModel?: string;
  /** The author's Careful/Fast choice, recorded on the turn and sent as
   *  `effort` only when the requested drafter takes it. */
  effort?: DraftEffort;
  now?: () => string;
  onStage?: (stage: DraftStage) => void;
}): Promise<CorrectionOutcome> {
  const requestedModel = req.requestedModel ?? "";
  const at = (req.now ?? (() => new Date().toISOString()))();
  const base = {
    id: req.id,
    kind: "correction" as const,
    description: req.target.description,
    correction: req.correction.trim(),
    correctsTurnId: req.target.id,
    slBefore: req.target.sl,
    priorFindings: req.findings,
    at,
    requestedModel,
    ...(req.effort ? { effort: req.effort } : {}),
  };

  let result: DraftResult;
  try {
    result = await correctSlWithRetry({
      description: req.target.description,
      correction: req.correction,
      priorSl: req.target.sl,
      findings: req.findings,
      lens: req.lens,
      model: requestedModel,
      effort: effortOnWire(req.effort),
      onStage: req.onStage,
    });
  } catch (e) {
    return {
      kind: "network-error",
      turn: { ...base, sl: "", status: "network-error", errorText: e instanceof Error ? e.message : String(e) },
    };
  }

  const { sl, answeredModel, modelMs, modelCalls, repairs } = result;
  const provenance = {
    model: answeredModel,
    requestedModel,
    modelMs,
    modelCalls,
    ...ranUnder(result),
    ...(repairs.length > 0 ? { repairs } : {}),
  };

  // THE GATE. The revised text is compiled before anything else happens to it.
  // A correction that does not compile is a turn in the history and a fault
  // list in the pane — not a model, not a preview, not a verdict.
  const outcome = compileSl(sl);
  if ("errors" in outcome) {
    const errorText = outcome.errors.map((e) => `line ${e.line}: ${e.message}`).join("\n");
    return {
      kind: "compile-error",
      sl,
      errors: outcome.errors,
      turn: { ...base, ...provenance, sl, status: "compile-error", errorText },
    };
  }
  // `outcome.ok` by identity: the model that goes to the canvas IS the
  // compiler's output, never a reshaping of the drafter's text.
  return {
    kind: "compiled",
    sl,
    model: outcome.ok,
    lensExplicit: outcome.lens_explicit,
    turn: { ...base, ...provenance, sl, status: "previewing" },
  };
}

/** #314. How much of the draft the correction moved, for the transcript.
 *
 *  A line multiset comparison, and the wording says exactly that — lines added
 *  and removed, not "changes", because a reordering is not a change and
 *  claiming otherwise would be a small lie in a record built to be re-read.
 *  Blank lines and indentation are ignored; SL is line-oriented. */
export function slChangeSummary(before: string, after: string): string {
  const lines = (t: string) =>
    t
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  const remaining = new Map<string, number>();
  for (const l of lines(before)) remaining.set(l, (remaining.get(l) ?? 0) + 1);
  let added = 0;
  for (const l of lines(after)) {
    const n = remaining.get(l) ?? 0;
    if (n > 0) remaining.set(l, n - 1);
    else added++;
  }
  let removed = 0;
  for (const n of remaining.values()) removed += n;
  if (added === 0 && removed === 0) return "No lines changed.";
  const parts: string[] = [];
  if (added > 0) parts.push(`${added} line${added === 1 ? "" : "s"} added`);
  if (removed > 0) parts.push(`${removed} line${removed === 1 ? "" : "s"} removed`);
  return `${parts.join(", ")}.`;
}
