# chat/

The Chat face of Facets, served at [facets.systems/chat/](https://facets.systems/chat/).
Ask a question about any system; the answer is grounded in the systems-science
corpus and shows its sources.

**What is here.** One hand-written `index.html` (the whole client: no framework,
no build step, no WebAssembly), `sw.js` (offline shell), `manifest.json` and the
icons (installable as a web app), `vendor/` (the libraries it loads, pinned
copies), `dev/` (local development helpers), and `docs/` (research about the
assistant's voice, not user documentation).

**What it talks to.** The General Systems Reasoner, a separate Python service.
The hosted site uses `api.facets.systems`; a local reasoner runs on port 5010.
Requests carry an anonymous session created in the browser; what is sent and
kept is in [`../PRIVACY.md`](../PRIVACY.md). The client computes no systems
verdicts of its own; that is the kernel's job in `../crates/`.

**Run it locally.** Assemble and serve the whole site:

```bash
scripts/publish-site.sh --dry-run    # builds _site/ and pushes nothing
scripts/preview-site.sh              # serves it at http://localhost:5321
```

Port 5321 matters: it is the origin a local reasoner's CORS list allows. Point
the client at your reasoner in its settings.

**Styling** comes from `../shared/frost.css`, which is generated from the web
face's tokens; do not edit it here.
