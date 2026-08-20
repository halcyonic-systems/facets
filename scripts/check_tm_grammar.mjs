// TextMate grammar ↔ keyword contract, both directions.
//
// The grammar (editors/vscode/syntaxes/sl.tmLanguage.json) carries hand-typed
// word alternations; the kernel publishes its vocabulary as
// fixtures/contract/sl_keywords.json (written by tests/sl_keywords.rs from the
// consts themselves). This gate holds the two equal so the grammar can never
// drift from the language: a word added to the kernel without the grammar
// fails, and a word invented in the grammar without the kernel fails.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = JSON.parse(readFileSync(join(root, "fixtures/contract/sl_keywords.json"), "utf8"));
const grammar = JSON.parse(
  readFileSync(join(root, "editors/vscode/syntaxes/sl.tmLanguage.json"), "utf8")
);

// A grammar alternation is `(?i)\b(a|b|c)\b`-shaped; the words are what sits
// between the innermost parens.
function words(match) {
  const m = /\(([^()?][^()]*)\)/.exec(match.replace(/\(\?i\)|\(\?<!\S\)/g, ""));
  if (!m) throw new Error(`no alternation found in: ${match}`);
  return m[1].split("|");
}

let failures = 0;
function assertSetEqual(label, actual, expected) {
  const a = new Set(actual.map((w) => w.toLowerCase()));
  const e = new Set(expected.map((w) => w.toLowerCase()));
  const missing = [...e].filter((w) => !a.has(w));
  const extra = [...a].filter((w) => !e.has(w));
  if (missing.length || extra.length) {
    failures++;
    console.error(`tm-grammar: ${label} drift`);
    if (missing.length) console.error(`  grammar missing: ${missing.join(", ")}`);
    if (extra.length) console.error(`  grammar extra: ${extra.join(", ")}`);
  }
}

const repo = grammar.repository;

assertSetEqual(
  "keyword.other.sl vs reserved ∪ positional",
  words(repo.keyword.match),
  [...fixture.reserved, ...fixture.positional]
);

assertSetEqual(
  "support.constant.sl vs kingdom ∪ primitive ∪ scale",
  words(repo["value-word"].match),
  [
    ...fixture.value_words.kingdom,
    ...fixture.value_words.primitive,
    ...fixture.value_words.scale,
  ]
);

assertSetEqual(
  "constant.language.kind.*.sl vs kind words",
  repo["kind-value"].patterns.flatMap((p) => words(p.match)),
  fixture.value_words.kind
);

assertSetEqual(
  "storage.modifier.annotation.sl vs annotations",
  words(repo.annotation.match),
  fixture.annotations
);

// Declaration heads are highlights layered over the same vocabulary — every
// head must be a known keyword, or the grammar names a line the parser has no
// production for.
const keywordSet = new Set(
  [...fixture.reserved, ...fixture.positional].map((w) => w.toLowerCase())
);
for (const head of words(repo["declaration-head"].match)) {
  if (!keywordSet.has(head.toLowerCase())) {
    failures++;
    console.error(`tm-grammar: declaration head \`${head}\` is not a kernel keyword`);
  }
}

if (failures) {
  process.exit(1);
}
console.log("tm-grammar: grammar vocabulary matches the keyword contract");
