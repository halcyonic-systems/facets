#!/usr/bin/env node
// Renders the LIVE doc set to a static /docs/ tree for facets.systems (#368).
//
//   node scripts/build-docs.mjs <out-dir>        e.g. _site/docs
//
// The set is the one scripts/doc_lint.py calls "published, load-bearing":
// docs/README.md (the index, served as /docs/), docs/*.md, docs/language/*.md.
// Nothing under design/, proposals/, decisions/ or archive/ is rendered; links
// into them, and into the rest of the repo, go to GitHub. There is deliberately
// no second index — the README is the front page.
//
// Each page is markdown → HTML (marked, a web/ devDependency) inside a small
// shell that links /shared/frost.css, the generated foundation the portal and
// chat already use. Title from the first heading, status word as a pill, the
// source file linked per page, the build sha in the footer.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "..");
const DOCS = join(REPO, "docs");
const GITHUB = "https://github.com/halcyonic-systems/facets";

const require = createRequire(join(REPO, "web", "package.json"));
let marked;
try {
  ({ marked } = require("marked"));
} catch {
  console.error("build-docs: marked is not installed — run `npm install` in web/ first");
  process.exit(1);
}

const out = process.argv[2];
if (!out) {
  console.error("usage: build-docs.mjs <out-dir>");
  process.exit(2);
}

const mdIn = (dir) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => join(dir, f))
    .filter((p) => statSync(p).isFile());
const SET = [...mdIn(DOCS), ...mdIn(join(DOCS, "language"))].sort();
const inSet = new Set(SET.map((p) => resolve(p)));

