import type { MarkdownConfig } from "@lezer/markdown";

// ─── Custom Markdown extension for .neu files ───────────────────
//
// Prevents the Markdown parser from interpreting content inside
// ${ ... } tokens (inline) and ${ data }...${ end data } blocks.
// Without this, the parser sees [ ] as links, @ as text, etc.

export const isleMarkdownExt: MarkdownConfig = {
  defineNodes: [
    "IsleInline",
    { name: "IsleDataBlock", block: true },
  ],

  parseBlock: [
    {
      name: "IsleDataBlock",
      before: "LinkReference",
      parse(cx, line) {
        if (!/\$\{\s*data\s*\}/.test(line.text)) return false;
        const start = cx.lineStart;
        while (cx.nextLine()) {
          if (/\$\{\s*end\s+data\s*\}/.test(line.text)) {
            const end = cx.lineStart + line.text.length;
            cx.addElement(cx.elt("IsleDataBlock", start, end));
            cx.nextLine();
            return true;
          }
        }
        // Unclosed data block — still claim it to prevent MD parsing
        cx.addElement(cx.elt("IsleDataBlock", start, cx.lineStart + line.text.length));
        return true;
      },
      endLeaf(_cx, line) {
        return /\$\{\s*data\s*\}/.test(line.text);
      },
    },
  ],

  parseInline: [
    {
      name: "IsleInline",
      before: "Link",
      parse(cx, next, pos) {
        // $ followed by {
        if (next !== 36 || cx.char(pos + 1) !== 123) return -1;
        // Find closing }
        let end = pos + 2;
        while (end < cx.end) {
          if (cx.char(end) === 125) {
            return cx.addElement(cx.elt("IsleInline", pos, end + 1));
          }
          end++;
        }
        return -1;
      },
    },
  ],
};
