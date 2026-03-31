import { EditorView, ViewPlugin, Decoration, DecorationSet, WidgetType } from "@codemirror/view";
import { StateField } from "@codemirror/state";

// ─── Badge classification ────────────────────────────────────────

type BadgeKind = "loop" | "condition" | "data" | "document" | "set" | "value" | "end" | "import" | "component" | "note" | "pagebreak";

interface BadgeInfo {
  label: string;
  hint: string;
  kind: BadgeKind;
}

function classifyIsle(body: string): BadgeInfo {
  if (body.startsWith("//"))                    return { label: "NOTE",      hint: "is not visible in the document.",        kind: "note" };
  if (body.startsWith("for "))                  return { label: "LOOP",      hint: "repeats the content below for each item.", kind: "loop" };
  if (body.startsWith("if ") || body === "else" || body.startsWith("else if ")) return { label: "CONDITION", hint: "shows content only when the condition is true.", kind: "condition" };
  if (body === "end" || body.startsWith("end ")) return { label: "END",      hint: "closes the block above.",                kind: "end" };
  if (body === "data")                          return { label: "DATA",      hint: "defines the variables for this document.", kind: "data" };
  if (body === "end data")                      return { label: "END",       hint: "closes the data block.",                 kind: "end" };
  if (body === "document")                      return { label: "DOCUMENT",  hint: "marks where your content starts.",       kind: "document" };
  if (body === "end document")                  return { label: "END",       hint: "marks where your content ends.",         kind: "end" };
  if (body.startsWith("set "))                  return { label: "SET",       hint: "stores a value for later use.",          kind: "set" };
  if (body.startsWith("load "))                 return { label: "LOAD",      hint: "loads data from an external file.",      kind: "import" };
  if (body.startsWith("import "))               return { label: "IMPORT",    hint: "loads a reusable component.",            kind: "import" };
  if (body.startsWith("config"))                return { label: "CONFIG",    hint: "sets document options.",                 kind: "import" };
  if (body === "pagebreak")                     return { label: "PAGE BREAK",hint: "starts a new page here.",               kind: "pagebreak" };
  if (body.startsWith("create "))               return { label: "CREATE",    hint: "defines a reusable component.",          kind: "component" };
  if (body.startsWith("open "))                 return { label: "OPEN",      hint: "passes content into a component.",       kind: "component" };
  if (body.startsWith("close "))                return { label: "CLOSE",     hint: "ends the content for a component.",      kind: "component" };
  if (/^<[A-Z]/.test(body))                     return { label: "COMPONENT", hint: "inserts a reusable block.",              kind: "component" };
  if (body.startsWith("get "))                  return { label: "PROP",      hint: "is a value passed to this component.",   kind: "value" };
  if (body.startsWith("@") || /^\w/.test(body)) return { label: "VALUE",     hint: "will be replaced with real data.",       kind: "value" };
  return { label: "EMPTY", hint: "block. Your imagination is the limit!", kind: "value" };
}

// ─── @variable marks ────────────────────────────────────────────
// The "@" stays as real text (perfect alignment) but rendered transparent
// with the icon shown via CSS background-image.

const atSignMark = Decoration.mark({ class: "powerful-at-sign" });
const varNameMark = Decoration.mark({ class: "powerful-var-name" });

// ─── Isle wrapper marks (3-part border around ${ ... }) ─────────

const isleOpenMark = Decoration.mark({ class: "powerful-isle-open" });
const isleMidMark = Decoration.mark({ class: "powerful-isle-mid" });
const isleCloseMark = Decoration.mark({ class: "powerful-isle-close" });

// ─── Badge colors ────────────────────────────────────────────────

const PURPLE = { bg: "rgba(139, 92, 246, 0.15)", text: "#c4b5fd", border: "rgba(139, 92, 246, 0.3)" };

const BADGE_BG: Record<BadgeKind, { bg: string; text: string; border: string }> = {
  loop:      PURPLE,
  condition: PURPLE,
  data:      PURPLE,
  document:  PURPLE,
  set:       PURPLE,
  value:     PURPLE,
  end:       PURPLE,
  import:    PURPLE,
  component: PURPLE,
  note:      PURPLE,
  pagebreak: PURPLE,
};

