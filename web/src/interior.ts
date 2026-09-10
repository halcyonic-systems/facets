// #377 M3 — the co-author walks through the door.
//
// A decomposed component's child is born with its boundary and nothing inside:
// one stand-in per neighbour the parent touched, and every crossing carried
// over as a flow that lands on the child's root until an interface takes it
// (`derive_child`, kept across the canvas by `CanvasModel.crossings`, #384).
// The human then draws the interior by hand. This module asks the drafter for
// that interior and nothing else — C′ and N′ — in the order Mobus ch. 6 §6.7.2
// prescribes: the owner of each crossing first, then the work processes that
// connect them, found by following the flows.
//
// What the drafter never gets to invent: the boundary. E′ is derived from the
// accepted parent, so the brief forbids new sources and sinks, and the seam
// contract (`check_decomposition_contract`) judges the result against the
// parent's crossings, never against the drafter's word. What it gets to
// decide: which interior component owns each crossing, what work happens
// between them, which components are atomic and which carry a door.
//
// One turn, one gate. The draft rides `draftSlWithRetry` (parse heals, one
// kernel pass at the child's mode), lands in the same accept/discard gate as a
// first draft, and the child's identity and crossings are carried over from
// the model on the canvas — a compile of SL text knows neither.
import { compileSl, emitSl } from "./kernel";
import type { CanvasModel, Crossing, Lens, Thing } from "./kernel/types";
import { draftSlWithRetry, type DraftResult, type DraftStage } from "./coauthor";
import { pendingCrossings } from "./canvas/crossings";

export { pendingCrossings };

/** What a walked-in child is, for the drafter: its parent component and the
 *  empty child on the canvas. */
export interface InteriorContext {
  /** The parent model, the level above. */
  parent: CanvasModel;
  /** The component whose interior this is (its name and description are the
   *  drafter's only prose about what is inside). */
  component: Thing;
  /** The child as it stands: stand-ins, crossings, possibly some interior. */
  child: CanvasModel;
}

function nameOf(model: CanvasModel, id: number): string {
  return model.things.find((t) => t.id === id)?.name ?? "?";
}

function kindWord(k: Crossing["kind"]): string {
  return k === "Unspecified" ? "" : ` : ${k.toLowerCase()}`;
}

/** The skeleton the drafter starts from: the child's own SL (stand-ins, and
 *  the pending crossings as the comments `emit_sl` writes for them). Kernel
 *  text, not composed here — whatever the child already holds is in it. */
export function interiorSkeleton(child: CanvasModel): string {
  return emitSl(child);
}

/** The ask. Kept as a pure function of the context so the wording is one
 *  reviewable thing and a test can pin what the drafter is told. */
