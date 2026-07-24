// The ONLY network module in web/src — the single door to the General Systems
// Reasoner's /analyze route. No provider SDK, no API keys, no prompt text: the
// prompt lives in GSR (the canvas never owns it). The kernel's verdicts travel
// IN the context; the LLM narrates and never re-derives structure.
import type { Lens } from "./kernel/types";
import type { AnalysisResponse } from "./analysis/types";

const GSR_URL = import.meta.env.VITE_GSR_URL ?? "http://localhost:5010";

export async function analyzeModel(req: {
  context: string;
  question?: string;
  lens: Lens;
  model?: string;
  domain?: string;
}): Promise<{ response: AnalysisResponse; model: string }> {
  const res = await fetch(`${GSR_URL}/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      context: req.context,
      question: req.question,
      lens: req.lens.toLowerCase(),
      model: req.model ?? "", // "" = local default; "claude-…" = frontier opt-in
      domain: req.domain,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) {
    const msg = data?.error ?? `GSR /analyze failed (${res.status})`;
    throw new Error(data?.raw ? `${msg}\n\n${data.raw}` : msg);
  }
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
}): Promise<{ sl: string; model: string }> {
  const res = await fetch(`${GSR_URL}/author-sl`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      description: req.description,
      lens: req.lens ? req.lens.toLowerCase() : undefined,
      model: req.model ?? "", // "" = local default; "claude-…" = frontier opt-in
      prior_sl: req.priorSl,
      errors: req.errors,
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.error) {
    const msg = data?.error ?? `GSR /author-sl failed (${res.status})`;
    throw new Error(data?.raw ? `${msg}\n\n${data.raw}` : msg);
  }
  return { sl: String(data.sl ?? ""), model: String(data.model ?? "") };
}
