// The theme is a stored preference like the drafting model (drafterModel.test.ts),
// with one extra obligation: it has THREE states, and the third one — system —
// is the absence of a decision, not a decision that happens to match the OS.
// These bind that distinction, because it is the only part a boolean toggle
// would silently get wrong.
import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  THEME_CHOICES,
  THEME_LABEL,
  initTheme,
  nextThemeChoice,
  resetThemeForTest,
  setThemeChoice,
  subscribeTheme,
  themeAttr,
  themeChoice,
} from "./theme";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

// The suite runs in the node environment (vitest.config.ts), so the document is
// the smallest thing that answers the two calls theme.ts makes on it.
class FakeElement {
  private attrs = new Map<string, string>();
  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
  }
  removeAttribute(name: string): void {
    this.attrs.delete(name);
  }
  getAttribute(name: string): string | null {
    return this.attrs.has(name) ? this.attrs.get(name)! : null;
  }
  hasAttribute(name: string): boolean {
    return this.attrs.has(name);
  }
}

let documentElement: FakeElement;

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
  documentElement = new FakeElement();
  (globalThis as unknown as { document: { documentElement: FakeElement } }).document = { documentElement };
  resetThemeForTest();
});

describe("the theme is three states, not two", () => {
  it("offers exactly system / light / dark, and system is the default", () => {
    expect([...THEME_CHOICES]).toEqual(["system", "light", "dark"]);
    expect(themeChoice()).toBe("system");
  });

  // The load-bearing one. If "system" stamped an attribute — say, the resolved
  // light/dark read off the OS at load — the app would pin whatever the OS said
  // at that moment and stop following it, which is the exact behaviour the third
  // state exists to avoid. The ABSENCE of the attribute is the state.
  it("system stamps NO attribute, so the CSS default stays in force", () => {
    expect(themeAttr("system")).toBeNull();
    initTheme();
    expect(documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("an explicit choice stamps the attribute the CSS keys on", () => {
    expect(themeAttr("light")).toBe("light");
    expect(themeAttr("dark")).toBe("dark");
    setThemeChoice("dark");
    expect(documentElement.getAttribute("data-theme")).toBe("dark");
    setThemeChoice("light");
    expect(documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("returning to system removes the attribute again", () => {
    setThemeChoice("dark");
    setThemeChoice("system");
    expect(documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("cycles system → light → dark → system, so every state is one click away", () => {
    expect(nextThemeChoice("system")).toBe("light");
    expect(nextThemeChoice("light")).toBe("dark");
    expect(nextThemeChoice("dark")).toBe("system");
  });

  it("labels system as its own word, never as the theme it happens to resolve to", () => {
    expect(THEME_LABEL.system).not.toBe(THEME_LABEL.light);
    expect(THEME_LABEL.system).not.toBe(THEME_LABEL.dark);
  });
});

describe("the choice persists and is announced", () => {
  it("survives a reload and is applied before anything reads it", () => {
    setThemeChoice("light");
    resetThemeForTest(); // the next session, same storage
    expect(initTheme()).toBe("light");
    expect(documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("falls back to system when the stored value is not a choice", () => {
    localStorage.setItem("bert-lenses.theme", "sepia");
    expect(initTheme()).toBe("system");
    expect(documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("notifies subscribers so the control and the document cannot disagree", () => {
    const seen: string[] = [];
    const off = subscribeTheme((c) => seen.push(c));
    setThemeChoice("dark");
    setThemeChoice("system");
    off();
    setThemeChoice("light");
    expect(seen).toEqual(["dark", "system"]);
  });
});

// The structural claim the CSS makes, held as a test rather than as a comment:
// there is ONE dark palette. The failure this prevents is not a broken theme —
// it is a token added to one of two copies and missed in the other, which is
// invisible to everyone whose setting resolves to the copy that was updated.
describe("the palette is stated once", () => {
  // Comments are blanked, not deleted (check-tokens.mjs does the same), so the
  // block explaining why the rejected two-block shape was rejected is not read
  // as the shape itself.
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "index.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    (m) => m.replace(/[^\n]/g, " "),
  );

  it("carries no prefers-color-scheme block — the OS is followed via color-scheme", () => {
    expect(css).not.toMatch(/prefers-color-scheme/);
  });

  it("gives an explicit choice nothing but a color-scheme narrowing", () => {
    for (const attr of ["light", "dark"]) {
      const block = new RegExp(`:root\\[data-theme="${attr}"\\]\\s*\\{([^}]*)\\}`).exec(css);
      expect(block, `no :root[data-theme="${attr}"] block`).not.toBeNull();
      expect(block![1].trim()).toBe(`color-scheme: ${attr};`);
    }
  });

  it("declares each themed token exactly once, as a light-dark() pair", () => {
    const themed = [
      "--bg-primary",
      "--bg-secondary",
      "--bg-surface",
      "--text-primary",
      "--text-secondary",
      "--text-muted",
      "--accent",
      "--border",
      "--paper",
      "--paper-ground",
      "--ink",
      "--rule",
      "--seal",
      "--verdict-ok",
      "--verdict-warning",
      "--verdict-error",
    ];
    for (const token of themed) {
      const decls = [...css.matchAll(new RegExp(`^\\s*${token}\\s*:\\s*([^;]+);`, "gm"))];
      expect(decls.length, `${token} is declared ${decls.length} times`).toBe(1);
      expect(decls[0][1], `${token} is not a light-dark() pair`).toMatch(/^light-dark\(/);
    }
  });

  // The substance channel is contractual, and #321 changed WHAT the contract
  // binds. It used to be "identical hex in both themes" — this test asserted
  // exactly that. But appearance is contextual: holding the number still against
  // a near-black ground put Informational at 2.88 and Field at 2.92, and a
  // channel you cannot see is not a channel. So the HUE is the contract and the
  // lightness adapts. The claim under test is unchanged in substance — Matter is
  // that green wherever you meet it — and only its mechanism moved.
  it("holds the KIND channel's hue across themes, and lets lightness adapt", () => {
    const hue = (hex: string) => {
      const v = hex.replace("#", "");
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      if (d === 0) return 0;
      const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return ((h * 60) % 360 + 360) % 360;
    };
    for (const token of ["--kind-matter", "--kind-energy", "--kind-informational", "--kind-field"]) {
      const decls = [...css.matchAll(new RegExp(`^\\s*${token}\\s*:\\s*([^;]+);`, "gm"))];
      expect(decls.length, `${token} is declared ${decls.length} times`).toBe(1);
      const pair = decls[0][1].trim().match(/light-dark\(\s*(#[0-9a-f]{6})\s*,\s*(#[0-9a-f]{6})\s*\)/i);
      expect(pair, `${token} must be a light-dark() pair — lightness adapts`).not.toBeNull();
      const [, light, dark] = pair!;
      const gap = Math.abs(hue(light) - hue(dark));
      expect(Math.min(gap, 360 - gap), `${token} hue moved between themes`).toBeLessThanOrEqual(3);
    }
  });
});
