// The primitives (makeover slice B2, web/DESIGN.md § Primitives). Static
// markup only, this suite's convention (no jsdom): what the roles, sizes and
// aria attributes declare, plus the pure keyboard tables the components
// consult, so the keyboard contract is pinned without a DOM. Tabs' own
// rendering contract stays in Tabs.test.tsx.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Button,
  Card,
  Menu,
  MenuItem,
  MenuSection,
  MenuSeparator,
  Panel,
  Pill,
  Tabs,
  ToolButton,
  menuKeyTarget,
  tabKeyTarget,
} from "./ui";

const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");
const ui = readFileSync(new URL("./ui.tsx", import.meta.url), "utf8");

describe("Button", () => {
  it("is 32 tall by default and 28 on request, 4px radius, with a 16px icon slot", () => {
    const md = renderToStaticMarkup(<Button>Save</Button>);
    expect(md).toContain('data-size="32"');
    expect(md).toContain("h-8");
    expect(md).toContain("rounded-sm");
    expect(md).toContain('type="button"');
    const sm = renderToStaticMarkup(
      <Button size={28} icon="folder">
        Open
      </Button>,
    );
    expect(sm).toContain('data-size="28"');
    expect(sm).toContain("h-7");
    expect(sm).toMatch(/<svg[^>]*width="16"[^>]*data-icon="folder"/);
    expect(sm).toContain('aria-hidden="true"');
  });

  it("fills with the accent under --text-on-accent, and quiet wears the --rule-strong hairline", () => {
    const primary = renderToStaticMarkup(<Button>Go</Button>);
    expect(primary).toContain("background:var(--accent)");
    expect(primary).toContain("color:var(--text-on-accent)");
    const quiet = renderToStaticMarkup(<Button variant="quiet">Cancel</Button>);
    expect(quiet).toContain("border:1px solid var(--rule-strong)");
    expect(quiet).toContain("prim-quiet");
    const danger = renderToStaticMarkup(<Button variant="danger">Discard</Button>);
    expect(danger).toContain("background:var(--verdict-error)");
  });

  it("keeps the focus ring: nothing in ui.tsx removes an outline, and the ring is global (rule 10)", () => {
    expect(ui).not.toMatch(/outline-none/);
    expect(ui).not.toMatch(/outline:\s*["']?none/);
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*var\(--focus-ring\)/);
    // The disabled state is readable ink, not half opacity.
    const off = renderToStaticMarkup(<Button disabled>Go</Button>);
    expect(off).toContain("color:var(--text-muted)");
    expect(off).not.toContain("opacity");
  });
});

describe("ToolButton", () => {
  it("is a 32px square with a 20px icon when it has no word, and says armed with aria-pressed", () => {
    const m = renderToStaticMarkup(<ToolButton icon="plus" aria-label="Add" active onClick={() => {}} />);
    expect(m).toContain("h-8");
    expect(m).toContain("w-8");
    expect(m).toContain("rounded-sm");
    expect(m).toContain('aria-pressed="true"');
    expect(m).toMatch(/<svg[^>]*width="20"/);
    expect(m).toContain("background:var(--lens-accent)");
  });

  it("widens to its word when given one, still 32 tall", () => {
    const m = renderToStaticMarkup(<ToolButton onClick={() => {}}>matrix</ToolButton>);
    expect(m).toContain("min-w-8");
    expect(m).toContain('aria-pressed="false"');
    expect(m).not.toContain("rounded-full");
  });
});

describe("Pill", () => {
  it("is a 4px chip with a word; only the verdict chip is a pill and carries data-pill (rule 3)", () => {
    const chip = renderToStaticMarkup(<Pill tone="ok">conserved</Pill>);
    expect(chip).toContain("rounded-sm");
    expect(chip).not.toContain("rounded-full");
    expect(chip).not.toContain("data-pill");
    const verdict = renderToStaticMarkup(
      <Pill tone="ok" pill icon="check">
        clean
      </Pill>,
    );
    expect(verdict).toContain("data-pill");
    expect(verdict).toContain("rounded-full");
    expect(verdict).toContain('data-icon="check"');
  });

  it("colours by meaning (rule 9d): each tone names its token, and error is solid", () => {
    const tones = {
      ok: "--verdict-ok",
      warning: "--verdict-warning",
      runs: "--accent",
      drafted: "--prim-modulating",
      with: "--prim-combining",
      bench: "--prim-buffering",
    } as const;
    for (const [tone, token] of Object.entries(tones)) {
      const m = renderToStaticMarkup(<Pill tone={tone as keyof typeof tones}>x</Pill>);
      expect(m).toContain(`data-tone="${tone}"`);
      expect(m).toContain(`color:var(${token})`);
      expect(m).toContain("color-mix(");
    }
    const error = renderToStaticMarkup(<Pill tone="error">leak</Pill>);
    expect(error).toContain("background:var(--verdict-error)");
    expect(error).toContain("color:var(--text-on-accent)");
  });

  it("nothing else in the primitives is a pill", () => {
    const uses = ui.match(/rounded-full/g) ?? [];
    expect(uses).toHaveLength(1);
  });
});

describe("Tabs", () => {
  const TABS = [
    { key: "a", label: "Element" },
    { key: "b", label: "Formal" },
    { key: "c", label: "Review", badge: 2 },
  ];

  it("is a tablist of tabs, 32 tall, the active one selected and alone in the tab order", () => {
    const m = renderToStaticMarkup(<Tabs tabs={TABS} active="b" onSelect={() => {}} label="Inspector" />);
    expect(m).toContain('role="tablist"');
    expect(m).toContain('aria-label="Inspector"');
    expect(m.match(/role="tab"/g)).toHaveLength(3);
    expect(m.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(m.match(/aria-selected="false"/g)).toHaveLength(2);
    expect(m.match(/tabindex="0"/g)).toHaveLength(1);
    expect(m.match(/tabindex="-1"/g)).toHaveLength(2);
    expect(m).toContain("h-8");
    // The badge is a 4px chip, not a pill.
    expect(m).not.toContain("rounded-full");
    expect(m).toContain(">2<");
  });

  it("moves with ArrowLeft / ArrowRight (wrapping), Home and End, and ignores other keys", () => {
    expect(tabKeyTarget("ArrowRight", 0, 3)).toBe(1);
    expect(tabKeyTarget("ArrowRight", 2, 3)).toBe(0);
    expect(tabKeyTarget("ArrowLeft", 0, 3)).toBe(2);
    expect(tabKeyTarget("Home", 2, 3)).toBe(0);
    expect(tabKeyTarget("End", 0, 3)).toBe(2);
    expect(tabKeyTarget("ArrowDown", 0, 3)).toBeNull();
    expect(tabKeyTarget("Enter", 0, 3)).toBeNull();
    expect(tabKeyTarget("ArrowRight", 0, 0)).toBeNull();
  });
});

describe("Menu", () => {
  const menu = (open: boolean) =>
    renderToStaticMarkup(
      <Menu label="File" open={open} onOpenChange={() => {}}>
        <MenuItem onSelect={() => {}} shortcut="⌘S">
          Save
        </MenuItem>
        <MenuItem disabled>Save to folder…</MenuItem>
        <MenuSeparator />
        <MenuSection title="Demos">
          <MenuItem role="menuitemradio" checked>
            LLM Serving Market
          </MenuItem>
        </MenuSection>
      </Menu>,
    );

  it("closed: the trigger is a menu button that says so", () => {
    const m = menu(false);
    expect(m).toContain('aria-haspopup="menu"');
    expect(m).toContain('aria-expanded="false"');
    expect(m).not.toContain('role="menu"');
    expect(m).toContain('data-icon="chevron-down"');
  });

  it("open: a role=menu panel labelled by the trigger, 32px menuitems, headed groups, no shadow", () => {
    const m = menu(true);
    expect(m).toContain('aria-expanded="true"');
    expect(m).toMatch(/aria-controls="([^"]+)"/);
    const panelId = /aria-controls="([^"]+)"/.exec(m)![1];
    expect(m).toContain(`id="${panelId}" role="menu"`);
    const triggerId = /id="([^"]+)"[^>]*aria-haspopup="menu"/.exec(m)![1];
    expect(m).toContain(`aria-labelledby="${triggerId}"`);
    expect(m.match(/role="menuitem"/g)).toHaveLength(2);
    expect(m.match(/role="menuitemradio"/g)).toHaveLength(1);
    expect(m).toContain('aria-checked="true"');
    expect(m).toContain('aria-disabled="true"');
    expect(m).toContain('role="separator"');
    expect(m).toContain('role="group"');
    expect(m).toContain("Demos");
    expect(m).toContain("⌘S");
    expect(m).toContain("border:1px solid var(--rule-strong)");
    expect(m).not.toContain("box-shadow");
    // Items are 32 tall and out of the tab order (roving focus moves them).
    expect(m.match(/class="prim-menu-item flex h-8 /g)).toHaveLength(3);
    expect(m.match(/tabindex="-1"/g)).toHaveLength(3);
  });

  it("roves with ArrowDown / ArrowUp (wrapping), Home and End; ArrowUp from nowhere lands on the last", () => {
    expect(menuKeyTarget("ArrowDown", -1, 4)).toBe(0);
    expect(menuKeyTarget("ArrowDown", 3, 4)).toBe(0);
    expect(menuKeyTarget("ArrowUp", 0, 4)).toBe(3);
    expect(menuKeyTarget("ArrowUp", -1, 4)).toBe(3);
    expect(menuKeyTarget("Home", 2, 4)).toBe(0);
    expect(menuKeyTarget("End", 0, 4)).toBe(3);
    expect(menuKeyTarget("ArrowRight", 0, 4)).toBeNull();
    expect(menuKeyTarget("ArrowDown", 0, 0)).toBeNull();
  });

  it("closes on Escape with focus back on the trigger, on Tab, and on a pointer down outside (from the source)", () => {
    // These three paths need a live DOM to run; the source is pinned instead,
    // so a future edit that drops one is caught here.
    expect(ui).toMatch(/e\.key === "Escape"\)[\s\S]{0,80}close\(true\)/);
    expect(ui).toMatch(/if \(returnFocus\) triggerRef\.current\?\.focus\(\)/);
    expect(ui).toMatch(/e\.key === "Tab"\)[\s\S]{0,40}setOpen\(false\)/);
    expect(ui).toMatch(/document\.addEventListener\("pointerdown", onDown\)/);
  });
});

