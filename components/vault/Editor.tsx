"use client";

import { useEffect, useRef } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, Decoration, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, ViewPlugin, DecorationSet, WidgetType } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { bracketMatching, indentUnit } from "@codemirror/language";
import { linter, lintGutter } from "@codemirror/lint";
import type { Diagnostic } from "@codemirror/lint";
import { lint as neuLint } from "@/lib/parser/linter";
import { isleHighlight, isleTheme } from "@/lib/editor/isle-highlight";
import { powerfulExtensions } from "@/lib/editor/powerful-mode";
import { neuTheme } from "@/lib/editor/neu-theme";
import { isleMarkdownExt } from "@/lib/editor/isle-markdown-ext";

class LineBreakWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("span");
    span.style.opacity = "0.3";
    span.style.userSelect = "none";
    span.style.display = "inline-block";
    span.style.transform = "rotate(90deg)";
    span.style.width = "14px";
    span.style.height = "14px";
    span.style.verticalAlign = "middle";
    span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>`;
    return span;
  }
}

class IndentDotWidget extends WidgetType {
  toDOM() {
    const span = document.createElement("span");
    span.textContent = "·";
    span.style.opacity = "0.35";
    span.style.userSelect = "none";
    return span;
  }
}

const indentReplace = Decoration.replace({ widget: new IndentDotWidget() });

function showIndentSpaces() {
  return ViewPlugin.fromClass(
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
      build(view: EditorView) {
        const ranges = [];
        const doc = view.state.doc;
        for (let i = 1; i <= doc.lines; i++) {
          const line = doc.line(i);
          const text = line.text;
          let j = 0;
          while (j < text.length && text[j] === " ") j++;
          for (let k = 0; k < j; k++) {
            ranges.push(indentReplace.range(line.from + k, line.from + k + 1));
          }
        }
        return Decoration.set(ranges);
      }
    },
    { decorations: (v) => v.decorations }
  );
}

function showLineBreaks() {
  return ViewPlugin.fromClass(
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
      build(view: EditorView) {
        const widgets = [];
        const doc = view.state.doc;
        for (let i = 1; i < doc.lines; i++) {
          const line = doc.line(i);
          widgets.push(
            Decoration.widget({ widget: new LineBreakWidget(), side: 1 }).range(line.to)
          );
        }
        return Decoration.set(widgets);
      }
    },
    { decorations: (v) => v.decorations }
  );
}

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  fontFamily?: string;
  fontSize?: number;
  ligatures?: boolean;
  altChars?: boolean;
  invisibles?: boolean;
  powerful?: boolean;
  advices?: boolean;
  dataFiles?: Record<string, string>;
}

function buildFontTheme(fontFamily: string, fontSize: number, ligatures: boolean, altChars: boolean) {
  const features = `"liga" ${ligatures ? 1 : 0}, "calt" ${ligatures ? 1 : 0}, "ss01" ${altChars ? 1 : 0}, "ss02" ${altChars ? 1 : 0}, "ss03" ${altChars ? 1 : 0}, "ss04" ${altChars ? 1 : 0}, "ss05" ${altChars ? 1 : 0}`;
  return EditorView.theme({
    "&": { height: "100%", fontSize: `${fontSize}px` },
    ".cm-scroller": { overflow: "auto", fontFamily: `${fontFamily}, monospace`, fontFeatureSettings: features },
    ".cm-content": { padding: "16px 0", fontFamily: `${fontFamily}, monospace`, fontFeatureSettings: features },
  });
}

export function Editor({ content, onChange, fontFamily = "var(--font-mono)", fontSize = 14, ligatures = true, altChars = false, invisibles = true, powerful = false, advices = true, dataFiles = {} }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const dataFilesRef = useRef(dataFiles);
  dataFilesRef.current = dataFiles;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const fontCompartment = useRef(new Compartment());
  const invisiblesCompartment = useRef(new Compartment());
  const powerfulCompartment = useRef(new Compartment());

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers({ formatNumber: (n) => String(n).padStart(3, "\u2007") }),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        markdown({ base: markdownLanguage, codeLanguages: languages, extensions: [isleMarkdownExt] }),
        ...neuTheme,
        indentUnit.of("  "),
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        lintGutter(),
        linter((view) => {
          const source = view.state.doc.toString();
          return neuLint(source, dataFilesRef.current).map((d): Diagnostic => ({
            from: d.from,
            to: d.to,
            severity: d.severity,
            message: d.message,
          }));
        }, { delay: 400 }),
        isleHighlight,
        isleTheme,
        invisiblesCompartment.current.of(invisibles ? [showIndentSpaces(), showLineBreaks()] : []),
        powerfulCompartment.current.of(powerful ? powerfulExtensions(fontFamily, advices) : []),
        EditorView.lineWrapping,
        fontCompartment.current.of(buildFontTheme(fontFamily, fontSize, ligatures, altChars)),
        EditorView.theme({
          ".cm-scroller::-webkit-scrollbar": { width: "12px", height: "12px" },
          ".cm-scroller::-webkit-scrollbar-track": { background: "transparent" },
          ".cm-scroller::-webkit-scrollbar-thumb": { background: "var(--border)", borderRadius: "9999px", border: "4px solid transparent", backgroundClip: "padding-box" },
        }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external content changes (e.g. theme selector in Preview)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (content !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      });
    }
  }, [content]);

  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: fontCompartment.current.reconfigure(buildFontTheme(fontFamily, fontSize, ligatures, altChars)),
    });
  }, [fontFamily, fontSize, ligatures, altChars]);

  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: invisiblesCompartment.current.reconfigure(
        invisibles ? [showIndentSpaces(), showLineBreaks()] : []
      ),
    });
  }, [invisibles]);

  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: powerfulCompartment.current.reconfigure(
        powerful ? powerfulExtensions(fontFamily, advices) : []
      ),
    });
  }, [powerful, fontFamily, advices]);

  return <div ref={containerRef} className="h-full w-full" />;
}
