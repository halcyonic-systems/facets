# Privacy

What leaves your browser when you use facets.systems, and what happens to it.
The short version: the modeling instrument sends nothing; the two features that
talk to a language model send what you type to them, and only after you turn
them on.

## What never leaves the page

The canvas, the SL compiler, every lens verdict, and every run are WebAssembly
executing in your browser tab. Authoring a model, judging it, running it against
your own CSV, saving it to the in-browser library, and exporting it make no
network request. There is no analytics script on the site.

## What the hosted reasoner receives

Two opt-in features talk to Halcyonic's hosted service at `api.facets.systems`:

- **Chat** (`/chat/`): the questions you ask and the answers returned.
- **The Model co-author** (`/model/`, off by default, behind a "Turn on" gate):
  the SL text you ask it to draft or revise, the kernel's findings it is asked
  to explain, and the model context you choose to send. Your canvas is not sent
  unless you ask the co-author to read it.

Requests are made under an **anonymous session** created in your browser the
first time you use one of these features. It is a random identifier, not an
account; no name or email is asked for. Rate limits are enforced per session and
per address (currently ten requests a minute, one hundred a day). The service
forwards the text to a language model provider to produce the answer.

## What is kept, and for how long

The hosted service logs each request with its answer under the anonymous
session so that a conversation can be shown again in the same browser. The
retention rule: kept while the session is in use, purged after one year of
inactivity for sessions that were never claimed with an email. Sessions that
are later claimed are kept until you delete them. Shared permalinks (`/a/<id>`)
are read-only snapshots and survive the deletion of the session that made them
unless you ask for them to be removed too.

## Point it somewhere else

Both features take an endpoint. Run your own reasoner and enter its address at
the gate (or build the site with `VITE_GSR_URL` set) and nothing reaches
Halcyonic. The default in a local build is `http://localhost:5010`.

## Asking for your data, or its erasure

Email rsthornton@gmail.com with `facets privacy` in the subject and the session
identifier shown in the app. Export and erasure are done by hand today; there is
no self-service button yet (tracked in the roadmap).

*Last reviewed 2026-09-07. Changes to what is collected are recorded in this
file's history.*