// ─── Rail colors (left border) ───────────────────────────────────

const RAIL_COLOR = "rgba(139, 92, 246, 0.35)";

const RAIL_COLORS: Record<string, string> = {
  loop:      RAIL_COLOR,
  condition: RAIL_COLOR,
  data:      RAIL_COLOR,
  document:  RAIL_COLOR,
  component: RAIL_COLOR,
};

// ─── CodeLens Widget (block-level, above the line) ───────────────

class CodeLensWidget extends WidgetType {
  constructor(private info: BadgeInfo) { super(); }

  eq(other: CodeLensWidget) {
    return this.info.label === other.info.label && this.info.kind === other.info.kind;
  }

  toDOM() {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "padding: 4px 0 2px 0; user-select: none; pointer-events: none; font-family: var(--font-vault), system-ui, sans-serif; font-size: 11px; letter-spacing: 0.05em; line-height: 1.4; color: #64748b; display: flex; align-items: center;";

    const colors = BADGE_BG[this.info.kind];

    // Question mark icon (same color as badge)
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("width", "14");
    icon.setAttribute("height", "14");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", colors.text);
    icon.setAttribute("stroke-width", "1.75");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.style.cssText = "margin-right: 4px; flex-shrink: 0;";
    icon.innerHTML = `<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="1.25" fill="${colors.text}" stroke="none"/>`;
    wrapper.appendChild(icon);

    // "The "
    const pre = document.createTextNode("The ");
    wrapper.appendChild(pre);

    // Colored badge
    const badge = document.createElement("span");
    badge.textContent = this.info.label;
    badge.style.cssText = `display: inline-block; font-size: 9px; font-weight: 600; letter-spacing: 0.05em; line-height: 1; padding: 2px 5px; border-radius: 4px; vertical-align: middle; background: ${colors.bg}; color: ${colors.text}; border: 1.5px solid ${colors.border};`;
    wrapper.appendChild(badge);

    // " isle [hint]"
    const post = document.createTextNode(` isle ${this.info.hint}`);
    wrapper.appendChild(post);

    return wrapper;
  }

  ignoreEvent() { return true; }
}

// ─── StateField for CodeLens badges (block widgets need StateField) ─