describe("ConfirmDialog", () => {
  // createPortal needs a DOM; the dialog's markup contract is pinned from the
  // source, the same way the Menu's close paths are.
  it("is a labelled modal dialog with a hairline edge, no shadow, and focus that moves in and returns", () => {
    const body = ui.slice(ui.indexOf("export function ConfirmDialog"), ui.indexOf("/* ── Tabs"));
    expect(body).toContain('role="dialog"');
    expect(body).toContain('aria-modal="true"');
    expect(body).toContain("aria-labelledby={titleId}");
    expect(body).toContain("id={titleId}");
    expect(body).toContain("rounded-md");
    expect(body).toContain("border: \"1px solid var(--hairline)\"");
    expect(body).not.toContain("boxShadow");
    expect(body).not.toContain("alertdialog");
    expect(body).toMatch(/querySelector<HTMLElement>\("\[data-autofocus\]"\)\?\.focus\(\)/);
    expect(body).toMatch(/opener\.focus\(\)/);
    expect(body).toMatch(/e\.key === "Escape"\) onResolve\(false\)/);
    // The three buttons are the Button primitive: Cancel quiet, the verb danger, alt primary.
    expect(body).toContain('<Button variant="quiet" data-autofocus');
    expect(body).toContain('<Button variant="danger"');
    expect(body).toContain('<Button variant="primary"');
  });
});

describe("Panel and Card", () => {
  it("are 8px windows with a hairline edge and no shadow; the Card title is a name in the display face", () => {
    const p = renderToStaticMarkup(<Panel>x</Panel>);
    expect(p).toContain("rounded-md");
    expect(p).toContain("border:1px solid var(--hairline)");
    expect(p).not.toContain("box-shadow");
    const c = renderToStaticMarkup(
      <Card title="Result" source="facets-core · wasm">
        y
      </Card>,
    );
    expect(c).toContain("<section");
    expect(c).toContain("font-family:var(--font-display)");
    expect(c).toContain("font-size:var(--t-d3)");
    expect(c).toContain("facets-core · wasm");
    expect(c).not.toContain("box-shadow");
  });
});
