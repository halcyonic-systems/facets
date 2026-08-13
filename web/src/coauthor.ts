// #10: the resident co-author's shared drafter binding. One draft→retry loop,
// two surfaces — the SL pane's inline "Draft" affordance (one-shot, #10
// spike/Rung 1) and the resident Co-author dock (this issue, a persistent
// history of turns). Neither surface talks to GSR or the kernel directly;
// both call this. No new LLM plumbing — `authorSl` (GSR /author-sl) and
// `compile_sl` (kernel, deterministic) already exist.
import { authorSl } from "./gsr";
import { compileSl } from "./kernel";
import type { CanvasModel, Lens, SlError, VerdictFields } from "./kernel/types";
import { MODE_BY_LENS, findingsPhrase } from "./review";

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
  /** #314. `"draft"` (or absent, on turns recorded before corrections existed)
   *  is a first draft from a description. `"correction"` is the author telling
   *  the drafter what is wrong with an existing draft and getting a revision.
   *  The two run the SAME path — ask, compile, preview, accept or discard —
   *  and the kernel judges both the same way. */
  kind?: "draft" | "correction";
  /** Correction turns: the correction as the author wrote it. Kept separate
   *  from `description` so the transcript can show the original ask and the
   *  correction as two different things, which is what makes a re-read
   *  legible weeks later. */
  correction?: string;
  /** Correction turns: the id of the turn whose SL was being corrected. */
  correctsTurnId?: string;
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
  | { kind: "retrying"; attempt: number; maxAttempts: number };

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
};

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
  onStage?: (stage: DraftStage) => void;
}): Promise<DraftResult> {
  return draftSlWithRetry(
    buildCorrectionBrief(req.description, req.correction),
    req.lens,
    req.onStage,
    req.model ?? "",
    { sl: req.priorSl, findings: req.findings },
  );
}

/** description -> SL text, healing up to 2 kernel-reported faults before
 *  returning. The kernel's own parse errors (which name the fix) are fed back
 *  to the drafter — the harness carries correctness, the model only needs to
 *  be plausible (llm-sl-authoring-plan.md, scaffolding item 4).
 *
 *  `model` (the author's choice, "" = the reasoner's default) carries through
 *  every retry, so a heal never silently changes drafters; the answering model
 *  is re-read on every ask, so the reported one is the one that wrote the SL
 *  being returned. */
export async function draftSlWithRetry(
  description: string,
  lens?: Lens,
  onStage?: (stage: DraftStage) => void,
  model = "",
  prior?: PriorDraft,
): Promise<DraftResult> {
  const latencies: (number | undefined)[] = [];
  onStage?.({ kind: "asking" });
  let { sl, model: answeredModel, latencyMs } = await authorSl({
    description,
    lens,
    model,
    priorSl: prior?.sl,
    errors: prior?.findings,
  });
  latencies.push(latencyMs);
  for (let i = 0; i < 2; i++) {
    onStage?.({ kind: "compiling" });
    const outcome = compileSl(sl);
    if (!("errors" in outcome)) break;
    const errs = outcome.errors.map((e) => `line ${e.line}: ${e.message}`).join("\n");
    onStage?.({ kind: "retrying", attempt: i + 2, maxAttempts: DRAFT_MAX_ATTEMPTS });
    ({ sl, model: answeredModel, latencyMs } = await authorSl({ description, lens, model, priorSl: sl, errors: errs }));
    latencies.push(latencyMs);
  }
  const complete = latencies.every((ms) => typeof ms === "number");
  return {
    sl,
    requestedModel: model,
    answeredModel,
    modelMs: complete ? latencies.reduce((a: number, ms) => a + (ms as number), 0) : undefined,
    modelCalls: latencies.length,
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
      onStage: req.onStage,
    });
  } catch (e) {
    return {
      kind: "network-error",
      turn: { ...base, sl: "", status: "network-error", errorText: e instanceof Error ? e.message : String(e) },
    };
  }

  const { sl, answeredModel, modelMs, modelCalls } = result;
  const provenance = { model: answeredModel, requestedModel, modelMs, modelCalls };

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
