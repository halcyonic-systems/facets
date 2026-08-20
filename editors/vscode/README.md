# SL for VS Code

Syntax highlighting for `.sl` files — SL, the systems language whose
specification lives at [`docs/language/spec.md`](../../docs/language/spec.md).

The grammar's vocabulary is not hand-maintained: `scripts/check_tm_grammar.mjs`
(part of `just check`) holds every alternation equal to
`fixtures/contract/sl_keywords.json`, which the kernel writes from its own
keyword consts. If the language grows a word, this grammar fails CI until it
learns it.

## Install (development)

No marketplace build; run it straight from the repo:

```sh
code --extensionDevelopmentPath="$(pwd)/editors/vscode" assets/examples/translation-apparatus.sl
```

Or symlink into your extensions directory:

```sh
ln -s "$(pwd)/editors/vscode" ~/.vscode/extensions/halcyonic.sl-language-0.1.0
```

## Scopes

Stock themes render these out of the box; a theme can target the KIND value
words individually via `constant.language.kind.<kind>.sl`.

| Scope | What it covers |
|---|---|
| `keyword.control.sl` | line heads (`system`, `component`, `flow`, …) |
| `keyword.other.sl` | the rest of the reserved + positional vocabulary |
| `support.constant.sl` | kingdom, primitive, and scale value words |
| `constant.language.kind.<k>.sl` | `energy`, `matter`, `field`, `informational` |
| `storage.modifier.annotation.sl` | `@lens`, `@pos`, `@directed` |
| `keyword.operator.arrow.sl` | `->` |
| `entity.name.type.sl` | bare declared names |
