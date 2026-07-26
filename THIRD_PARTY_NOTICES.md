# Third-party notices

Everything in this file is an obligation to someone else. It travels with the
artifact, not merely with the repository: `LICENSE` and this file are bundled
into the macOS app's `Contents/Resources/` and copied into `web/dist/` at build
time, because MIT and the SIL Open Font License both require their notices to
accompany *redistributions*, and a `.app` handed to a stranger is a
redistribution.

The inventory tables are generated from `npm ls --prod` and `cargo metadata`
(wasm32 platform filter) — the same metadata the build reads. Regenerate with
`python3 scripts/gen_notices.py` after any dependency change.

bert-lenses itself is MIT; see `LICENSE`. Every crate under `crates/` was
written for this repository, so nothing here is owed for the kernel — this file
covers the fonts, KaTeX, and the dependency graph that reaches the artifact.

*Lineage, not an obligation: bert-lenses grew out of the BERT project
(`halcyonic-systems/bert`). The kernel crates here were written for this
repository.*

---

## 1. Bundled fonts — SIL Open Font License 1.1

Three faces are vendored as `.woff2` in `web/src/fonts/` and compiled into the
bundle (a desktop app has no network, so they cannot be fetched). The OFL
requires this notice to accompany the fonts.

    The three UI faces vendored in this directory, each under the SIL Open Font
    License 1.1 (reproduced in full below):

    Inter (inter-*.woff2)
    Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter)

    JetBrains Mono (jetbrains-mono-*.woff2)
    Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)

    Cormorant Garamond (cormorant-garamond-*.woff2)
    Copyright 2015 the Cormorant Project Authors (github.com/CatharsisFonts/Cormorant)

    This Font Software is licensed under the SIL Open Font License, Version 1.1.
    This license is copied below, and is also available with a FAQ at:
    https://scripts.sil.org/OFL


    -----------------------------------------------------------
    SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
    -----------------------------------------------------------

    PREAMBLE
    The goals of the Open Font License (OFL) are to stimulate worldwide
    development of collaborative font projects, to support the font creation
    efforts of academic and linguistic communities, and to provide a free and
    open framework in which fonts may be shared and improved in partnership
    with others.

    The OFL allows the licensed fonts to be used, studied, modified and
    redistributed freely as long as they are not sold by themselves. The
    fonts, including any derivative works, can be bundled, embedded,
    redistributed and/or sold with any software provided that any reserved
    names are not used by derivative works. The fonts and derivatives,
    however, cannot be released under any other type of license. The
    requirement for fonts to remain under this license does not apply
    to any document created using the fonts or their derivatives.

    DEFINITIONS
    "Font Software" refers to the set of files released by the Copyright
    Holder(s) under this license and clearly marked as such. This may
    include source files, build scripts and documentation.

    "Reserved Font Name" refers to any names specified as such after the
    copyright statement(s).

    "Original Version" refers to the collection of Font Software components as
    distributed by the Copyright Holder(s).

    "Modified Version" refers to any derivative made by adding to, deleting,
    or substituting -- in part or in whole -- any of the components of the
    Original Version, by changing formats or by porting the Font Software to a
    new environment.

    "Author" refers to any designer, engineer, programmer, technical
    writer or other person who contributed to the Font Software.

    PERMISSION & CONDITIONS
    Permission is hereby granted, free of charge, to any person obtaining
    a copy of the Font Software, to use, study, copy, merge, embed, modify,
    redistribute, and sell modified and unmodified copies of the Font
    Software, subject to the following conditions:

    1) Neither the Font Software nor any of its individual components,
    in Original or Modified Versions, may be sold by itself.

    2) Original or Modified Versions of the Font Software may be bundled,
    redistributed and/or sold with any software, provided that each copy
    contains the above copyright notice and this license. These can be
    included either as stand-alone text files, human-readable headers or
    in the appropriate machine-readable metadata fields within text or
    binary files as long as those fields can be easily viewed by the user.

    3) No Modified Version of the Font Software may use the Reserved Font
    Name(s) unless explicit written permission is granted by the corresponding
    Copyright Holder. This restriction only applies to the primary font name as
    presented to the users.

    4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
    Software shall not be used to promote, endorse or advertise any
    Modified Version, except to acknowledge the contribution(s) of the
    Copyright Holder(s) and the Author(s) or with their explicit written
    permission.

    5) The Font Software, modified or unmodified, in part or in whole,
    must be distributed entirely under this license, and must not be
    distributed under any other license. The requirement for fonts to
    remain under this license does not apply to any document created
    using the Font Software.

    TERMINATION
    This license becomes null and void if any of the above conditions are
    not met.

    DISCLAIMER
    THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
    OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
    COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
    INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
    DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
    OTHER DEALINGS IN THE FONT SOFTWARE.

