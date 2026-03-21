// ─── Page Partitioner ─────────────────────────────────────────────
//
// Walks a fully-rendered <article> DOM and splits its children into
// pages that fit within 257mm (A4 content height).  Paragraphs that
// straddle a page boundary are split using the Range API.

// ─── Types ────────────────────────────────────────────────────────

export interface PageContent {
  /** outerHTML of each DOM node assigned to this page, in order */
  fragments: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────

/** Convert 257mm to pixels in the current rendering context. */
function measurePageHeightPx(): number {
  const ruler = document.createElement("div");
  ruler.style.cssText =
    "position:absolute;width:0;height:257mm;visibility:hidden;pointer-events:none";
  document.body.appendChild(ruler);
  const px = ruler.offsetHeight;
  ruler.remove();
  return px;
}

/** Total vertical space an element occupies, including margins. */
function elementHeight(el: HTMLElement, isFirstOnPage: boolean): number {
  const style = getComputedStyle(el);
  const marginTop = isFirstOnPage ? 0 : parseFloat(style.marginTop) || 0;
  const marginBottom = parseFloat(style.marginBottom) || 0;
  return marginTop + el.offsetHeight + marginBottom;
}

/** Margin overhead of a <p> element (top + bottom), for adjusting split budget. */
function paragraphMargins(p: HTMLElement, isFirstOnPage: boolean): number {
  const style = getComputedStyle(p);
  const marginTop = isFirstOnPage ? 0 : parseFloat(style.marginTop) || 0;
  const marginBottom = parseFloat(style.marginBottom) || 0;
  return marginTop + marginBottom;
}

/** Serialize an element (clone) to an HTML string. */
function toHtml(el: HTMLElement): string {
  return el.cloneNode(true) as HTMLElement
    ? (el.cloneNode(true) as HTMLElement).outerHTML
    : "";
}

/** Copy the element's tag name, class, and attributes onto a wrapper. */
function copyAttrs(source: HTMLElement, target: HTMLElement): void {
  for (const attr of source.attributes) {
    target.setAttribute(attr.name, attr.value);
  }
}

// ─── Paragraph splitting (Range API) ─────────────────────────────

/**
 * Split a <p> element so that the first fragment fits within
 * `remainingHeight` pixels.  Returns null if not even one line fits.
 */
function splitParagraph(
  p: HTMLParagraphElement,
  remainingHeight: number,
): { first: string; second: string } | null {
  // Collect all text nodes inside the paragraph
  const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  if (textNodes.length === 0) return null;

  const range = document.createRange();
  range.setStart(p, 0);

  // ── Coarse pass: find the text node where height first exceeds limit
  let targetNode: Text | null = null;
  for (const tn of textNodes) {
    range.setEnd(tn, tn.length);
    if (range.getBoundingClientRect().height > remainingHeight) {
      targetNode = tn;
      break;
    }
  }

  // Every text node fits → nothing to split (shouldn't happen, but guard)
  if (!targetNode) return null;

  // ── Fine pass: binary search within targetNode
  let lo = 0;
  let hi = targetNode.length;
  let bestOffset = 0;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    range.setEnd(targetNode, mid);
    if (range.getBoundingClientRect().height <= remainingHeight) {
      bestOffset = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // ── Snap to word boundary (search backward for whitespace)
  const text = targetNode.textContent ?? "";
  let splitAt = bestOffset;
  while (splitAt > 0 && !/\s/.test(text[splitAt - 1])) splitAt--;
  if (splitAt === 0) splitAt = bestOffset; // no whitespace found, split at char

  // If nothing fits at all, signal to caller
  if (splitAt === 0 && textNodes[0] === targetNode) return null;

  // ── Build the two fragments
  // First half: from start of p to splitAt in targetNode
  const firstRange = document.createRange();
  firstRange.setStart(p, 0);
  firstRange.setEnd(targetNode, splitAt);
  const firstFrag = firstRange.cloneContents();

  // Second half: from splitAt to end of p
  const secondRange = document.createRange();
  secondRange.setStart(targetNode, splitAt);
  secondRange.setEnd(p, p.childNodes.length);
  const secondFrag = secondRange.cloneContents();

  // Wrap in <p> with same attributes
  const firstP = document.createElement(p.tagName) as HTMLParagraphElement;
  copyAttrs(p, firstP);
  firstP.appendChild(firstFrag);

  const secondP = document.createElement(p.tagName) as HTMLParagraphElement;
  copyAttrs(p, secondP);
  secondP.appendChild(secondFrag);

  firstRange.detach();
  secondRange.detach();
  range.detach();

  return { first: firstP.outerHTML, second: secondP.outerHTML };
}

// ─── Main partitioner ─────────────────────────────────────────────

export function partitionPages(article: HTMLElement): PageContent[] {
  const PAGE_H = measurePageHeightPx();
  const pages: PageContent[] = [{ fragments: [] }];
  let remaining = PAGE_H;

  const currentPage = () => pages[pages.length - 1];

  const startNewPage = () => {
    pages.push({ fragments: [] });
    remaining = PAGE_H;
  };

  const children = article.children;

  for (let i = 0; i < children.length; i++) {
    const el = children[i] as HTMLElement;

    // ── Explicit pagebreak
    if (el.classList.contains("neu-pagebreak")) {
      startNewPage();
      continue;
    }

    const isFirst = currentPage().fragments.length === 0;
    const h = elementHeight(el, isFirst);

    // ── Element fits on current page
    if (h <= remaining) {
      // Sticky headings: if this is a heading and it's the last thing that
      // fits (nothing after it fits, or there IS no next content element),
      // move it to the next page to avoid orphaned headings.
      if (/^H[1-6]$/.test(el.tagName)) {
        const next = children[i + 1] as HTMLElement | undefined;
        const hasNextContent = next && !next.classList.contains("neu-pagebreak");
        if (hasNextContent) {
          const nextH = elementHeight(next, false);
          if (nextH > remaining - h) {
            // Next element won't fit after this heading → move heading to next page
            startNewPage();
            currentPage().fragments.push(toHtml(el));
            remaining -= elementHeight(el, true);
            continue;
          }
        }
      }

      currentPage().fragments.push(toHtml(el));
      remaining -= h;
      continue;
    }

    // ── Element doesn't fit — try to split if it's a <p>
    if (el.tagName === "P") {
      const margins = paragraphMargins(el, isFirst);
      // Budget for the paragraph's text content = remaining minus its margins
      const textBudget = Math.floor(remaining - margins);
      const split = textBudget > 0
        ? splitParagraph(el as HTMLParagraphElement, textBudget)
        : null;
      if (split) {
        // First half on current page
        currentPage().fragments.push(split.first);
        // Second half starts a new page
        startNewPage();

        // Measure second half to account for its height
        // We create a temporary element to measure it
        const tmp = document.createElement("div");
        tmp.style.cssText =
          "position:absolute;left:-9999px;width:170mm;visibility:hidden";
        tmp.innerHTML = split.second;
        document.body.appendChild(tmp);
        const secondChild = tmp.firstElementChild as HTMLElement | null;
        const secondH = secondChild
          ? elementHeight(secondChild, true)
          : 0;
        tmp.remove();

        currentPage().fragments.push(split.second);
        remaining -= secondH;
        continue;
      }
      // split returned null → can't fit even one line, fall through to "move whole"
    }

    // ── Indivisible element — move to new page
    startNewPage();
    currentPage().fragments.push(toHtml(el));
    const newH = elementHeight(el, true);
    remaining -= newH;

    // If element is taller than a full page, remaining goes negative.
    // That's fine — next element will start yet another new page.
  }

  return pages;
}
