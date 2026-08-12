// #10: the resident co-author's shared drafter binding. One draft→retry loop,
// two surfaces — the SL pane's inline "Draft" affordance (one-shot, #10
// spike/Rung 1) and the resident Co-author dock (this issue, a persistent
// history of turns). Neither surface talks to GSR or the kernel directly;
// both call this. No new LLM plumbing — `authorSl` (GSR /author-sl) and
// `compile_sl` (kernel, deterministic) already exist.
import { authorSl } from "./gsr";
import { compileSl } from "./kernel";
import type { Lens } from "./kernel/types";

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
};

export function newTurnId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// History persists across reloads (localStorage) — no cap. A generous soft
// cap is a cheap later addition if the list grows unwieldy; not needed yet.
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
): Promise<DraftResult> {
  const latencies: (number | undefined)[] = [];
  onStage?.({ kind: "asking" });
  let { sl, model: answeredModel, latencyMs } = await authorSl({ description, lens, model });
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
