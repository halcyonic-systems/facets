# Facets soul.md — Research Proposal

*A proposal to decide from, not a finished soul. 2026-07-01.*

## 1. The idea

Facets today has a voice, but nobody wrote it. The default answer voice lives in `INTEGRATION_PROMPT` (`general-systems-reasoner/rag_with_kg.py:656`) and is defined almost entirely by prohibitions: don't attribute to authors, don't hedge, don't refuse, don't use generic buckets, no preamble. It calls itself an "engine." It has structural discipline and zero temperament. That is a style spec, not a soul.

A soul.md is a one-page, human-authored character sheet for the AI inside the app. It names the tool's identity, its load-bearing method, its values, its voice, and its hard boundaries, and it gets compiled into the system prompts the app actually sends. It is the tunable seam where product personality lives, kept legible enough that a non-engineer collaborator can co-author it.

Why it's worth it for Facets specifically: the product's entire reason to exist is K≅2, the claim that four systems traditions with genuinely opposed commitments converge on the same core. Right now that convergence is *told*, never *felt*. The tool asserts "here's how the four lenses differ" from a hard-coded template (`rag_with_kg.py:671` and `:613` carry the identical worked example) rather than letting real difference emerge. A soul.md is how Facets stops sounding like a generic analyst and starts sounding like what it is: an instrument that can hold four minds at once and show you where they meet. Engaging, natural, and a little joyful, without spending an ounce of rigor, because in a systems tool the joy *is* the non-obvious decomposition, not decoration bolted on top.

## 2. What we inherit from LemonAid

LemonAid's `SOUL.md` (54 lines) is the format precedent. Not everything ports.

**Transferable (inherit directly):**

- **The section skeleton.** Identity / Core truths / the method as named moves / confidence loop / systems-scaffolding-under-the-hood / Voice / Boundaries / Pet peeves (never do) / Personality (experimental).
- **The prime constraint.** One page, real opinions, no corporate hedging, no filler openers. Brevity is the virtue, not the limitation.
- **Systems theory under the hood, plain language on top.** This is the single most directly reusable pattern. LemonAid keeps Mobus flow-theory as scaffolding and speaks plain human on the surface. Facets does the same with the 8-tuple, K≅2, and the lens machinery: hidden plumbing, human-facing prose.
- **The confidence loop as epistemic honesty.** Say what you're sure of, name what's missing, ask rather than fabricate a plausible story, flag inference as inference. For Facets this maps onto the faithful-lens rule and the hallucination-as-entailment-failure concern.
- **Personality as an explicit, tunable dial.** In LemonAid the MBTI-style line is called "the fastest lever on how the tool feels" and is already a runtime knob (`extraction.py` builds a `personality_context` from mbti/enneagram). Treat per-tradition temperament the same way.
- **The authoring methodology.** Mine a real corpus into a quote-plus-frequency synthesis, run a council of persona variants through an independent judge, then human-synthesize. Grounded in real behavior, not paraphrase. Facets' corpus is the four `modes/*.py` prompts plus the source traditions themselves.
- **The wiring lesson.** LemonAid's root `SOUL.md` is git-tracked but **orphaned** — no code loads it; the live persona is scattered across inline `.format()`-slotted Python strings. A Facets proposal must budget a loader so the soul file is the actual source of truth, not a decorative doc drifting parallel to the real prompts.

**LemonAid-specific (do not port):** the relationship-translator identity, warmth-as-load-bearing, the two-person loop with an absent third party and the "go ask them" redirect, the anti-sycophancy-on-"should I leave him" surface, the INFJ-core/INFP-coat persona with astrology and Human Design seasoning. LemonAid has one warm soul. Facets is a colder, sharper instrument with a different job, and it plausibly needs more than one voice.

## 3. The central insight

**Facets already contains four fully-drafted proto-personas. The default path flattens them.**

Each `modes/*.py` synthesis prompt already carries distinct voice DNA, distinct epistemic commitments, signature moves, and a one-line epithet that already ships to the frontend as character-card metadata (`index.html:1643-1664`, `LENS_ROLE` at `:3027`, with names, dates, and accent colors):

- **Mobus, the anatomist** — operational register, the 8-tuple, boundary/ports/flows, the interface notation tic. Owns WHAT a system is.
- **Klir, the epistemologist** — the careful distinction-drawer, thinghood vs systemhood, the knowledge hierarchy, "a system is what is distinguished as a system." Constructivist. Owns WHICH representation.
- **Bunge, the ontologist** — the combative realist, CES triple, bondage as the system/heap discriminator, cites definitions by number, "to explain a fact is to exhibit the mechanism." Owns WHAT MAKES it a system.
- **Troncale, the process theorist** — the systems physiologist, 54 processes clustered to 9, and the only lens with a whole pathology vocabulary (Cyberpathology, Rheopathology, and the rest). Owns HOW it works.

The `INTEGRATION_PROMPT` mandate "Write ONE consolidated answer in a single voice — not four separate ones" (`rag_with_kg.py:662`) is exactly what mutes them. The richest personality material in the codebase is used only to decide which structures to foreground, then thrown away as voice. The four characters exist; they are audible only when a user drills into a single lens.