export function buildInteriorBrief(ctx: InteriorContext): string {
  const { component, child } = ctx;
  const crossings = pendingCrossings(child);
  const name = component.name || "this component";
  const lines: string[] = [];
  lines.push(
    `You are drafting the INTERIOR of one component, "${name}", of the system "${ctx.parent.name ?? "the parent"}".`,
  );
  const about = (component.description ?? "").trim();
  if (about) {
    lines.push(`The author described it as: ${about}`);
  }
  lines.push("");
  lines.push("The boundary is already decided and is not yours to change:");
  lines.push("- Keep every source, sink and environment line below exactly as written. Declare NO new source, sink or environment.");
  lines.push("- The system line names this component; keep it.");
  if (crossings.length > 0) {
    lines.push("");
    lines.push(
      `${crossings.length} boundary flow${crossings.length === 1 ? "" : "s"} cross${crossings.length === 1 ? "es" : ""} into or out of "${name}" and no interior component owns ${crossings.length === 1 ? "it" : "them"} yet. Write each one as a real flow, with the same neighbour, direction and kind, landing on an interior component you declare with \`interface\`:`,
    );
    for (const c of crossings) {
      const env = nameOf(child, c.env);
      const label = c.name ? ` "${c.name}"` : "";
      lines.push(
        c.inbound
          ? `- flow ${quoteIf(env)} -> <the interface component that receives it>${kindWord(c.kind)}${label}`
          : `- flow <the interface component that sends it> -> ${quoteIf(env)}${kindWord(c.kind)}${label}`,
      );
    }
  }
  lines.push("");
  lines.push("Then, in this order (Mobus ch. 6 §6.7.2):");
  lines.push("1. The importer or exporter that owns each crossing above — one interface component per crossing, or one shared by several crossings of the same neighbour.");
  lines.push("2. The internal work processes that connect them, found by following the flows: energy first, then the main material, messages last. Every interior component must carry at least one flow.");
  lines.push("3. `primitive` only on atomic leaves. A component with a sensor, controller, schedule or parts of its own is complex: leave `primitive` off and give it a `description` naming what would be inside it.");
  lines.push("");
  lines.push("Output the complete SL for this interior: the system line, the environment lines exactly as given, then your components and flows.");
  lines.push("");
  lines.push("=== THE CHILD AS IT STANDS ===");
  lines.push(interiorSkeleton(child).trimEnd());
  return lines.join("\n");
}

function quoteIf(name: string): string {
  return /\s/.test(name) ? `"${name}"` : name;
}

/** Ask the drafter for the interior. Text out, nothing else — what the text
 *  becomes is `adoptInterior`'s business. */
export function draftInteriorWithRetry(
  ctx: InteriorContext,
  lens?: Lens,
  onStage?: (stage: DraftStage) => void,
  model = "",
): Promise<DraftResult> {
  return draftSlWithRetry(buildInteriorBrief(ctx), lens ?? ctx.child.lens, onStage, model);
}

/** What the drafted interior becomes: the compiled model, with the child's
 *  identity and its crossings carried over from the model on the canvas.
 *
 *  Two things a compile of SL text cannot know, restored here:
 *  - `model_id`: the parent's `decomposes` reference points at it. A child
 *    that lost it would be a different model.
 *  - `crossings`: derived from the parent, listed by `emit_sl` only as
 *    comments, so the parser returns none. Re-attached by STAND-IN NAME (ids
 *    are minted afresh by every compile). A crossing whose stand-in the drafter
 *    dropped or renamed cannot be re-attached and is reported, not silently
 *    lost — the seam contract will refuse the child until it is restored.
 *
 *  Everything else is the compiler's output by identity. */
export type AdoptOutcome =
  | { kind: "compiled"; model: CanvasModel; lensExplicit: boolean; lostCrossings: string[] }
  | { kind: "compile-error"; errors: { line: number; message: string }[] };

export function adoptInterior(sl: string, child: CanvasModel): AdoptOutcome {
  const outcome = compileSl(sl);
  if ("errors" in outcome) return { kind: "compile-error", errors: outcome.errors };
  const compiled = outcome.ok;
  const byName = new Map(compiled.things.filter((t) => t.role === "Environment").map((t) => [t.name, t.id]));
  const crossings: Crossing[] = [];
  const lost: string[] = [];
  for (const c of child.crossings ?? []) {
    const name = nameOf(child, c.env);
    const id = byName.get(name);
    if (id === undefined) {
      lost.push(`${c.inbound ? `${name} -> ` : `-> ${name}`}${c.name ? ` "${c.name}"` : ""}`.trim());
      continue;
    }
    crossings.push({ ...c, env: id });
  }
  const model: CanvasModel = {
    ...compiled,
    model_id: child.model_id,
    // The parent's reference and the breadcrumb both read the child's name;
    // a drafter that renamed the system does not rename the door.
    name: child.name ?? compiled.name,
    ...(crossings.length > 0 ? { crossings } : {}),
  };
  return { kind: "compiled", model, lensExplicit: outcome.lens_explicit, lostCrossings: lost };
}
