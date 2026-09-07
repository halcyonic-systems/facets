# portal/

The front door at [facets.systems](https://facets.systems): one static page that
presents the three facets (Chat, Model, Docs) and nothing else.

**Files.** `index.html` is the page; `alt-b.html` is a kept design variant, not
served. Styling is `../shared/frost.css` (generated; edit the tokens in
`../web/src/index.css` instead).

**How it reaches the site.** `scripts/publish-site.sh` copies this directory to
the root of the assembled `_site/` and flips the `MODEL_LIVE` flag in
`index.html` when run with `--with-model`. Do not flip the flag by hand; it
records whether the Model door is open on the live snapshot.

**Preview.** `scripts/publish-site.sh --dry-run` then `scripts/preview-site.sh`
(port 5321).
