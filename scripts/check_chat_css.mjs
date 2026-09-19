// The chat client is one file with its stylesheet inline. A brace out of
// place there does not fail loudly: the browser drops every rule after the
// point where its parser gave up, and the page renders unstyled while the
// file still "looks" balanced (#419 shipped with a stray `}` and a missing
// one, 83 of 438 rules parsed, and facets.systems/chat lost its styling).
// This parses each <style> block with postcss, which refuses an unclosed
// block or an unexpected `}`, and reports the rule count so a collapse shows
// as a number.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "web", "package.json"));
const postcss = require("postcss");

const html = readFileSync(join(root, "chat", "index.html"), "utf8");
const blocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
if (blocks.length === 0) {
  console.error("check_chat_css: no <style> block found in chat/index.html");
  process.exit(1);
}

const MIN_RULES = 300;
let total = 0;
let failed = false;
blocks.forEach((css, i) => {
  try {
    const ast = postcss.parse(css, { from: `chat/index.html <style> #${i + 1}` });
    let n = 0;
    ast.walkRules(() => n++);
    total += n;
  } catch (e) {
    failed = true;
    console.error(`check_chat_css: <style> #${i + 1} does not parse: ${e.reason ?? e.message} (line ${e.line ?? "?"})`);
  }
});
if (failed) process.exit(1);
if (total < MIN_RULES) {
  console.error(`check_chat_css: only ${total} rules parsed (expected at least ${MIN_RULES}); the stylesheet has probably collapsed`);
  process.exit(1);
}
console.log(`check_chat_css: ok (${total} rules across ${blocks.length} block${blocks.length > 1 ? "s" : ""})`);