---

## 2. KaTeX — MIT

KaTeX renders the formal notation. Its JavaScript and CSS are compiled into the
shipped bundle.

    The MIT License (MIT)

    Copyright (c) 2013-2020 Khan Academy and other contributors

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.

---

## 3. npm dependencies reaching the artifact

Production dependencies only — the dev toolchain (Vite, Vitest, TypeScript,
Tailwind's compiler) builds the artifact but ships no code in it.

| Package | Version | Declared licence |
| --- | --- | --- |
| `@babel/runtime` | 7.29.7 | MIT |
| `@types/d3-array` | 3.2.2 | MIT |
| `@types/d3-color` | 3.1.3 | MIT |
| `@types/d3-ease` | 3.0.2 | MIT |
| `@types/d3-interpolate` | 3.0.4 | MIT |
| `@types/d3-path` | 3.1.1 | MIT |
| `@types/d3-scale` | 4.0.9 | MIT |
| `@types/d3-shape` | 3.1.8 | MIT |
| `@types/d3-time` | 3.0.4 | MIT |
| `@types/d3-timer` | 3.0.2 | MIT |
| `bert-lenses-kernel` | 0.1.0 | Apache-2.0 |
| `clsx` | 2.1.1 | MIT |
| `commander` | 8.3.0 | MIT |
| `csstype` | 3.2.3 | MIT |
| `d3-array` | 3.2.4 | ISC |
| `d3-color` | 3.1.0 | ISC |
| `d3-ease` | 3.0.1 | BSD-3-Clause |
| `d3-format` | 3.1.2 | ISC |
| `d3-interpolate` | 3.0.1 | ISC |
| `d3-path` | 3.1.0 | ISC |
| `d3-scale` | 4.0.2 | ISC |
| `d3-shape` | 3.2.0 | ISC |
| `d3-time` | 3.1.0 | ISC |
| `d3-time-format` | 4.1.0 | ISC |
| `d3-timer` | 3.0.1 | ISC |
| `decimal.js-light` | 2.5.1 | MIT |
| `dom-helpers` | 5.2.1 | MIT |
| `eventemitter3` | 4.0.7 | MIT |
| `fast-equals` | 5.4.1 | MIT |
| `internmap` | 2.0.3 | ISC |
| `js-tokens` | 4.0.0 | MIT |
| `katex` | 0.17.0 | MIT |
| `lodash` | 4.18.1 | MIT |
| `loose-envify` | 1.4.0 | MIT |
| `object-assign` | 4.1.1 | MIT |
| `prop-types` | 15.8.1 | MIT |
| `react` | 19.2.7 | MIT |
| `react-dom` | 19.2.7 | MIT |
| `react-is` | 18.3.1 | MIT |
| `react-smooth` | 4.0.4 | MIT |
| `react-transition-group` | 4.4.5 | BSD-3-Clause |
| `recharts` | 2.15.4 | MIT |
| `recharts-scale` | 0.4.5 | MIT |
| `scheduler` | 0.27.0 | MIT |
| `tiny-invariant` | 1.3.3 | MIT |
| `victory-vendor` | 36.9.2 | MIT AND ISC |

---

## 4. Cargo dependencies reaching the wasm kernel

Resolved for `wasm32-unknown-unknown`, which is the only target whose code is
distributed. Workspace crates are omitted — they are this repository's own work,
covered by `LICENSE`.

| Package | Version | Declared licence |
| --- | --- | --- |
| `ahash` | 0.7.8 | MIT OR Apache-2.0 |
| `arrayvec` | 0.7.8 | MIT OR Apache-2.0 |
| `autocfg` | 1.5.1 | Apache-2.0 OR MIT |
| `bitvec` | 1.1.1 | MIT |
| `borsh` | 1.7.0 | MIT OR Apache-2.0 |
| `borsh-derive` | 1.7.0 | Apache-2.0 |
| `bumpalo` | 3.20.3 | MIT OR Apache-2.0 |
| `bytecheck` | 0.6.12 | MIT |
| `bytecheck_derive` | 0.6.12 | MIT |
| `bytes` | 1.12.1 | MIT |
| `cfg-if` | 1.0.4 | MIT OR Apache-2.0 |
| `cfg_aliases` | 0.2.1 | MIT |
| `console_error_panic_hook` | 0.1.7 | Apache-2.0/MIT |
| `enum-iterator` | 2.3.0 | 0BSD |
| `enum-iterator-derive` | 1.5.0 | 0BSD |
| `equivalent` | 1.0.2 | Apache-2.0 OR MIT |
| `funty` | 2.0.0 | MIT |
| `futures-core` | 0.3.32 | MIT OR Apache-2.0 |
| `futures-task` | 0.3.32 | MIT OR Apache-2.0 |
| `futures-util` | 0.3.32 | MIT OR Apache-2.0 |
| `getrandom` | 0.2.17 | MIT OR Apache-2.0 |
| `glam` | 0.30.10 | MIT OR Apache-2.0 |
| `hashbrown` | 0.12.3 | MIT OR Apache-2.0 |
| `hashbrown` | 0.17.1 | MIT OR Apache-2.0 |
| `indexmap` | 2.14.0 | Apache-2.0 OR MIT |
| `itoa` | 1.0.18 | MIT OR Apache-2.0 |
| `js-sys` | 0.3.103 | MIT OR Apache-2.0 |
| `memchr` | 2.8.3 | Unlicense OR MIT |
| `num-traits` | 0.2.19 | MIT OR Apache-2.0 |
| `once_cell` | 1.21.4 | MIT OR Apache-2.0 |
| `pin-project-lite` | 0.2.17 | Apache-2.0 OR MIT |
| `ppv-lite86` | 0.2.21 | MIT OR Apache-2.0 |
| `proc-macro-crate` | 3.5.0 | MIT OR Apache-2.0 |
| `proc-macro2` | 1.0.106 | MIT OR Apache-2.0 |
| `ptr_meta` | 0.1.4 | MIT |
| `ptr_meta_derive` | 0.1.4 | MIT |
| `quote` | 1.0.46 | MIT OR Apache-2.0 |
| `radium` | 0.7.0 | MIT |
| `rand` | 0.8.7 | MIT OR Apache-2.0 |
| `rand_chacha` | 0.3.1 | MIT OR Apache-2.0 |
| `rand_core` | 0.6.4 | MIT OR Apache-2.0 |
| `rend` | 0.4.2 | MIT |
| `rkyv` | 0.7.46 | MIT |
| `rkyv_derive` | 0.7.46 | MIT |
| `rust_decimal` | 1.42.1 | MIT |
| `rustversion` | 1.0.23 | MIT OR Apache-2.0 |
| `seahash` | 4.1.0 | MIT |
| `serde` | 1.0.228 | MIT OR Apache-2.0 |
| `serde-wasm-bindgen` | 0.6.5 | MIT |
| `serde_core` | 1.0.228 | MIT OR Apache-2.0 |
| `serde_derive` | 1.0.228 | MIT OR Apache-2.0 |
| `serde_json` | 1.0.150 | MIT OR Apache-2.0 |
| `simdutf8` | 0.1.5 | MIT OR Apache-2.0 |
| `slab` | 0.4.12 | MIT |
| `syn` | 1.0.109 | MIT OR Apache-2.0 |
| `syn` | 2.0.118 | MIT OR Apache-2.0 |
| `tap` | 1.0.1 | MIT |
| `tinyvec` | 1.12.0 | Zlib OR Apache-2.0 OR MIT |
| `tinyvec_macros` | 0.1.1 | MIT OR Apache-2.0 OR Zlib |
| `toml_datetime` | 1.1.1+spec-1.1.0 | MIT OR Apache-2.0 |
| `toml_edit` | 0.25.13+spec-1.1.0 | MIT OR Apache-2.0 |
| `toml_parser` | 1.1.2+spec-1.1.0 | MIT OR Apache-2.0 |
| `unicode-ident` | 1.0.24 | (MIT OR Apache-2.0) AND Unicode-3.0 |
| `uuid` | 1.23.5 | Apache-2.0 OR MIT |
| `version_check` | 0.9.5 | MIT/Apache-2.0 |
| `wasm-bindgen` | 0.2.126 | MIT OR Apache-2.0 |
| `wasm-bindgen-macro` | 0.2.126 | MIT OR Apache-2.0 |
| `wasm-bindgen-macro-support` | 0.2.126 | MIT OR Apache-2.0 |
| `wasm-bindgen-shared` | 0.2.126 | MIT OR Apache-2.0 |
| `winnow` | 1.0.4 | MIT |
| `wyz` | 0.5.1 | MIT |
| `zerocopy` | 0.8.54 | BSD-2-Clause OR Apache-2.0 OR MIT |
| `zmij` | 1.0.23 | MIT |
