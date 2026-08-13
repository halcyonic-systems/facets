// The ONLY network module in web/src — the single door to the General Systems
// Reasoner's /analyze route. No provider SDK, no API keys, no prompt text: the
// prompt lives in GSR (the canvas never owns it). The kernel's verdicts travel
// IN the context; the LLM narrates and never re-derives structure.
import type { Lens } from "./kernel/types";
import type { AnalysisResponse } from "./analysis/types";
import { isDesktop } from "./desktop";
import { blockedOnDesktop, reasonerConfig } from "./reasoner";

/** Thrown when the reasoner is off — the caller's cue to offer the enable
 *  choice inline rather than to report a failure. */
export class ReasonerOffError extends Error {
  constructor() {
    super("The reasoner is off. Turn it on in the SL pane's Co-author mode and choose where it runs.");
    this.name = "ReasonerOffError";
  }
}

/** The one place a reasoner request is made. Off is off; an unreachable
 *  endpoint is named; the desktop CSP case is called by its name instead of
 *  arriving as a bare `TypeError: Load failed`. */
async function post(route: string, body: unknown): Promise<Record<string, unknown>> {
  const { enabled, endpoint } = reasonerConfig();
  if (!enabled) throw new ReasonerOffError();
  let res: Response;
  try {
    res = await fetch(`${endpoint}${route}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    if (isDesktop() && blockedOnDesktop(endpoint)) {
      throw new Error(
        `Could not reach the reasoner at ${endpoint} — the desktop app is not permitted to call that address. ` +
          `The bundle's allowed list is fixed at build time; use one of the listed endpoints, or run this endpoint in the browser build.`,
      );
    }
    throw new Error(
      `Could not reach the reasoner at ${endpoint}. Check that it is running and that the address is right.`,
    );
  }
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !data || data.error) {
    const msg = (data?.error as string) ?? `GSR ${route} failed (${res.status})`;
    throw new Error(data?.raw ? `${msg}\n\n${String(data.raw)}` : msg);
  }
  return data;
}

export async function analyzeModel(req: {
  context: string;
  question?: string;
  lens: Lens;
  model?: string;
  domain?: string;
}): Promise<{ response: AnalysisResponse; model: string }> {
  const data = await post("/analyze", {
    context: req.context,
    question: req.question,
    lens: req.lens.toLowerCase(),
    model: req.model ?? "", // "" = local default; "claude-…" = frontier opt-in
    domain: req.domain,
  });
  return { response: data.response as AnalysisResponse, model: String(data.model ?? "") };
}

// #10 Rung 1: description -> SL text. The light authoring door (sibling of
// /analyze). GSR owns the prompt + few-shots + model routing (local gemma4:12b
// default, "claude-…" to escalate); the canvas compiles the returned SL with
// compile_sl into a Rung-0 preview, so the kernel — not this call — owns
// legality. The LLM proposes; the kernel disposes; the author accepts.
export async function authorSl(req: {
  description: string;
  lens?: Lens;
  model?: string;
  /** compile→retry loop: the failing draft + the kernel's faults, so the
   *  drafter heals near-misses instead of the human hand-fixing them. */
  priorSl?: string;
  errors?: string;
}): Promise<{ sl: string; model: string; latencyMs?: number }> {
  const data = await post("/author-sl", {
    description: req.description,
    lens: req.lens ? req.lens.toLowerCase() : undefined,
    model: req.model ?? "", // "" = local default; "claude-…" = frontier opt-in
    prior_sl: req.priorSl,
    errors: req.errors,
  });
  // The reasoner times its own call and reports it. Absent or unparseable
  // stays undefined: a turn that shows no time is honest, a turn that shows
  // 0 ms is a lie about a call that took a minute.
  const latency = Number(data.latency_ms);
  return {
    sl: String(data.sl ?? ""),
    model: String(data.model ?? ""),
    latencyMs: Number.isFinite(latency) && latency >= 0 ? latency : undefined,
  };
}
