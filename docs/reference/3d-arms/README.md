# Reference implementations — the 3D view's standalone arms

**Status: RESEARCH.** Four self-contained pages that preceded the 3D view in `web/src/canvas3d/` (ADR [`0007`](../../decisions/0007-3d-view-beta.md), #435). They are kept as reference implementations, not as code to import: each is one HTML file with its own layout, materials, lighting and controls, and each does at least one thing the shipped view does not yet do. Open any of them from `file://`; they load Three.js r128 from cdnjs and nothing else.

| File | Author | What it is | Worth harvesting |
|---|---|---|---|
| [`astra-worldmodel-viewer.html`](astra-worldmodel-viewer.html) | GPT-6 Astra, 2026-09-11 | The proof of concept that started this: a generic viewer over WorldModel JSON (the export format), with a file picker and drop-anywhere, orbit, explode, isolate, an entity search, a bottom-sheet inspector and flow particles. Ships with the translation-apparatus export embedded. | Its input path: open a file, drop anywhere. Its 18-pass port relaxation and lane bundling were ported into `canvas3d/layout.ts`. Its particle animation is the shape a stage 2 "texture" toggle would take. |
| [`astra.html`](astra.html) | GPT-6 Astra, 2026-09-29 | The blind-pick arm that won inside-versus-outside legibility on the corrected fixture: a hard-edged box shell, interfaces on its faces, environment things on a ring outside, a left-hand label column listing every thing with its role. | The box's edge and face shading — the depth cues the shipped superellipsoid lacks at rest. The label column as a legend. The richer ink weight. |
| [`opus-5.html`](opus-5.html) | Claude Opus 5, 2026-09-29 | The arm that tied with Astra on the corrected fixture: a sphere shell with a soft membrane, polyhedra keyed by primitive, lane-bundled tubes, a quiet instrument register close to the Frost tokens. Carries one pre-flight patch, a single CSS rule `[hidden]{display:none !important}`, without which its notice overlay covered the stage. | Its material and label restraint became the shipped look. |
| [`opus-5-5.html`](opus-5-5.html) | Claude Opus 5.5, 2026-09-29 | The third arm, ranked last on the corrected fixture. Rerun once after its first attempt spent the output ceiling on thinking. | Its legend row (kind swatches and body glyphs, top-left) is a clean piece of chrome. |

All three 2026-09-29 arms read the same [`fixture.json`](fixture.json): four models as `CanvasModel` plus Mobus `lens_facts` from `bert compile` / `bert verdict` (translation apparatus, steel plant level 1, digital computer level 1, LLM market), so they can be compared side by side with a model switcher on each page. The steel plant at level 1 is the model to judge on: three interior components, seven interfaces, six environment things. The LLM market has no interior at all, which is what made the first ranking wrong.

## Provenance

The sealed brief, the sealed prediction, the pre-flight notes and the ledger row live in the vault (`operations/writing/facets-3d-spike/`, `operations/calibration/blind-pick-ledger.md`, 2026-09-29). Outcome: on a model with a real interior, Opus 5 and Astra tied and Opus 5.5 placed last; the box shell was the harvest, refined into the shipped superellipsoid with a hard-box toggle. The pages here are the pristine model outputs with the v2 fixture injected, plus the one patch noted above.

Nothing in this folder is built, bundled, linted for tokens or run in CI. It is a record with working demos in it.
