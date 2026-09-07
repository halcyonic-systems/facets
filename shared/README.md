# shared/

The Halcyonic Frost stylesheet and fonts that the portal and the chat client
load, served at `/shared/` on the live site.

**Generated, not authored.** `frost.css` is written by
`scripts/gen-frost-shared.mjs` from the web face's source of truth
(`../web/src/index.css` for tokens, `../web/src/fonts.css` for faces). Change a
value there and re-run the generator; the portal and chat follow. Edits made
here are overwritten. The design system's single owner is
[`../web/DESIGN.md`](../web/DESIGN.md).

`fonts/` holds the woff2 files (Cormorant Garamond, Inter) the stylesheet
references.
