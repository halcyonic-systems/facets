// #314 — the correction loop cannot reach a verdict. Two gates, both
// mechanical, and they cover different halves of the invariant.
//
// `verdictChannel.test.ts` is deliberately untouched by this feature; this
// file is its sibling for the correction path specifically.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = dirname(fileURLToPath(import.meta.url));
const WEB = dirname(SRC);

function typecheck(file: string): { ok: boolean; output: string } {
  const dir = mkdtempSync(join(tmpdir(), "correction-channel-"));
  try {
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify({ extends: join(WEB, "tsconfig.json"), files: [file] }),
    );
    try {
      execFileSync("npx", ["tsc", "-p", dir], { cwd: WEB, encoding: "utf8", stdio: "pipe" });
      return { ok: true, output: "" };
    } catch (e) {
      const err = e as { stdout?: string; stderr?: string };
      return { ok: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("a correction cannot reach a verdict", () => {
  // Forbidden shortcut 2: the author says "that one is fine actually" and the
  // review panel goes quiet. The separating instance rewrites the kernel's
  // issue list from the correction; if it compiles, human text can edit a
  // machine-checked refusal.
  //
  // What this gate does NOT catch, stated so it is not over-claimed: the brand
  // stops a correction MINTING a verdict row; it does not stop one DROPPING
  // rows, since a filter over branded issues is still branded issues. Verified
  // by mutation — deleting the minted row from the probe makes it compile and
  // turns this test green for the wrong reason. Dropping is closed elsewhere,
  // structurally: the verdict is recomputed by `analyzeCanvas` from the model
  // on every change, and App's `verdict` memo assembles kernel output only, so
  // there is no place a correction could reach in to remove an issue.
  it("a correction cannot be turned into a verdict row", { timeout: 120_000 }, () => {
    const probe = join(SRC, "kernel", "correctionSilencesVerdict.violation.ts");
    const { ok, output } = typecheck(probe);
    expect(ok, `the violation compiled — a correction can edit the kernel's issue list:\n${output}`).toBe(false);
    // Fail for the RIGHT reason: the missing provenance brand, not a typo.
    expect(output).toMatch(/correctionSilencesVerdict\.violation\.ts/);
    expect(output).toMatch(/ValidationIssue/);
  });

  // Forbidden shortcut 1: applying the correction to the model without
  // recompiling. The correction module's ONLY door into the kernel is the
  // deterministic compiler — it cannot ask for a verdict, so it cannot hand
  // one on, and it cannot mint a model any other way.
  it("the correction module's only kernel import is the compiler", () => {
    const src = readFileSync(join(SRC, "coauthor.ts"), "utf8");
    const imports = [...src.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"\.\/kernel"/g)];
    expect(imports.length, "coauthor.ts should import from ./kernel exactly once").toBe(1);
    const named = imports[0][1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    expect(named).toEqual(["compileSl"]);
  });

  // And it holds no verdict type at all, so there is nothing for a future
  // edit to concatenate onto. `VerdictFields` (unbranded, read-only) is what
  // reading a verdict needs; `ValidationIssue` / `ValidationResult` is what
  // producing one needs, and this module has no business producing one.
  it("the correction module never names a verdict type", () => {
    const src = readFileSync(join(SRC, "coauthor.ts"), "utf8");
    const body = src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""); // prose may discuss them
    expect(body).not.toMatch(/\bValidationIssue\b/);
    expect(body).not.toMatch(/\bValidationResult\b/);
  });
});
