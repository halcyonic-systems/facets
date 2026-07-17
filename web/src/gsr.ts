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
