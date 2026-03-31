import { EditorView, ViewPlugin, Decoration, DecorationSet } from "@codemirror/view";

// ─── CSS classes ──────────────────────────────────────────────────

const cls = {
  delim:    Decoration.mark({ class: "isle-delim" }),    // ${ and }
  keyword:  Decoration.mark({ class: "isle-keyword" }),  // for, if, else, end, set…
  atVar:    Decoration.mark({ class: "isle-at-var" }),   // @variable
  op:       Decoration.mark({ class: "isle-op" }),       // is, is not, in, then
  comment:  Decoration.mark({ class: "isle-comment" }),  // // …
  isle:     Decoration.mark({ class: "isle-bg" }),       // full ${ … } background
  dataKey:  Decoration.mark({ class: "isle-data-key" }), // key in data block
  dataEq:   Decoration.mark({ class: "isle-data-eq" }),  // = in data block
  dataVal:  Decoration.mark({ class: "isle-data-val" }), // value in data block
  dataBrak: Decoration.mark({ class: "isle-data-brak" }),// [ ] { } in data block
};

const KEYWORDS = /^(for|if|else if|else|end|set|data|document|load|config|import|create|open|close|script)\b/;
// Operators are context-sensitive to avoid false matches in filenames/values
const OP_FOR = /^(in|then|separator=)(?=\s|$)/;  // only in ${ for ... }
const OP_IF  = /^(is not|is|then|or)(?=\s|$)/;    // only in ${ if/else if ... }
const OP_GET = /^(get)(?=\s|$)/;                  // in any ${ } block

// ─── Plugin ───────────────────────────────────────────────────────

export const isleHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    update(update: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.build(update.view);
      }
    }

    build(view: EditorView): DecorationSet {
      const doc = view.state.doc;
      const { from, to } = view.viewport;
      const source = doc.sliceString(from, to);

      // Full document — needed to find data block boundaries reliably,
      // since ${ data } and ${ end } may straddle the viewport edge.
      const fullDoc = doc.toString();

      const marks: Array<{ from: number; to: number; value: Decoration }> = [];

      // ── Pass 1: isle tokens in viewport (${ … }) ────────────────
      let i = 0;
      while (i < source.length) {
        const start = source.indexOf("${", i);
        if (start === -1) break;

        const end = source.indexOf("}", start + 2);
        if (end === -1) break;

        const absStart   = from + start;
        const absEnd     = from + end + 1;
        const body       = source.slice(start + 2, end).trim();
        const leadSpaces = source.slice(start + 2, end).length - source.slice(start + 2, end).trimStart().length;
        const bodyStart  = from + start + 2 + leadSpaces;

        marks.push({ from: absStart, to: absEnd, value: cls.isle });
        marks.push({ from: absStart, to: absStart + 2, value: cls.delim });
        marks.push({ from: absEnd - 1, to: absEnd, value: cls.delim });

        if (body.startsWith("//")) {
          marks.push({ from: bodyStart, to: absEnd - 1, value: cls.comment });
        } else {
          tokenizeBody(body, bodyStart, marks);
        }

        i = end + 1;
      }

      // ── Pass 2: data block content — scanned on full document ───
      // Uses regex on fullDoc so ${ data } and ${ end data } are always found
      // regardless of viewport position.
      const dataBlockRe = /\$\{\s*data\s*\}([\s\S]*?)\$\{\s*end\s+data\s*\}/g;
      for (const m of fullDoc.matchAll(dataBlockRe)) {
        const contentStart = m.index! + m[0].indexOf(m[1]);
        const contentEnd   = contentStart + m[1].length;
        // Only highlight if the data block overlaps the viewport
        if (contentEnd < from || contentStart > to) continue;
        tokenizeDataBlock(m[1], contentStart, marks);
      }

      // ── Render — Decoration.set handles sorting and overlaps ────
      return Decoration.set(
        marks.filter((m) => m.from < m.to),
        true,
      );
    }
  },
  { decorations: (v) => v.decorations },
);

// ─── Tokenize isle body ───────────────────────────────────────────

function tokenizeBody(
  body: string,
  bodyStart: number,
  marks: Array<{ from: number; to: number; value: Decoration }>,
): void {
  let i = 0;
  const push = (from: number, to: number, value: Decoration) =>
    marks.push({ from: bodyStart + from, to: bodyStart + to, value });

  while (i < body.length) {
    if (body[i] === " " || body[i] === "\t") { i++; continue; }

    if (body[i] === "@") {
      const m = body.slice(i).match(/^@[\w.]+/);
      if (m) { push(i, i + m[0].length, cls.atVar); i += m[0].length; continue; }
    }

    const kw = body.slice(i).match(KEYWORDS);
    if (kw) { push(i, i + kw[0].length, cls.keyword); i += kw[0].length; continue; }

    // Context-sensitive operators
    const slice = body.slice(i);
    const isForCtx = body.startsWith("for ");
    const isIfCtx  = body.startsWith("if ") || body.startsWith("else if ");

    if (isForCtx) {
      const op = slice.match(OP_FOR);
      if (op) { push(i, i + op[0].length, cls.op); i += op[0].length; continue; }
    }
    if (isIfCtx) {
      const op = slice.match(OP_IF);
      if (op) { push(i, i + op[0].length, cls.op); i += op[0].length; continue; }
    }
    {
      const op = slice.match(OP_GET);
      if (op) { push(i, i + op[0].length, cls.op); i += op[0].length; continue; }
    }

    const word = body.slice(i).match(/^\S+/);
    if (word) { i += word[0].length; continue; }

    i++;
  }
}

