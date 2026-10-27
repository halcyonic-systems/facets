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
  /* The docs shell on the makeover rules (docs/design/makeover-2026-10.md):
     the app's ground, a white sheet, hairlines for every edge, Inter at
     --t-body on a 72-character measure, Cormorant 700 for the headings at
     --t-d1/d2/d3, the one label style for kickers, links in the accent, the
     shared focus ring from /shared/frost.css. Mono is for code only. */
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg-primary); color: var(--text-primary); font-family: var(--font-body); font-size: var(--t-body); line-height: 1.6; }
  a { color: var(--accent); text-decoration: underline; text-decoration-color: var(--rule-strong); text-underline-offset: 2px; transition: color var(--motion-fast) ease-out, text-decoration-color var(--motion-fast) ease-out; }
  a:hover { color: var(--accent-strong); text-decoration-color: currentColor; }
  .sheet { max-width: 56rem; margin: 0 auto; min-height: 100vh; background: var(--paper); border-left: 1px solid var(--border); border-right: 1px solid var(--border); }
  header.site { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 24px; padding: 12px 24px; border-bottom: 1px solid var(--border); }
  header.site .wordmark { font-size: var(--t-d3); white-space: nowrap; }
  header.site nav { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; min-width: 0; }
  header.site nav a { display: inline-flex; align-items: center; min-height: 32px; font-size: var(--t-sm); color: var(--text-secondary); text-decoration: none; }
  header.site nav a:hover { color: var(--accent); }
  main { padding: 48px 24px 64px; }
  .folio { display: flex; align-items: center; gap: 8px; font-size: var(--t-label); font-weight: 600; text-transform: uppercase; letter-spacing: var(--tracking-label); color: var(--text-muted); }
  .folio a { color: inherit; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; min-height: 24px; }
  .folio a:hover { color: var(--accent); }
  .folio svg { width: 1em; height: 1em; }
  .status { display: inline-block; padding: 2px 8px; border-radius: var(--radius-sm); background: var(--accent-soft); color: var(--accent); }
  h1.title { font-family: var(--font-display); font-weight: 700; font-size: var(--t-d1); line-height: 1.1; letter-spacing: -0.01em; margin: 12px 0 32px; }
  article { max-width: 72ch; overflow-wrap: break-word; }
  article h2 { font-family: var(--font-display); font-weight: 700; font-size: var(--t-d2); line-height: 1.15; margin: 48px 0 12px; }
  article h3 { font-family: var(--font-display); font-weight: 700; font-size: var(--t-d3); line-height: 1.2; margin: 32px 0 8px; }
  article h4 { font-size: var(--t-label); font-weight: 600; text-transform: uppercase; letter-spacing: var(--tracking-label); margin: 24px 0 8px; color: var(--text-secondary); }
  article p, article li { font-size: var(--t-body); color: var(--text-secondary); }
  article p { margin: 0 0 16px; }
  article strong { color: var(--text-primary); font-weight: 600; }
  article ul, article ol { padding-left: 24px; margin: 0 0 16px; }
  article li { margin: 4px 0; }
  article li > p { margin: 0; }
  article code { font-family: var(--font-mono); font-size: 0.875em; background: var(--bg-surface); border-radius: var(--radius-sm); padding: 1px 4px; overflow-wrap: anywhere; }
  article pre { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 16px; overflow-x: auto; margin: 0 0 24px; }
  article pre code { background: none; padding: 0; border-radius: 0; font-size: var(--t-num); line-height: 1.55; color: var(--text-primary); }
  article blockquote { margin: 0 0 16px; padding: 4px 0 4px 16px; border-left: 2px solid var(--accent); color: var(--text-secondary); }
  article blockquote p { margin: 8px 0; }
  .table-wrap { overflow-x: auto; margin: 0 0 24px; }
  article table { border-collapse: collapse; width: 100%; font-size: var(--t-sm); }
  article th, article td { text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border); vertical-align: top; color: var(--text-secondary); }
  article th { color: var(--text-primary); font-weight: 600; border-bottom: 1px solid var(--rule-strong); }
  article hr { border: 0; border-top: 1px solid var(--border); margin: 32px 0; }
  article img { max-width: 100%; }
  footer.page { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; flex-wrap: wrap; gap: 8px 24px; }
  footer.page a, footer.page span { font-size: var(--t-meta); color: var(--text-muted); }
  footer.page a { text-decoration: none; }
  footer.page a:hover { color: var(--accent); }
  @media (max-width: 640px) { main { padding: 32px 16px 48px; } header.site { padding: 12px 16px; } .sheet { border-left: 0; border-right: 0; } }
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
  // A wide table scrolls inside a wrapper; the table itself stays a table for assistive tech.
  body = body.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
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
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolygon points='40,4 68.3,16.6 76,44.9 59.4,70.1 20.6,70.1 4,44.9 11.7,16.6 40,4' stroke='%233d6373' stroke-width='2' fill='%23ffffff'/%3E%3C/svg%3E">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f3f6f9">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#16181a">
<link rel="stylesheet" href="/shared/frost.css">
<style>${SHELL_CSS}</style>
</head>
<body>
<div class="sheet">
  <header class="site">
    <a class="wordmark" href="${rootRel}">facets <span class="face">docs</span></a>
    <nav><a href="/">facets.systems</a><a href="/chat/">Chat</a><a href="/model/">Model</a><a href="${GITHUB}">GitHub</a></nav>
  </header>
  <main>
    ${isIndex ? "" : `<div class="folio"><a href="${rootRel}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true"><path d="M20 12 H5 M11 6 L5 12 L11 18"/></svg>Index</a></div>`}
    <div class="folio" style="margin-top:${isIndex ? 0 : 24}px">${isIndex ? "Documentation" : "Document"}${status ? `<span class="status">${esc(status)}</span>` : ""}</div>
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