let sha = "unknown";
try {
  sha = execFileSync("git", ["-C", REPO, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
} catch {}

// docs/README.md → index.html; docs/x.md → x.html; docs/language/x.md → language/x.html
const htmlPathOf = (abs) => {
  const rel = relative(DOCS, abs).split("\\").join("/");
  return rel.replace(/(^|\/)README\.md$/, "$1index.html").replace(/\.md$/, ".html");
};

// A relative link from `src`: into the set → the sibling .html; elsewhere → GitHub.
function rewriteHref(src, href) {
  if (/^(?:[a-z]+:|#|\/)/i.test(href)) return href;
  const [pathPart, anchor = ""] = href.split(/(#.*)$/);
  if (!pathPart) return href;
  const target = resolve(dirname(src), pathPart);
  if (inSet.has(target)) {
    const from = posix.dirname(htmlPathOf(src));
    let to = posix.relative(from, htmlPathOf(target));
    if (!to.startsWith(".")) to = "./" + to;
    return to + anchor;
  }
  const relRepo = relative(REPO, target).split("\\").join("/");
  let isDir = false;
  try {
    isDir = statSync(target).isDirectory();
  } catch {}
  return `${GITHUB}/${isDir ? "tree" : "blob"}/main/${relRepo}${anchor}`;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const SHELL_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper-ground); color: var(--ink); font-family: var(--font-body); line-height: 1.6; }
  a { color: var(--ink); text-decoration: none; border-bottom: 1px solid var(--accent); padding-bottom: 1px; transition: color var(--transition-base); }
  a:hover { color: var(--accent); }
  .sheet { max-width: 56rem; margin: 0 auto; min-height: 100vh; background: var(--paper); border-left: 1px solid var(--rule-soft); border-right: 1px solid var(--rule-soft); }
  header.site { display: flex; align-items: baseline; justify-content: space-between; gap: 1.5rem; padding: 1.25rem 2rem; border-bottom: 1px solid var(--rule-soft); }
  header.site .wordmark, header.site nav a { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.22em; border: 0; }
  header.site .wordmark { color: var(--ink); }
  header.site .wordmark span { color: var(--accent); }
  header.site nav { display: flex; gap: 1.5rem; }
  header.site nav a { color: var(--ink-muted); }
  header.site nav a:hover { color: var(--accent); }
  main { padding: 3rem 2rem 4rem; }
  .folio { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.22em; color: var(--ink-muted); }
  .status { display: inline-block; margin-left: 0.75rem; padding: 0.1rem 0.5rem; border: 1px solid var(--accent); color: var(--accent); }
  h1.title { font-family: var(--font-display); font-weight: 500; font-size: 2.6rem; line-height: 1.1; letter-spacing: -0.01em; margin: 0.75rem 0 2rem; }
  article { max-width: 42rem; }
  article h2 { font-family: var(--font-display); font-weight: 500; font-size: 1.9rem; line-height: 1.15; margin: 2.75rem 0 0.9rem; padding-top: 1rem; border-top: 1px solid var(--rule); }
  article h3 { font-family: var(--font-display); font-weight: 600; font-size: 1.4rem; margin: 2rem 0 0.6rem; }
  article h4 { font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.08em; margin: 1.6rem 0 0.5rem; color: var(--ink-secondary); }
  article p, article li { font-size: 1rem; color: var(--ink-secondary); }
  article p { margin: 0 0 1.1rem; }
  article strong { color: var(--ink); font-weight: 600; }
  article ul, article ol { padding-left: 1.4rem; margin: 0 0 1.1rem; }
  article li { margin: 0.35rem 0; }
  article li > p { margin: 0; }
  article code { font-family: var(--font-mono); font-size: 0.86em; background: var(--paper-edge); padding: 0.08em 0.35em; }
  article pre { background: var(--paper-edge); border: 1px solid var(--rule-soft); padding: 1rem 1.2rem; overflow-x: auto; margin: 0 0 1.3rem; }
  article pre code { background: none; padding: 0; font-size: 0.82rem; line-height: 1.55; color: var(--ink); }
  article blockquote { margin: 0 0 1.2rem; padding: 0.2rem 0 0.2rem 1.1rem; border-left: 2px solid var(--accent-soft); color: var(--ink-secondary); }
  article blockquote p { margin: 0.4rem 0; }
  article table { border-collapse: collapse; width: 100%; margin: 0 0 1.4rem; font-size: 0.9rem; display: block; overflow-x: auto; }
  article th, article td { text-align: left; padding: 0.5rem 0.7rem; border-bottom: 1px solid var(--rule-soft); vertical-align: top; color: var(--ink-secondary); }
  article th { color: var(--ink); font-weight: 600; border-bottom: 1px solid var(--rule); font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; }
  article hr { border: 0; border-top: 1px solid var(--rule-soft); margin: 2rem 0; }
  article hr + h2 { border-top: 0; padding-top: 0; margin-top: 0; }
  article img { max-width: 100%; }
  footer.page { margin-top: 3.5rem; padding-top: 1rem; border-top: 1px solid var(--rule-soft); display: flex; flex-wrap: wrap; gap: 1.5rem; }
  footer.page a, footer.page span { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: var(--ink-muted); border: 0; }
  footer.page a:hover { color: var(--accent); }
  @media (max-width: 640px) { main { padding: 2rem 1.25rem 3rem; } h1.title { font-size: 2rem; } header.site { padding: 1rem 1.25rem; } }
`;

function render(src) {
  let md = readFileSync(src, "utf8");
  const titleMatch = md.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : relative(DOCS, src);
  if (titleMatch) md = md.replace(titleMatch[0], "");
  // The status carrier sits above the first ## heading: a bolded `Status: WORD` line.
  const head = md.split(/^## /m)[0];
  const status = head.match(/Status:\s*([A-Z]+(?:\(#\d+\))?)/)?.[1] ?? null;
  const isIndex = htmlPathOf(src) === "index.html";
  if (isIndex) {
    // The index's first paragraph tells a contributor how the file is enforced;
    // the visitor gets the reading list. Drop the paragraphs before "Start here".
    const cut = md.indexOf("## Start here");
    if (cut > 0) md = md.slice(cut);
  }
  let body = marked.parse(md, { gfm: true, breaks: false });
  body = body.replace(/href="([^"]+)"/g, (_, href) => `href="${esc(rewriteHref(src, href))}"`);
  const srcRel = relative(REPO, src).split("\\").join("/");
  const depth = htmlPathOf(src).split("/").length - 1;
  const rootRel = depth ? "../".repeat(depth) : "./";
  const pageTitle = isIndex ? "facets · docs" : `${title.replace(/`/g, "")} · facets docs`;
  const inlineMd = (s) => marked.parseInline(s);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(pageTitle)}</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='40,4 68.3,16.6 76,44.9 59.4,70.1 20.6,70.1 4,44.9 11.7,16.6 40,4' stroke='%233d6373' stroke-width='2' fill='%23fafafb'/%3E%3C/svg%3E">
<link rel="stylesheet" href="/shared/frost.css">
<style>${SHELL_CSS}</style>
</head>
<body>
<div class="sheet">
  <header class="site">
    <a class="wordmark" href="${rootRel}">facets&#8202;·&#8202;<span>docs</span></a>
    <nav><a href="/">facets.systems</a><a href="/chat/">Chat</a><a href="/model/">Model</a><a href="${GITHUB}">GitHub</a></nav>
  </header>
  <main>
    ${isIndex ? "" : `<div class="folio"><a href="${rootRel}" style="border:0;color:inherit">‹ Index</a></div>`}
    <div class="folio" style="margin-top:${isIndex ? 0 : 1.5}rem">${isIndex ? "Documentation" : "Document"}${status ? `<span class="status">${esc(status)}</span>` : ""}</div>
    <h1 class="title">${isIndex ? "The reference layer" : inlineMd(title)}</h1>
    <article>${body}</article>
    <footer class="page">
      <a href="${GITHUB}/blob/main/${srcRel}">Source · ${esc(srcRel)}</a>
      <span>Rendered from ${sha}</span>
    </footer>
  </main>
</div>
</body>
</html>
`;
}

let n = 0;
for (const src of SET) {
  const dest = join(out, htmlPathOf(src));
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, render(src));
  n++;
}
console.log(`build-docs: ${n} pages → ${out} (from ${sha})`);