// ─── Tokenize data block content ─────────────────────────────────
//
// Uses regex with match.index to avoid manual offset arithmetic.

function tokenizeDataBlock(
  raw: string,
  offset: number,
  marks: Array<{ from: number; to: number; value: Decoration }>,
): void {
  const abs = (i: number) => offset + i;
  const push = (from: number, to: number, value: Decoration) =>
    marks.push({ from: abs(from), to: abs(to), value });

  // ── key = value ────────────────────────────────────────────────
  const kvRe = /^([ \t]*)([\w.]+)([ \t]*)(=)([ \t]*)([^\n]*)/gm;
  for (const m of raw.matchAll(kvRe)) {
    const base     = m.index!;
    const keyStart = base + m[1].length;
    push(keyStart, keyStart + m[2].length, cls.dataKey);

    const eqStart = keyStart + m[2].length + m[3].length;
    push(eqStart, eqStart + 1, cls.dataEq);

    const val      = m[6].trim();
    const valStart = eqStart + 1 + m[5].length;
    if (val.length) push(valStart, valStart + val.length, cls.dataVal);
  }

  // ── list declaration: "key props(p1, p2) = [" or "key = [" ────────
  const listDeclRe = /^([ \t]*)([\w.]+)(?:\s+(props)\(([^)]*)\))?\s*=\s*(\[)/gm;
  for (const m of raw.matchAll(listDeclRe)) {
    const base     = m.index!;
    const keyStart = base + m[1].length;
    push(keyStart, keyStart + m[2].length, cls.dataKey);

    if (m[3]) {
      // "props" keyword
      const propsStart = keyStart + m[2].length + 1; // +1 for space
      push(propsStart, propsStart + 5, cls.keyword);
    }

    // Opening [
    const bracketPos = base + m[0].lastIndexOf("[");
    push(bracketPos, bracketPos + 1, cls.dataBrak);
  }

  // ── list item lines (values inside [ ]) ────────────────────────
  const itemLineRe = /^([ \t]+)(.+)/gm;
  for (const m of raw.matchAll(itemLineRe)) {
    const lineContent = m[2].trim();
    // Skip lines matched by kvRe or listDeclRe
    const trimmed = m[0].trimStart();
    if (/^[\w.]+\s*=/.test(trimmed)) continue;
    if (/^[\w.]+\s+(props\(|$\[)/.test(trimmed)) continue;
    // Skip closing bracket
    if (lineContent === "]") continue;
    // Highlight comma-separated values
    const lineStart = m.index! + m[1].length;
    const values = m[2].split(",");
    let pos = 0;
    for (const v of values) {
      const trimVal = v.trim();
      if (trimVal.length) {
        const valPos = m[2].indexOf(trimVal, pos);
        push(lineStart + valPos, lineStart + valPos + trimVal.length, cls.dataVal);
        pos = valPos + trimVal.length;
      }
    }
  }

  // ── closing ] ──────────────────────────────────────────────────
  const bracketRe = /^[ \t]*(\])/gm;
  for (const m of raw.matchAll(bracketRe)) {
    const pos = m.index! + m[0].indexOf("]");
    push(pos, pos + 1, cls.dataBrak);
  }
}

// ─── Theme ────────────────────────────────────────────────────────

export const isleTheme = EditorView.baseTheme({
  ".isle-bg": {
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    borderRadius: "3px",
  },
  ".isle-delim": {
    color: "#a78bfa",
    fontWeight: "600 !important",
    fontStyle: "normal !important",
  },
  ".isle-keyword": {
    color: "#818cf8",
    fontWeight: "500 !important",
    fontStyle: "normal !important",
  },
  ".isle-at-var": {
    color: "#34d399",
  },
  ".isle-op": {
    color: "#94a3b8",
    fontStyle: "italic !important",
    fontWeight: "normal !important",
  },
  ".isle-comment": {
    color: "#475569",
    fontStyle: "italic",
  },
  ".isle-data-key": {
    color: "#7dd3fc",
  },
  ".isle-data-eq": {
    color: "#94a3b8",
  },
  ".isle-data-val": {
    color: "#fbbf24",
  },
  ".isle-data-brak": {
    color: "#a78bfa",
    fontWeight: "600",
  },
});
