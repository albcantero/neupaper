/**
 * Formats a page number according to the theme.
 */
export function formatPageNumber(page: number, total: number, theme: string): string {
  if (theme === "modernist") return String(page);
  return String(page).padStart(total >= 100 ? 3 : 2, "0");
}

/**
 * Wraps HTML sections for the modernist theme layout.
 * h1 gets full width, h2-h6 go in a left column with content in the right columns.
 */
export function wrapSections(html: string): string {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const container = doc.body.firstElementChild!;
  const result: string[] = [];
  let heading: string | null = null;
  let content: string[] = [];

  const flush = () => {
    if (heading !== null) {
      result.push(`<div class="me-section"><div class="me-heading">${heading}</div><div class="me-content">${content.join("")}</div></div>`);
    } else if (content.length > 0) {
      result.push(`<div class="me-section"><div class="me-heading"></div><div class="me-content">${content.join("")}</div></div>`);
    }
    heading = null;
    content = [];
  };

  for (const child of Array.from(container.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag === "h1") {
      flush();
      result.push(`<div class="me-full">${child.outerHTML}</div>`);
    } else if (["h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      flush();
      heading = child.outerHTML;
    } else {
      content.push(child.outerHTML);
    }
  }
  flush();
  return result.join("");
}
