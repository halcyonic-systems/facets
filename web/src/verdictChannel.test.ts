// #233 §4 — the verdict channel is kernel-only, and this is what makes that
// mechanical rather than stated.
//
// The doctrine: no LLM output ever sits next to a kernel verdict. The audit
// found the enforcement was three comments and no test — `ValidationIssue` was
// a plain record, so merging a co-author turn into `ValidationResult.issues`
// was one line and compiled. The mechanism is now a provenance brand
// (`kernel/types.ts`): a non-exported `unique symbol` key that only the wasm
// boundary's cast and the test mint can produce.
//
// A brand is worthless without a separating instance, so the first test below
// type-checks a file that COMMITS the violation and fails if it compiles. The
// second and third close the two ways around the brand: importing the test
// mint from production code, and asserting the brand on with a cast.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = dirname(fileURLToPath(import.meta.url));
const WEB = dirname(SRC);

function sources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) out.push(p);
    }
  };
  walk(SRC);
  return out;
}

const isTest = (p: string) => /\.test\.tsx?$/.test(p);

/** Type-check one file in isolation, returning tsc's diagnostics. */
function typecheck(file: string): { ok: boolean; output: string } {
  const dir = mkdtempSync(join(tmpdir(), "verdict-channel-"));
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

describe("the verdict channel refuses LLM output", () => {
  // The separating instance. `mergeLlmIntoVerdict.violation.ts` concatenates a
  // co-author turn onto the kernel's issue list — the exact one-line merge the
  // audit named. If this ever compiles, the brand has stopped defending
  // anything and the doctrine is back to being a comment.
  it("a co-author turn cannot be merged into a ValidationResult", { timeout: 120_000 }, () => {
    const probe = join(SRC, "kernel", "mergeLlmIntoVerdict.violation.ts");
    const { ok, output } = typecheck(probe);
    expect(ok, `the violation compiled — the verdict channel is unguarded:\n${output}`).toBe(false);
    // Fail for the RIGHT reason: the missing provenance brand, not an unrelated
    // error that would make this test pass for free.
    expect(output).toMatch(/mergeLlmIntoVerdict\.violation\.ts/);
    expect(output).toMatch(/ValidationIssue/);
  });

  // The test mint (`kernel/testVerdict.ts`) is a real forge; it is safe only
  // while nothing shippable can reach it.
  it("only tests import the test mint", () => {
    const offenders = sources().filter(
      (p) =>
        !isTest(p) &&
        !p.endsWith(join("kernel", "testVerdict.ts")) &&
        /from\s+["'][^"']*\/testVerdict["']/.test(readFileSync(p, "utf8")),
    );
    expect(offenders.map((p) => relative(WEB, p))).toEqual([]);
  });

  // The other way around a brand is to assert it on. The mint is the one place
  // allowed to do that, and it is one line long so the assertion is reviewable.
  it("nothing else asserts the brand on with a cast", () => {
    const cast = /\bas\s+(?:unknown\s+as\s+)?Validation(?:Issue|Result)\b/;
    const offenders = sources().filter(
      (p) => !p.endsWith(join("kernel", "testVerdict.ts")) && cast.test(readFileSync(p, "utf8")),
    );
    expect(offenders.map((p) => relative(WEB, p))).toEqual([]);
  });
});
