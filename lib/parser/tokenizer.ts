// ─── Token types ──────────────────────────────────────────────────

export type TextToken = {
  type: "text";
  value: string;
};

export type IsleToken = {
  type: "isle";
  body: string; // raw content between ${ and }, trimmed
};

export type Token = TextToken | IsleToken;

// ─── Tokenizer ────────────────────────────────────────────────────

/**
 * Splits a Markdown Isles source string into a flat list of tokens:
 *   - "text" → raw Markdown (passed through as-is to Remark)
 *   - "isle" → content inside ${ … } (passed to the AST builder)
 *
 * Rules:
 *   - ${ is the opening delimiter — must be $ immediately followed by {
 *   - $E = mc^2$ (LaTeX) is NOT an island — $ not followed by {
 *   - Unclosed ${ is emitted as text (the linter will report it)
 *   - Nested braces inside ${ … } are NOT supported at tokenizer level
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const start = source.indexOf("${", i);

    if (start === -1) {
      // No more islands — everything remaining is text
      if (i < source.length) {
        tokens.push({ type: "text", value: source.slice(i) });
      }
      break;
    }

    // Text segment before this island
    if (start > i) {
      tokens.push({ type: "text", value: source.slice(i, start) });
    }

    // Find the closing }
    const end = source.indexOf("}", start + 2);

    if (end === -1) {
      // Unclosed island — emit as text so Markdown still renders
      tokens.push({ type: "text", value: source.slice(start) });
      break;
    }

    const body = source.slice(start + 2, end).trim();
    tokens.push({ type: "isle", body });
    i = end + 1;
  }

  return tokens;
}
