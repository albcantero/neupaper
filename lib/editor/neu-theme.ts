import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// ─── Color palette ────────────────────────────────────────────────

export const NEU_EDITOR_BG = "#111111";

// ─── UI theme ─────────────────────────────────────────────────────

const neuEditorTheme = EditorView.theme(
  {
    "&": {
      color: "#e2e2e2",
      backgroundColor: NEU_EDITOR_BG,
    },
    ".cm-content": {
      caretColor: "#ffffff",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#ffffff",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "#ffffff18",
    },
    ".cm-panels": {
      backgroundColor: "#111111",
      color: "#e2e2e2",
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: "2px solid black",
    },
    ".cm-panels.cm-panels-bottom": {
      borderTop: "2px solid black",
    },
    ".cm-searchMatch": {
      backgroundColor: "#ffffff20",
      outline: "1px solid #ffffff40",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "#ffffff38",
    },
    ".cm-activeLine": {
      backgroundColor: "#ffffff08",
    },
    ".cm-selectionMatch": {
      backgroundColor: "#ffffff15",
    },
    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: "#ffffff20",
    },
    ".cm-gutters": {
      backgroundColor: "#111111",
      color: "#404040",
      border: "none",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#ffffff08",
      color: "#666666",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "none",
      color: "#ddd",
    },
    ".cm-tooltip": {
      border: "none",
      backgroundColor: "#1e1e1e",
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
    },
    ".cm-tooltip .cm-tooltip-arrow:after": {
      borderTopColor: "#1e1e1e",
      borderBottomColor: "#1e1e1e",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": {
        backgroundColor: "#ffffff18",
        color: "#e2e2e2",
      },
    },
  },
  { dark: true },
);

// ─── Syntax highlight style ───────────────────────────────────────

const neuHighlightStyle = HighlightStyle.define([
  // Comments
  { tag: tags.comment, color: "#555555", fontStyle: "italic" },
  { tag: tags.lineComment, color: "#555555", fontStyle: "italic" },
  { tag: tags.blockComment, color: "#555555", fontStyle: "italic" },
  { tag: tags.docComment, color: "#555555", fontStyle: "italic" },

  // Keywords & control flow
  { tag: tags.keyword, color: "#c678dd" },
  { tag: tags.controlKeyword, color: "#c678dd" },
  { tag: tags.moduleKeyword, color: "#c678dd" },
  { tag: tags.operatorKeyword, color: "#c678dd" },
  { tag: tags.definitionKeyword, color: "#c678dd" },
  { tag: tags.modifier, color: "#c678dd" },
  { tag: tags.self, color: "#c678dd" },

  // Strings
  { tag: tags.string, color: "#98c379" },
  { tag: tags.special(tags.string), color: "#98c379" },
  { tag: tags.regexp, color: "#98c379" },

  // Numbers
  { tag: tags.number, color: "#d19a66" },
  { tag: tags.integer, color: "#d19a66" },
  { tag: tags.float, color: "#d19a66" },

  // Booleans & null
  { tag: tags.bool, color: "#d19a66" },
  { tag: tags.null, color: "#d19a66" },

  // Operators & punctuation
  { tag: tags.operator, color: "#56b6c2" },
  { tag: tags.punctuation, color: "#abb2bf" },
  { tag: tags.bracket, color: "#abb2bf" },
  { tag: tags.angleBracket, color: "#abb2bf" },
  { tag: tags.squareBracket, color: "#abb2bf" },
  { tag: tags.paren, color: "#abb2bf" },

  // Names & identifiers
  { tag: tags.name, color: "#e2e2e2" },
  { tag: tags.variableName, color: "#e06c75" },
  { tag: tags.propertyName, color: "#e06c75" },
  { tag: tags.labelName, color: "#e2e2e2" },
  { tag: tags.definition(tags.variableName), color: "#61afef" },
  { tag: tags.definition(tags.propertyName), color: "#61afef" },

  // Functions
  { tag: tags.function(tags.variableName), color: "#61afef" },
  { tag: tags.function(tags.propertyName), color: "#61afef" },

  // Types
  { tag: tags.typeName, color: "#e5c07b" },
  { tag: tags.typeOperator, color: "#c678dd" },
  { tag: tags.namespace, color: "#e5c07b" },
  { tag: tags.className, color: "#e5c07b" },
  { tag: tags.constant(tags.name), color: "#d19a66" },

  // Markdown headings
  { tag: tags.heading, color: "#e2e2e2", fontWeight: "bold" },
  { tag: tags.heading1, color: "#e2e2e2", fontWeight: "bold" },
  { tag: tags.heading2, color: "#e2e2e2", fontWeight: "bold" },
  { tag: tags.heading3, color: "#e2e2e2", fontWeight: "bold" },
  { tag: tags.heading4, color: "#e2e2e2", fontWeight: "600" },
  { tag: tags.heading5, color: "#e2e2e2", fontWeight: "600" },
  { tag: tags.heading6, color: "#e2e2e2", fontWeight: "600" },

  // Markdown inline
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.link, color: "#61afef", textDecoration: "underline" },
  { tag: tags.url, color: "#98c379" },

  // Markdown code
  { tag: tags.monospace, color: "#98c379" },

  // Meta
  { tag: tags.meta, color: "#555555" },
  { tag: tags.atom, color: "#d19a66" },
  { tag: tags.special(tags.variableName), color: "#d19a66" },
]);

// ─── Export ───────────────────────────────────────────────────────

export const neuTheme = [neuEditorTheme, syntaxHighlighting(neuHighlightStyle)];