const codeLensField = StateField.define<DecorationSet>({
  create(state) {
    return buildCodeLens(state.doc, state.selection.main.head);
  },
  update(value, tr) {
    if (tr.docChanged || tr.selection) {
      return buildCodeLens(tr.state.doc, tr.state.selection.main.head);
    }
    return value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

function buildCodeLens(doc: { line: (n: number) => { from: number; text: string }; lineAt: (pos: number) => { number: number; from: number; text: string } }, cursorPos: number): DecorationSet {
  const cursorLine = doc.lineAt(cursorPos);
  const lineText = cursorLine.text;
  const cursorCol = cursorPos - cursorLine.from;

  // Find the ${ ... } block that contains the cursor
  let i = 0;
  while (i < lineText.length) {
    const start = lineText.indexOf("${", i);
    if (start === -1) break;
    const end = lineText.indexOf("}", start + 2);
    if (end === -1) break;

    if (cursorCol >= start && cursorCol <= end + 1) {
      const body = lineText.slice(start + 2, end).trim();
      const info = classifyIsle(body);
      return Decoration.set([
        Decoration.widget({
          widget: new CodeLensWidget(info),
          block: true,
          side: -1,
        }).range(doc.line(cursorLine.number).from),
      ]);
    }

    i = end + 1;
  }

  return Decoration.none;
}

// ─── ViewPlugin for rails only ───────────────────────────────────

const railPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildRails(view);
    }

    update(update: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildRails(update.view);
      }
    }

    buildRails(view: EditorView): DecorationSet {
      const doc = view.state.doc;
      const fullDoc = doc.toString();
      const marks: Array<{ from: number; to: number; value: Decoration }> = [];
      const { from: vpFrom, to: vpTo } = view.viewport;

      const blockStack: Array<{ kind: string; startLine: number; depth: number }> = [];
      const ranges: Array<{ kind: string; startLine: number; endLine: number; depth: number }> = [];

      let j = 0;
      while (j < fullDoc.length) {
        const start = fullDoc.indexOf("${", j);
        if (start === -1) break;
        const end = fullDoc.indexOf("}", start + 2);
        if (end === -1) break;

        const body = fullDoc.slice(start + 2, end).trim();
        const line = doc.lineAt(start).number;

        // Wrapper border + token highlights (only near viewport)
        if (start >= vpFrom - 1000 && start <= vpTo + 1000) {
          marks.push({ from: start, to: start + 2, value: isleOpenMark });
          if (start + 2 < end) marks.push({ from: start + 2, to: end, value: isleMidMark });
          marks.push({ from: end, to: end + 1, value: isleCloseMark });
          this.highlightTokens(body, start + 2, end, fullDoc, marks);
        }

        // Block stack for rails (with depth)
        if (body.startsWith("for ") && !body.includes(" then "))
                                           blockStack.push({ kind: "loop", startLine: line, depth: blockStack.length });
        else if (body.startsWith("if ") && !body.startsWith("else if ") && !body.includes(" then "))
                                           blockStack.push({ kind: "condition", startLine: line, depth: blockStack.length });
        else if (body === "data")          blockStack.push({ kind: "data", startLine: line, depth: blockStack.length });
        else if (body === "document")      blockStack.push({ kind: "document", startLine: line, depth: blockStack.length });
        else if (body.startsWith("open ")) blockStack.push({ kind: "component", startLine: line, depth: blockStack.length });
        else if (body === "end" || body === "end data" || body === "end document" || body.startsWith("end <") || body.startsWith("close ")) {
          if (blockStack.length > 0) {
            const opened = blockStack.pop()!;
            ranges.push({ ...opened, endLine: line });
          }
        }

        j = end + 1;
      }

      // Collect per-line guide entries (depth 0 → ::before, depth 1 → ::after)
      const lineGuides = new Map<number, Array<{ depth: number; pos: "top" | "mid" | "bottom" }>>();
      for (const range of ranges) {
        if (!RAIL_COLORS[range.kind]) continue;
        for (let ln = range.startLine; ln <= range.endLine; ln++) {
          if (!lineGuides.has(ln)) lineGuides.set(ln, []);
          let pos: "top" | "mid" | "bottom" = "mid";
          if (ln === range.startLine) pos = "top";
          else if (ln === range.endLine) pos = "bottom";
          lineGuides.get(ln)!.push({ depth: range.depth, pos });
        }
      }

      for (const [ln, entries] of lineGuides) {
        const lineStart = doc.line(ln).from;
        if (lineStart < vpFrom - 5000 || lineStart > vpTo + 5000) continue;
        const classes = entries
          .filter(e => e.depth <= 1)
          .map(e => e.depth === 0 ? `powerful-guide-${e.pos}` : `powerful-guide-inner-${e.pos}`)
          .join(" ");
        if (classes) {
          marks.push({
            from: lineStart,
            to: lineStart,
            value: Decoration.line({ class: classes }),
          });
        }
      }

      return Decoration.set(marks, true);
    }

    /** Highlight editable tokens inside a ${ } block */
    highlightTokens(
      body: string,
      contentStart: number,
      contentEnd: number,
      fullDoc: string,
      marks: Array<{ from: number; to: number; value: Decoration }>,
    ) {
      const rawContent = fullDoc.slice(contentStart, contentEnd);
      const input = Decoration.mark({ class: "powerful-input" });

      // @variables — @ as icon chip, name as input chip
      for (const m of rawContent.matchAll(/@[\w.]+/g)) {
        const atFrom = contentStart + m.index!;
        marks.push({ from: atFrom, to: atFrom + 1, value: atSignMark });
        marks.push({ from: atFrom + 1, to: atFrom + m[0].length, value: varNameMark });
      }

      // Bare variable: "items.nombre" (exclude keywords like "end", "data", "document", "else", "pagebreak")
      const KEYWORDS = new Set(["end", "data", "document", "else", "pagebreak"]);
      if (/^\w[\w.]*$/.test(body) && !body.startsWith("@") && !KEYWORDS.has(body)) {
        const varStart = rawContent.indexOf(body);
        if (varStart !== -1) {
          marks.push({ from: contentStart + varStart, to: contentStart + varStart + body.length, value: input });
        }
      }

      // "end X" — highlight the target (document, data, <Component>)
      const endMatch = body.match(/^end\s+(.+)$/);
      if (endMatch) {
        const target = endMatch[1];
        const targetStart = rawContent.indexOf(target, 4); // skip "end "
        if (targetStart !== -1) {
          marks.push({ from: contentStart + targetStart, to: contentStart + targetStart + target.length, value: input });
        }
      }

      // Loop variable name: "for [item] in"
      const forMatch = body.match(/^for\s+(\w+)\s+in\s/);
      if (forMatch) {
        const varStart = rawContent.indexOf(forMatch[1]);
        if (varStart !== -1) {
          marks.push({ from: contentStart + varStart, to: contentStart + varStart + forMatch[1].length, value: input });
        }
      }

      // Inline for then expression: "for item in @list then [item.name]"
      const thenMatch = body.match(/\bthen\s+([\w.]+)/);
      if (thenMatch && body.startsWith("for ")) {
        const exprStart = rawContent.indexOf(thenMatch[1], rawContent.indexOf("then"));
        if (exprStart !== -1) {
          marks.push({ from: contentStart + exprStart, to: contentStart + exprStart + thenMatch[1].length, value: input });
        }
      }

      // Condition value: "if @x is [value]"
      const condMatch = body.match(/\b(?:is not|is)\s+(\S+)$/);
      if (condMatch && (body.startsWith("if ") || body.startsWith("else if "))) {
        const valStart = rawContent.lastIndexOf(condMatch[1]);
        if (valStart !== -1) {
          marks.push({ from: contentStart + valStart, to: contentStart + valStart + condMatch[1].length, value: input });
        }
      }

      // Component prop values: "nombre=Juan" → [Juan]
      for (const m of rawContent.matchAll(/=(?:"([^"]*)"|([^\s>]+))/g)) {
        const val = m[1] ?? m[2];
        const valOffset = m[1] !== undefined ? m.index! + 2 : m.index! + 1;
        if (val) {
          marks.push({ from: contentStart + valOffset, to: contentStart + valOffset + val.length, value: input });
        }
      }
    }
  },
  { decorations: (v) => v.decorations },
);