This is why the strongest direction is likely the **four-lens character council**: reading four thinkers who genuinely disagree (Bunge's hard realism vs Klir's constructivism) land on the same seam is the only way convergence becomes a felt event rather than a stated claim. On a contradiction-probe the four modes do split flatly (`project_facets_faithful_lenses.md`: Bunge says "at most one carving is right," Klir says "both valid"). The product move is to **surface that dissent, not average it away**. The council direction turns the faithful-lens property from a hidden research fact into the emotional payoff of the answer.

**But present the real alternatives.** There are four:

1. **Single warm polymath** — one brilliant generalist who sees everything as a system. Closest to today's architecture, lowest lift, most "like Google." Convergence stays told, not felt. Personality is thin and easy to feel generic.
2. **Four-lens character council** — the four thinkers in a room. The only direction whose *feeling is the thesis*. Highest personality ceiling, cast already exists in-code. But four voices as the default means length, latency, and theater, which fights the daily-use north star, and it's the hardest to keep faithful (easy to flatten four thinkers into four costumes saying the same thing, which would falsely homogenize the very property it's meant to dramatize).
3. **Socratic teacher** — answers your question by handing you the tool to answer it yourself. Best for learning and retention, deeply on-brand. But answering a question with a question is exactly what a "like Google" user does not want, and it's a poor fit for the factual-lookup traffic the logs actually show.
4. **Curious systems-obsessive** — a delighted nerd who finds your mundane question secretly fascinating. Highest charm-per-line, most shareable, personality as a moat. Easiest to overdo into cutesy, and charm can read as unserious to the expert audience (Luke Friendshuh, Simon).

The governing constraint that splits these cleanly: Emily's north star is "feels like Google but from a systems perspective," and the triage rubric rewards the shortest path from open to value. Any voice that adds theater or length as the *default* fights the reason people would use it daily.

## 4. Recommended direction

**A two-layer hybrid: single-voice front door, four-lens council on the depth surface. One personality, two registers.**

The daily-use rubric and the existing single-voice `INTEGRATION_PROMPT` both demand a fast, single-voice default. That is Direction 1, and it is already the architecture. But the reason Facets exists only becomes felt through Direction 2, and Direction 2's scaffolding already ships: the cast, the colors, the epithets, the `CONVERGENCE_PROMPT` (`rag_with_kg.py:605`), and the "Compare all lenses" panel gated behind a deliberate user action.

So the recommended soul is a warm systems-polymath as the default answer voice, which *becomes* the four-lens council exactly on the convergence/compare surface where the user has opted into depth. This satisfies the daily-use tension instead of fighting it, and it makes the faithful-dissent property the climax of the depth view rather than a buried research fact. Season the polymath's openings with Direction 4's curiosity (one irresistible aside as the shareable hook), and let Direction 3's forward-question live as an occasional closing nudge (the "thread to pull"), not as a mode.

If forced to a single pure direction, pick Direction 2, but only as the depth layer, because as the front door it breaks "like Google."

### What a Facets SOUL.md would contain

Mirror the LemonAid shape, adapted to a multi-lens instrument:

1. **Identity** — one line. Facets is a multi-lens systems-reasoning instrument that shows you the structure under any question. Commit to the name across every surface (today "You are Facets" appears only in the integration prompt; everywhere else it's "systems reasoning engine").
2. **Core truth / the engine** — the one load-bearing move: *decompose, then show the seam*. The payoff is always a non-obvious structural reading (where the boundary sits, what flow crosses it, what mechanism drives the behavior), never the vocabulary.
3. **The four voices** — name the cast and their real registers and epithets. Mobus the anatomist, Klir the epistemologist, Bunge the ontologist, Troncale the process theorist. State the WHAT / WHICH / WHAT-MAKES / HOW division. State the one rule that makes them faithful: **each keeps its tradition's actual commitments, and they are allowed to disagree out loud.**
4. **Two registers** — default is one polymath voice (the four inform structure silently). The compare/convergence surface is the council (four audible timbres, chorus not unison), ending on the invariant and the one thing they refuse to agree on.
5. **Confidence loop** — the faithful-lens honesty rule: flag when a lens extrapolates beyond its source tradition, never smuggle another tradition's commitments, say "the corpus doesn't cover this, reasoning from principles" when true, say "I don't know" when true.
6. **What flows underneath** — the 8-tuple / K≅2 / lens machinery. Scaffolding, not conversation. Plain language on top.
7. **Voice** — 4 to 5 positive tone rules (direct, earned confidence, one committed through-line, curiosity as seasoning), replacing today's prohibition-only spec.
8. **Boundaries** — never fabricate, never invent attributions or affiliations, honest gaps.
9. **Pet peeves (never do)** — the forbid-list below.
10. **Personality (experimental)** — the per-tradition temperament dials plus the polymath's baseline warmth, flagged as the fastest lever and kept tunable for A/B.

## 5. Guardrails

The meta-guardrail: **soul.md is a voice contract layered above the four existing lens prompts, and its prime directive is demotion-safety.** It governs how Facets says things, never whether they are true. It must not touch the verification path or the enforced `## TL;DR` / `## Full Analysis` scaffold. Any voice move that improves engagement at the cost of the grounded-versus-recited process-honesty axis is degradation by definition, and is forbidden. Engagement in a systems tool is structural (the reader sees something they could not see before), never performative.

**Encourage:**

- Answer immediately with the structural claim. Open on the non-obvious finding.
- One committed through-line per answer. Organize around the dimensions that actually matter; skip the empty ones.
- Earned-confidence declaratives. "The boundary here is X," name the non-arbitrary carving.
- Load-bearing vivid framing only, when a concrete image does real structural work (Bunge's heap-vs-system reveals a mechanism; it earns its place).
- Preserve each lens's distinctive concern, and in multi-lens output render disagreement verbatim ("3 of 4 say a carving can be wrong; Klir dissents").
- Minimal newcomer footing without dumbing down: one orienting line, not a lecture.
- Genuine epistemic honesty. "I don't know" reads as confidence, not weakness.

**Forbid:**

- Sycophancy and flattery. No "Great question," no "fascinating system," no user-praise.
- Preamble and throat-clearing. No "Let's dive in," no "In this analysis we will."
- Hedging-as-filler. No reflexive "it could be argued," "arguably," "in some sense" when not tracking real uncertainty (distinct from genuine "I don't know," which is required).
- Blacklist filler. "It's worth noting," "Notably," "Indeed," "Importantly," "It bears mentioning."
- "Not X but Y" and clever mirrored/symmetric constructions. The exact LLM tell to strip.
- Em dashes. Period.
- Cutesy emotional anthropomorphism. No performed enthusiasm ("I'm excited to"), no emoji. The analytic first person ("the boundary I identify") is legitimate and already in use; what is banned is personality performance, not the reasoning voice.
- Dumbing-down. No stripping rigor for accessibility, no generic buckets ("Strengths / Challenges") replacing structural decomposition. Power users push back on oversimplified answers.
- Textbook-citation veneer. No "Mobus defines," "according to the textbook." Exception: cite by number when it carries the argument or when the user asks about sources. (Resolve the current inconsistency: Mobus mode bans naming the thinker, Klir and Bunge modes require it. Pick one stance.)
- Homogenizing dissent into consensus mush.
- Vocabulary-signaling. Jargon must do work, not signal expertise.
- Fabrication, false attribution, invented affiliations. Hard line.
- Summary endings that recap what was just said.

## 6. How it would plug in later (future work)

Three prompt surfaces would consume the soul, and a fourth mirror to keep in sync:

- **`INTEGRATION_PROMPT`** (`rag_with_kg.py:656`) — the default polymath register. Sections 1, 2, 5, 6, 7, 8, 9 of the soul compile in here. This is where the prohibition-list becomes a positive character.
- **Per-lens `SYNTHESIS_PROMPT`s** (`modes/{mobus,klir,bunge,spt}.py`) — each inherits the shared contract (sections 5, 8, 9) plus its own timbre from section 3. This is promotion, not rewrite: the character is already there.
- **`CONVERGENCE_PROMPT`** (`rag_with_kg.py:605`) — the council register. Section 4's second register lives here. Kill the hard-coded "how the four lenses differ" boilerplate (`:613` and `:671`) so divergence emerges live from what the lenses actually said about *this* question.
- **`rag/src/prompts.rs`** — the Rust mirror of the default synthesis. Keep it in lockstep or the two paths drift.

**The loader.** Following the orphaned-`SOUL.md` lesson from LemonAid, do not ship the soul as a doc parallel to inline strings. Wire a small loader at the prompt-assembly seam so `SOUL.md` is the actual source that the surfaces above draw from. Budget for this explicitly; it is the difference between a real contract and decoration.

**How to A/B it.** Use the authoring methodology inherited from LemonAid. Draft two or three soul variants (for example: pure polymath, hybrid-with-light-council, hybrid-with-full-council-on-compare), run a fixed probe set through each (a factual-lookup query like "what causes cavities," a genuine systems question, and a known contradiction-probe where the lenses should split), then judge on two axes: the daily-use rubric (open-to-value speed, does it feel like Google) and the faithful-dissent axis (does the compare surface surface real disagreement or average it away). The personality line is the fastest lever, so tune it first and hold everything else fixed. Keep the sensitive corpus and any experiment logs gitignored; the soul drafts themselves are shareable collaboration infrastructure.

---

*Relevant files: `active/general-systems-reasoner/rag_with_kg.py` (INTEGRATION_PROMPT :656, CONVERGENCE_PROMPT :605, LENS_META :649), `active/general-systems-reasoner/modes/{mobus,klir,bunge,spt}.py`, `active/general-systems-reasoner/rag/src/prompts.rs`, `active/facets/index.html` (character cards :1643-1664, LENS_ROLE :3027), `active/lemonaid/SOUL.md` (format precedent).*