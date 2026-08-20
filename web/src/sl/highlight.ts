// Tag → class-name mapping only. Every color lives in index.css as a
// var(--…) rule on these classes; check-tokens.mjs polices that split.
import { HighlightStyle } from "@codemirror/language";
import { slTags } from "./mode";

export const slHighlight = HighlightStyle.define([
  { tag: slTags.comment, class: "sl-tok-comment" },
  { tag: slTags.string, class: "sl-tok-string" },
  { tag: slTags.number, class: "sl-tok-number" },
  { tag: slTags.annotation, class: "sl-tok-annotation" },
  { tag: slTags.arrow, class: "sl-tok-arrow" },
  { tag: slTags.punct, class: "sl-tok-punct" },
  { tag: slTags.head, class: "sl-tok-head" },
  { tag: slTags.value, class: "sl-tok-value" },
  { tag: slTags.keyword, class: "sl-tok-keyword" },
  { tag: slTags.name, class: "sl-tok-name" },
  { tag: slTags.kindEnergy, class: "sl-tok-kind-energy" },
  { tag: slTags.kindMatter, class: "sl-tok-kind-matter" },
  { tag: slTags.kindField, class: "sl-tok-kind-field" },
  { tag: slTags.kindInformational, class: "sl-tok-kind-informational" },
]);
