// Write's right margin (#409 M2): what the text is becoming, beside the text.
// A small diagram of the model as it stands, what the kernel says of it under
// the current lens, and the thing under the caret. Every fact here is the
// kernel's (the compiled model, the verdict) or a plain reading of it; the
// margin decides nothing. Build and Read are one click away for the full
// surfaces.
import Thumbnail from "./canvas/Thumbnail";
import type { CanvasModel, Relation, Thing, ValidationResult } from "./kernel/types";
import { MODE_BY_LENS } from "./review";
import { lineToName } from "./sl/names";
import { Card } from "./ui";

/** The thing the caret is on, with its flows read off the compiled model.
 *  Crossings are the flows whose other end is in the environment. Null when
 *  the caret is not on a thing line, or the line names a thing the compiled
 *  model does not carry yet (typed since the last compile). */
export function atCursor(
  lines: readonly string[],
  line: number,
  model: CanvasModel | null,
): { thing: Thing; inflows: Relation[]; outflows: Relation[]; crossings: Relation[] } | null {
  if (!model) return null;
  const name = lineToName(lines).get(line);
  if (name === undefined) return null;
  const thing = model.things.find((t) => t.name === name);
  if (!thing) return null;
  const inflows = model.relations.filter((r) => r.b === thing.id);
  const outflows = model.relations.filter((r) => r.a === thing.id);
  const roleOf = (id: number) => model.things.find((t) => t.id === id)?.role;
  const crossings = [...inflows, ...outflows].filter((r) => roleOf(r.a) !== roleOf(r.b));
  return { thing, inflows, outflows, crossings };
}

export function thingKind(t: Thing): string {
  if (t.role === "Environment") {
    return t.env_kind === "Source" ? "source" : t.env_kind === "Sink" ? "sink" : "environment object";
  }
  return t.passway ? "interface (pass-way)" : "component";
}

export function thingStamps(t: Thing): string[] {
  const out: string[] = [];
  if (t.primitive) out.push(t.primitive.toLowerCase());
  if (t.interface && !t.passway) out.push("interface");
  if (t.child_model) out.push("decomposes");
  if (t.stock_unit) out.push(`stock in ${t.stock_unit}`);
  return out;
}

const link = { color: "var(--lens-accent)", textDecoration: "underline", textDecorationStyle: "dotted" } as const;

export function WriteMargin({
  model,
  verdict,
  text,
  cursorLine,
  onBuild,
  onRead,
}: {
  model: CanvasModel | null;
  verdict: ValidationResult | null;
  text: string;
  cursorLine: number | null;
  onBuild: () => void;
  onRead: () => void;
}) {
  const lines = text.split("\n");
  const here = cursorLine === null ? null : atCursor(lines, cursorLine, model);
  const nameOf = (id: number) => model?.things.find((t) => t.id === id)?.name ?? "?";
  const drawable = model !== null && model.things.length > 0;
  const issues = verdict?.issues ?? [];

  return (
    <aside
      className="flex w-[380px] shrink-0 flex-col gap-3 overflow-y-auto border-l p-3"
      style={{ borderColor: "var(--hairline)", background: "var(--lens-chrome)" }}
      data-testid="write-margin"
    >
      <Card
        title="Diagram"
        source={drawable ? `${model.things.length} things · ${model.relations.length} relations` : "nothing to draw yet"}
      >
        <div className="flex flex-col items-center gap-2">
          {drawable && <Thumbnail model={model} size={330} />}
          <button onClick={onBuild} className="self-end text-[11px]" style={link} title="Open Build: the canvas, the palette, the element inspector">
            Build ↗
          </button>
        </div>
      </Card>

      <Card
        title="What the kernel says"
        source={model ? `${MODE_BY_LENS[model.lens]} mode · ${model.lens}` : "no model yet"}
      >
        {model && verdict ? (
          <>
            <p className="text-xs" style={{ color: issues.length === 0 ? "var(--verdict-ok)" : "var(--verdict-warning)" }}>
              {issues.length === 0 ? "✓ clean" : `${issues.length} issue${issues.length === 1 ? "" : "s"}`}
            </p>
            {issues.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                {issues.slice(0, 6).map((i, k) => (
                  <li key={k}>{i.message}</li>
                ))}
                {issues.length > 6 && <li style={{ color: "var(--text-muted)" }}>and {issues.length - 6} more</li>}
              </ul>
            )}
          </>
        ) : (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Compile the text and the verdict appears here.
          </p>
        )}
        <div className="mt-2 flex justify-end">
          <button onClick={onRead} className="text-[11px]" style={link} title="Open Read: the review, the formal object, the analyst">
            Read ↗
          </button>
        </div>
      </Card>

      <Card title="At the cursor" source={here ? thingKind(here.thing) : "no thing on this line"}>
        {here ? (
          <div className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-secondary)" }} data-testid="at-cursor">
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {here.thing.name}
            </p>
            {thingStamps(here.thing).length > 0 && (
              <p style={{ color: "var(--text-muted)" }}>{thingStamps(here.thing).join(" · ")}</p>
            )}
            <p>
              in: {here.inflows.length === 0 ? "none" : here.inflows.map((r) => `${nameOf(r.a)} (${r.name || "unlabeled"})`).join(", ")}
            </p>
            <p>
              out: {here.outflows.length === 0 ? "none" : here.outflows.map((r) => `${nameOf(r.b)} (${r.name || "unlabeled"})`).join(", ")}
            </p>
            <p style={{ color: "var(--text-muted)" }}>
              {here.crossings.length} boundary crossing{here.crossings.length === 1 ? "" : "s"}
            </p>
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Put the caret on a component, source or sink line.
          </p>
        )}
      </Card>
    </aside>
  );
}