// ─── Fonts that use 1.5 line-height (the rest use 1.6) ──────────

const COMPACT_FONTS = new Set(["Writer", "Azeret Mono", "Commit Mono", "Cousine"]);
const TALL_FONTS = new Set(["JetBrains Mono", "Victor Mono"]);

// ─── Theme ───────────────────────────────────────────────────────

const powerfulTheme = EditorView.baseTheme({



  // ── Depth 0 guides (::before) — outer block ────────────────────

  ".powerful-guide-top, .powerful-guide-mid, .powerful-guide-bottom": {
    paddingLeft: "28px",
    position: "relative",
  },

  ".powerful-guide-top::before": {
    content: '""',
    position: "absolute",
    left: "2px",
    top: "50%",
    bottom: "0",
    width: "16px",
    borderLeft: "1.5px solid rgba(139, 92, 246, 0.35)",
    borderTop: "1.5px solid rgba(139, 92, 246, 0.35)",
    borderTopLeftRadius: "6px",
  },

  ".powerful-guide-mid::before": {
    content: '""',
    position: "absolute",
    left: "2px",
    top: "0",
    bottom: "0",
    borderLeft: "1.5px solid rgba(139, 92, 246, 0.35)",
  },

  ".powerful-guide-bottom::before": {
    content: '""',
    position: "absolute",
    left: "2px",
    top: "0",
    bottom: "50%",
    width: "16px",
    borderLeft: "1.5px solid rgba(139, 92, 246, 0.35)",
    borderBottom: "1.5px solid rgba(139, 92, 246, 0.35)",
    borderBottomLeftRadius: "6px",
  },

  // ── Depth 1 guides (::after) — inner block (nested for/if) ────

  ".powerful-guide-inner-top::after": {
    content: '""',
    position: "absolute",
    left: "14px",
    top: "50%",
    bottom: "0",
    width: "10px",
    borderLeft: "1.5px solid rgba(139, 92, 246, 0.25)",
    borderTop: "1.5px solid rgba(139, 92, 246, 0.25)",
    borderTopLeftRadius: "6px",
  },

  ".powerful-guide-inner-mid::after": {
    content: '""',
    position: "absolute",
    left: "14px",
    top: "0",
    bottom: "0",
    borderLeft: "1.5px solid rgba(139, 92, 246, 0.25)",
  },

  ".powerful-guide-inner-bottom::after": {
    content: '""',
    position: "absolute",
    left: "14px",
    top: "0",
    bottom: "50%",
    width: "10px",
    borderLeft: "1.5px solid rgba(139, 92, 246, 0.25)",
    borderBottom: "1.5px solid rgba(139, 92, 246, 0.25)",
    borderBottomLeftRadius: "6px",
  },

  // Hide isle-bg in powerful mode — the 3-part wrapper handles the border
  "&.powerful-mode .isle-bg": { backgroundColor: "transparent" },

  // Isle wrapper — continuous border via 3 adjacent marks
  ".powerful-isle-open": {
    borderLeft: "1.5px solid rgba(139, 92, 246, 0.30)",
    borderTop: "1.5px solid rgba(139, 92, 246, 0.30)",
    borderBottom: "1.5px solid rgba(139, 92, 246, 0.30)",
    borderRadius: "5px 0 0 5px",
    paddingLeft: "4px",
    paddingTop: "3px",
    paddingBottom: "3px",
  },
  ".powerful-isle-mid": {
    borderTop: "1.5px solid rgba(139, 92, 246, 0.30)",
    borderBottom: "1.5px solid rgba(139, 92, 246, 0.30)",
    paddingTop: "3px",
    paddingBottom: "3px",
  },
  ".powerful-isle-close": {
    borderRight: "1.5px solid rgba(139, 92, 246, 0.30)",
    borderTop: "1.5px solid rgba(139, 92, 246, 0.30)",
    borderBottom: "1.5px solid rgba(139, 92, 246, 0.30)",
    borderRadius: "0 5px 5px 0",
    paddingRight: "4px",
    paddingTop: "3px",
    paddingBottom: "3px",
  },

  // Override isle-at-var green color inside powerful mode (icon replaces the @)
  "&.powerful-mode .isle-at-var": { color: "inherit" },

  // @ sign — left half of the variable chip
  // The "@" char stays in the DOM (perfect alignment) but is invisible;
  // the Tabler IconAt SVG is rendered as a centered background-image.
  ".powerful-at-sign": {
    color: "transparent",
    backgroundColor: "rgba(52, 211, 153, 0.18)",
    borderRadius: "4px 0 0 4px",
    border: "1.5px solid rgba(52, 211, 153, 0.35)",
    borderRight: "none",
    padding: "1px 2px",
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0v-1.5a9 9 0 1 0 -5.5 8.28"/></svg>')}")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "0.8em 0.8em",
  },

  // Variable name — right half of the variable chip
  ".powerful-var-name": {
    backgroundColor: "rgba(52, 211, 153, 0.08)",
    borderRadius: "0 4px 4px 0",
    border: "1.5px solid rgba(52, 211, 153, 0.35)",
    borderLeft: "none",
    padding: "1px 5px 1px 2px",
  },

  // Inline "input" style for other editable tokens (loop vars, conditions, props)
  ".powerful-input": {
    backgroundColor: "rgba(139, 92, 246, 0.20)",
    borderRadius: "4px",
    padding: "1px 4px",
  },

});

// ─── Export ──────────────────────────────────────────────────────

export function powerfulExtensions(fontFamily?: string, advices = true) {
  const lh = fontFamily && TALL_FONTS.has(fontFamily) ? "1.9" : fontFamily && COMPACT_FONTS.has(fontFamily) ? "1.7" : "1.8";
  return [
    ...(advices ? [codeLensField] : []),
    railPlugin,
    powerfulTheme,
    EditorView.theme({ "&.powerful-mode .cm-line": { lineHeight: lh } }),
    EditorView.editorAttributes.of({ class: "powerful-mode" }),
  ];
}
