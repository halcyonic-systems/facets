// #180 fix 3 (Option 1): an Environment-role thing drags freely across the
// hull with no effect on membership (role decides, per geometry.ts
// componentRing / Canvas.tsx C ∩ E = ∅). The hover hint says so; it must
// appear ONLY for Environment-role things, never Component-role ones, and
// changes nothing about drag legality (informational-only — no assertions
// here touch drag/drop behavior because none of it changed).
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Mobus } from "./mobus";
import { Bunge } from "./bunge";
import type { Thing, CanvasRole } from "../../kernel/types";

const HINT = "Environment role — membership is set by role, not position. Change it in the node editor.";

const noop = () => {};

function thing(role: CanvasRole): Thing {
  return { id: 1, name: "Buyers", x: 100, y: 100, role };
}

describe("env-node hover hint (#180 fix 3, Option 1)", () => {
  it("Mobus: present for an Environment-role thing", () => {
    const html = renderToStaticMarkup(
      <svg>
        <Mobus.NodeView
          thing={thing("Environment")}
          isBoundary={false}
          isOrphan={false}
          hovered={false}
          onPointerDown={noop}
          onHandlePointerDown={noop}
        />
      </svg>,
    );
    expect(html).toContain(HINT);
  });

  it("Mobus: absent for a Component-role thing", () => {
    const html = renderToStaticMarkup(
      <svg>
        <Mobus.NodeView
          thing={thing("Component")}
          isBoundary={false}
          isOrphan={false}
          hovered={false}
          onPointerDown={noop}
          onHandlePointerDown={noop}
        />
      </svg>,
    );
    expect(html).not.toContain(HINT);
  });

  it("Bunge: present for an Environment-role thing", () => {
    const html = renderToStaticMarkup(
      <svg>
        <Bunge.NodeView
          thing={thing("Environment")}
          isBoundary={false}
          isOrphan={false}
          hovered={false}
          onPointerDown={noop}
          onHandlePointerDown={noop}
        />
      </svg>,
    );
    expect(html).toContain(HINT);
  });

  it("Bunge: absent for a Component-role thing", () => {
    const html = renderToStaticMarkup(
      <svg>
        <Bunge.NodeView
          thing={thing("Component")}
          isBoundary={false}
          isOrphan={false}
          hovered={false}
          onPointerDown={noop}
          onHandlePointerDown={noop}
        />
      </svg>,
    );
    expect(html).not.toContain(HINT);
  });

  it("an orphan Environment thing shows the orphan hint, not the role hint (mutually exclusive titles)", () => {
    const html = renderToStaticMarkup(
      <svg>
        <Bunge.NodeView
          thing={thing("Environment")}
          isBoundary={false}
          isOrphan
          hovered={false}
          onPointerDown={noop}
          onHandlePointerDown={noop}
        />
      </svg>,
    );
    expect(html).toContain("not yet in ℰ");
    expect(html).not.toContain(HINT);
  });
});
