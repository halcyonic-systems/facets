// The SL editor mode: a pure per-line lexer, wrapped for CodeMirror.
//
// SL is line-oriented and the pane never needs a syntax tree — compiling is
// the kernel's job (compile_sl), and the kernel stays the only judge. This
// lexer exists for highlighting alone, driven by the keyword contract fixture
// via keywords.ts. If highlighting ever needs semantic facts the lexer cannot
// see (which name is declared, which flow is directed), the move is a kernel
// span export, not a smarter lexer here.
import { StreamLanguage } from "@codemirror/language";
import { Tag } from "@lezer/highlight";
import {
  ANNOTATIONS,
  DECLARATION_HEADS,
  KIND_WORDS,
  isKeyword,
  isValueWord,
} from "./keywords";

export type SlTokenType =
  | "comment"
  | "string"
  | "number"
  | "annotation"
  | "arrow"
  | "punct"
  | "head"
  | "kind"
  | "value"
  | "keyword"
  | "name";

export interface SlToken {
  from: number;
  to: number;
  type: SlTokenType;
  /** For `kind` tokens: which kind word, lowercased (energy | matter | …). */
  word?: string;
}

const WORD = /^[A-Za-z_@][A-Za-z0-9_@-]*/;
const NUMBER = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/;

/** Lex one line of SL into typed spans. Pure; whitespace is left uncovered. */
export function lexLine(line: string): SlToken[] {
  const tokens: SlToken[] = [];
  let i = 0;
  let first = true;
  while (i < line.length) {
    const ch = line[i];
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }
    if (ch === "#") {
      tokens.push({ from: i, to: line.length, type: "comment" });
      break;
    }
    if (ch === '"') {
      const close = line.indexOf('"', i + 1);
      const to = close === -1 ? line.length : close + 1;
      tokens.push({ from: i, to, type: "string" });
      i = to;
      first = false;
      continue;
    }
    if (line.startsWith("->", i)) {
      tokens.push({ from: i, to: i + 2, type: "arrow" });
      i += 2;
      first = false;
      continue;
    }
    const num = NUMBER.exec(line.slice(i));
    if (num && !/[A-Za-z_@-]/.test(line[i + num[0].length] ?? "")) {
      tokens.push({ from: i, to: i + num[0].length, type: "number" });
      i += num[0].length;
      first = false;
      continue;
    }
    const word = WORD.exec(line.slice(i));
    if (word) {
      const w = word[0];
      const to = i + w.length;
      const lower = w.toLowerCase();
      let type: SlTokenType;
      if (w.startsWith("@")) {
        // `@lens` opens a line; `@<base58>` rides a `decomposes` clause.
        type = ANNOTATIONS.has(lower) && first ? "annotation" : "name";
      } else if (first && DECLARATION_HEADS.has(lower)) {
        type = "head";
      } else if (KIND_WORDS.has(lower)) {
        type = "kind";
      } else if (isValueWord(lower)) {
        type = "value";
      } else if (isKeyword(lower)) {
        type = "keyword";
      } else {
        type = "name";
      }
      tokens.push(
        type === "kind" ? { from: i, to, type, word: lower } : { from: i, to, type }
      );
      i = to;
      first = false;
      continue;
    }
    tokens.push({ from: i, to: i + 1, type: "punct" });
    i++;
    first = false;
  }
  return tokens;
}

// Custom tags so a HighlightStyle can address SL's distinctions directly —
// the four KIND value words each get their own tag (KIND is ontology, not
// decoration, and each kind owns a --kind-* channel in index.css).
export const slTags = {
  comment: Tag.define(),
  string: Tag.define(),
  number: Tag.define(),
  annotation: Tag.define(),
  arrow: Tag.define(),
  punct: Tag.define(),
  head: Tag.define(),
  value: Tag.define(),
  keyword: Tag.define(),
  name: Tag.define(),
  kindEnergy: Tag.define(),
  kindMatter: Tag.define(),
  kindField: Tag.define(),
  kindInformational: Tag.define(),
};

function styleOf(tok: SlToken): string {
  if (tok.type === "kind") {
    return `kind-${tok.word}`;
  }
  return tok.type;
}

/** The CodeMirror language: a stream tokenizer over `lexLine`, re-lexing each
 *  line as the stream enters it. State is the token list for the current line
 *  plus a cursor into it. */
export const slLanguage = StreamLanguage.define<{ tokens: SlToken[]; idx: number }>({
  name: "sl",
  startState: () => ({ tokens: [], idx: 0 }),
  token(stream, state) {
    if (stream.sol()) {
      state.tokens = lexLine(stream.string);
      state.idx = 0;
    }
    if (state.idx >= state.tokens.length) {
      stream.skipToEnd();
      return null;
    }
    const tok = state.tokens[state.idx];
    if (stream.pos < tok.from) {
      stream.pos = tok.from;
      return null;
    }
    stream.pos = tok.to;
    state.idx++;
    return styleOf(tok);
  },
  languageData: {
    commentTokens: { line: "#" },
  },
  tokenTable: {
    comment: slTags.comment,
    string: slTags.string,
    number: slTags.number,
    annotation: slTags.annotation,
    arrow: slTags.arrow,
    punct: slTags.punct,
    head: slTags.head,
    value: slTags.value,
    keyword: slTags.keyword,
    name: slTags.name,
    "kind-energy": slTags.kindEnergy,
    "kind-matter": slTags.kindMatter,
    "kind-field": slTags.kindField,
    "kind-informational": slTags.kindInformational,
  },
});
