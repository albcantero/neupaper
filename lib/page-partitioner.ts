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

/** Total vertical space an element occupies, including margins.
 *  `prevMarginBottom` is the bottom margin of the previous element
 *  — used to simulate CSS margin collapse between adjacent siblings. */
function elementHeight(
  el: HTMLElement,
  isFirstOnPage: boolean,
  prevMarginBottom: number = 0,
): number {
  const style = getComputedStyle(el);
  const marginTop = isFirstOnPage ? 0 : parseFloat(style.marginTop) || 0;
  const marginBottom = parseFloat(style.marginBottom) || 0;
  // CSS collapses adjacent margins: the effective gap is max(prev bottom, this top)
  const collapsedTop = isFirstOnPage
    ? 0
    : Math.max(marginTop, prevMarginBottom) - prevMarginBottom;
  return collapsedTop + el.offsetHeight + marginBottom;
}

/** Return the bottom margin of an element (for collapse tracking). */
function bottomMargin(el: HTMLElement): number {
  return parseFloat(getComputedStyle(el).marginBottom) || 0;
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
  let prevMB = 0; // bottom margin of previous element (for collapse)

  const startNewPage = () => {
    pages.push({ fragments: [] });
    remaining = PAGE_H;
    prevMB = 0;
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
    const h = elementHeight(el, isFirst, prevMB);

    // ── Element fits on current page
    if (h <= remaining) {
      currentPage().fragments.push(toHtml(el));
      remaining -= h;
      prevMB = bottomMargin(el);
      continue;
    }

    // ── Element doesn't fit — try to split lists by <li>
    if (el.tagName === "OL" || el.tagName === "UL") {
      const listItems = el.children;
      if (listItems.length > 0) {
        // Build first half: items that fit on current page
        const firstList = document.createElement(el.tagName);
        copyAttrs(el, firstList);
        let usedHeight = 0;
        let splitIndex = 0;

        // Account for list margin-top on current page
        const listStyle = getComputedStyle(el);
        const listMarginTop = isFirst ? 0 : parseFloat(listStyle.marginTop) || 0;
        usedHeight += listMarginTop;

        for (let j = 0; j < listItems.length; j++) {
          const li = listItems[j] as HTMLElement;
          const liH = elementHeight(li, j === 0);
          if (usedHeight + liH > remaining) break;
          usedHeight += liH;
          splitIndex = j + 1;
        }

        if (splitIndex > 0 && splitIndex < listItems.length) {
          // Some items fit — split the list
          for (let j = 0; j < splitIndex; j++) {
            firstList.appendChild(listItems[j].cloneNode(true));
          }
          currentPage().fragments.push(firstList.outerHTML);

          // Remaining items go to next page
          const secondList = document.createElement(el.tagName);
          copyAttrs(el, secondList);
          // For <ol>, continue numbering from where we left off
          if (el.tagName === "OL") {
            const startAttr = el.getAttribute("start");
            const startNum = startAttr ? parseInt(startAttr, 10) : 1;
            secondList.setAttribute("start", String(startNum + splitIndex));
          }
          for (let j = splitIndex; j < listItems.length; j++) {
            secondList.appendChild(listItems[j].cloneNode(true));
          }

          startNewPage();
          // Measure second list
          const tmp = document.createElement("div");
          tmp.style.cssText = "position:absolute;left:-9999px;width:170mm;visibility:hidden";
          tmp.appendChild(secondList.cloneNode(true));
          document.body.appendChild(tmp);
          const secondH = elementHeight(tmp.firstElementChild as HTMLElement, true);
          tmp.remove();

          currentPage().fragments.push(secondList.outerHTML);
          remaining -= secondH;
          prevMB = bottomMargin(el);
          continue;
        }
        // splitIndex === 0: not even one item fits → fall through to move whole
        // splitIndex === listItems.length: all fit (shouldn't reach here) → fall through
      }
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
        prevMB = secondChild ? bottomMargin(secondChild) : 0;
        continue;
      }
      // split returned null → can't fit even one line, fall through to "move whole"
    }

    // ── Indivisible element — move to new page
    startNewPage();
    currentPage().fragments.push(toHtml(el));
    const newH = elementHeight(el, true);
    remaining -= newH;
    prevMB = bottomMargin(el);

    // If element is taller than a full page, remaining goes negative.
    // That's fine — next element will start yet another new page.
  }

  return pages;
}
