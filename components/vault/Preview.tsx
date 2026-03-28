"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { IconZoomIn, IconZoomOut, IconDownload, IconFile, IconLayoutList } from "@tabler/icons-react";
import { parse } from "@/lib/parser";
import { partitionPages, type PageContent } from "@/lib/page-partitioner";

// ─── Mermaid ──────────────────────────────────────────────────────

function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;

    const offscreen = document.createElement("div");
    offscreen.style.cssText = "position:absolute;left:-9999px;top:-9999px;visibility:hidden;width:800px";
    document.body.appendChild(offscreen);

    import("mermaid").then(async ({ default: mermaid }) => {
      if (cancelled) { offscreen.remove(); return; }
      const { default: zenuml } = await import("@mermaid-js/mermaid-zenuml");
      await mermaid.registerExternalDiagrams([zenuml]);
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        fontFamily: "var(--font-geist-mono), monospace",
      });
      const id = "mermaid-" + Math.random().toString(36).slice(2);

      const _origStringify = JSON.stringify;
      (JSON.stringify as unknown) = (
        v: unknown, r?: unknown, s?: unknown
      ) => _origStringify(v, (k: string, val: unknown) => {
        if (typeof val === "object" && val !== null && val instanceof Node) return undefined;
        return typeof r === "function" ? (r as (k: string, v: unknown) => unknown)(k, val) : val;
      }, s as string | number | undefined);

      try {
        const { svg, bindFunctions } = await mermaid.render(id, code, offscreen);
        offscreen.remove();
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svg;
        const svgEl = ref.current.querySelector("svg") as SVGSVGElement | null;
        if (svgEl) {
          const hasViewBox = !!svgEl.getAttribute("viewBox");
          if (!hasViewBox) {
            const naturalH = parseFloat(svgEl.style.height) || 400;
            svgEl.style.width = "9999px";
            requestAnimationFrame(() => {
              if (cancelled || !ref.current) return;
              const containerW = ref.current.offsetWidth || 600;
              const inner = (
                ref.current.querySelector("[id^='container-']") ??
                ref.current.querySelector(".zenuml")
              ) as HTMLElement | null;
              const naturalW = inner?.scrollWidth ?? containerW;
              const scale = Math.min(1, containerW / naturalW);
              const displayW = Math.round(naturalW * scale);
              const displayH = Math.round(naturalH * scale);
              svgEl.setAttribute("viewBox", `0 0 ${naturalW} ${naturalH}`);
              svgEl.removeAttribute("width");
              svgEl.removeAttribute("height");
              svgEl.style.width = `${displayW}px`;
              svgEl.style.height = `${displayH}px`;
            });
          } else {
            svgEl.removeAttribute("width");
            svgEl.removeAttribute("height");
            svgEl.style.width = "100%";
            svgEl.style.height = "auto";
          }
        }
        bindFunctions?.(ref.current);
      } catch (err) {
        offscreen.remove();
        if (!cancelled && ref.current) {
          console.warn("[Mermaid] render error:", err);
          ref.current.textContent = code;
        }
      } finally {
        JSON.stringify = _origStringify;
      }
    });

    return () => { cancelled = true; offscreen.remove(); };
  }, [code]);

  return <div ref={ref} style={{ margin: "1rem 0", display: "flex", justifyContent: "center", maxWidth: "100%", overflow: "hidden" }} />;
}

// ─── Markdown components (shared) ─────────────────────────────────

const mdComponents = {
  code({ className, children, ...props }: React.ComponentPropsWithoutRef<"code"> & { className?: string }) {
    if (className === "language-mermaid") {
      const code = children != null ? String(children).trim() : "";
      if (!code) return null;
      return <MermaidBlock code={code} />;
    }
    return <code className={className} {...props}>{children}</code>;
  },
};

const remarkPlugins = [remarkGfm, remarkBreaks, remarkMath] as Parameters<typeof ReactMarkdown>[0]["remarkPlugins"];
const rehypePlugins = [rehypeRaw, rehypeKatex] as Parameters<typeof ReactMarkdown>[0]["rehypePlugins"];

// ─── A4 Page ─────────────────────────────────────────────────────

function A4Page({ scale, origin, html }: { scale: number; origin: string; html: string }) {
  return (
    <div
      className="w-[210mm] h-[297mm] bg-[#0a0a0a] border border-border shrink-0 break-words"
      style={{ transform: `scale(${scale})`, transformOrigin: origin }}
    >
      <div className="px-[20mm] py-[20mm] h-full overflow-hidden">
        <div className="neu-document" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}

// ─── Preview ──────────────────────────────────────────────────────

const ZOOM_MIN = 25;
const ZOOM_MAX = 200;
const ZOOM_DEFAULT = 100;
const ZOOM_STEPS = [25, 50, 75, 100, 125, 150, 200];

function clampZoom(v: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(v)));
}

function nextStep(current: number): number {
  for (const s of ZOOM_STEPS) {
    if (s > current) return s;
  }
  return current;
}

function prevStep(current: number): number {
  for (let i = ZOOM_STEPS.length - 1; i >= 0; i--) {
    if (ZOOM_STEPS[i] < current) return ZOOM_STEPS[i];
  }
  return current;
}

interface PreviewProps {
  content: string;
}

export function Preview({ content }: PreviewProps) {
  const markdown = useMemo(() => {
    try { return parse(content); }
    catch { return content; }
  }, [content]);

  const [zoomPct, setZoomPct] = useState(ZOOM_DEFAULT);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"single" | "scroll">("single");
  const scale = zoomPct / 150; // 100% display = scale 0.667 (fits A4 in most viewports)

  const zoomIn    = () => setZoomPct((z) => nextStep(z));
  const zoomOut   = () => setZoomPct((z) => prevStep(z));
  const zoomReset = () => setZoomPct(ZOOM_DEFAULT);

  // ── Ctrl+Wheel zoom (entire vault page) ────────────────────────
  const canvasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setZoomPct((z) => clampZoom(z + (e.deltaY < 0 ? 5 : -5)));
    };
    document.addEventListener("wheel", handler, { passive: false });
    return () => document.removeEventListener("wheel", handler);
  }, []);

  // ── Page partitioning ───────────────────────────────────────────
  const measureRef = useRef<HTMLElement>(null);
  const [pages, setPages] = useState<PageContent[]>([{ fragments: [] }]);
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = pages.length;

  const recomputePages = useCallback(() => {
    if (!measureRef.current) return;
    const newPages = partitionPages(measureRef.current);
    setPages(newPages);
    setCurrentPage((prev) => Math.min(prev, newPages.length - 1));
  }, []);

  // Recompute after ReactMarkdown renders
  useEffect(() => {
    const raf = requestAnimationFrame(recomputePages);
    return () => cancelAnimationFrame(raf);
  }, [markdown, recomputePages]);

  // Watch for async changes (Mermaid SVGs appearing)
  useEffect(() => {
    if (!measureRef.current) return;
    let timer: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(recomputePages, 150);
    });
    observer.observe(measureRef.current, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [recomputePages]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  };

  // ── PDF export ──────────────────────────────────────────────────
  const exportPdf = async () => {
    setExporting(true);
    try {
      // Concatenate all pages with pagebreak divs between them
      const fullHtml = pages
        .map((page) => page.fragments.join(""))
        .join('<div class="neu-pagebreak"></div>');

      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: fullHtml }),
      });

      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setExporting(false);
    }
  };

  // ── Pagination links ────────────────────────────────────────────
  function buildPageLinks() {
    const items: React.ReactNode[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 0; i < totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => goToPage(i)}
              isActive={i === currentPage}
              className="cursor-pointer select-none"
            >
              {i + 1}
            </PaginationLink>
          </PaginationItem>,
        );
      }
    } else {
      items.push(
        <PaginationItem key={0}>
          <PaginationLink onClick={() => goToPage(0)} isActive={currentPage === 0} className="cursor-pointer select-none">1</PaginationLink>
        </PaginationItem>,
      );

      const start = Math.max(1, currentPage - 1);
      const end = Math.min(totalPages - 2, currentPage + 1);

      if (start > 1) items.push(<PaginationItem key="ell-start"><PaginationEllipsis /></PaginationItem>);

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink onClick={() => goToPage(i)} isActive={i === currentPage} className="cursor-pointer select-none">
              {i + 1}
            </PaginationLink>
          </PaginationItem>,
        );
      }

      if (end < totalPages - 2) items.push(<PaginationItem key="ell-end"><PaginationEllipsis /></PaginationItem>);

      items.push(
        <PaginationItem key={totalPages - 1}>
          <PaginationLink onClick={() => goToPage(totalPages - 1)} isActive={currentPage === totalPages - 1} className="cursor-pointer select-none">
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return items;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Hidden measurement container — same width as A4 content area */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "170mm",
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        <article ref={measureRef} className="neu-document">
          <ReactMarkdown
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins}
            components={mdComponents}
          >{markdown}</ReactMarkdown>
        </article>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-card">
        <Button variant="ghost" size="icon-xs" onClick={zoomOut} disabled={zoomPct <= ZOOM_MIN}>
          <IconZoomOut className="h-3.5 w-3.5" />
        </Button>
        <div className="relative flex items-center">
          <input
            type="number"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            value={zoomPct}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v)) setZoomPct(clampZoom(v));
            }}
            onDoubleClick={zoomReset}
            className="text-xs text-muted-foreground tabular-nums w-10 text-right bg-transparent border-none outline-none focus:text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [caret-color:currentColor]"
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={zoomIn} disabled={zoomPct >= ZOOM_MAX}>
          <IconZoomIn className="h-3.5 w-3.5" />
        </Button>

        <div className="flex-1" />

        {/* Pagination (single mode only) */}
        {viewMode === "single" && totalPages > 1 && (
          <Pagination className="w-auto mx-0">
            <PaginationContent className="gap-0.5">
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => goToPage(currentPage - 1)}
                  className={`cursor-pointer select-none h-7 text-xs px-2 ${currentPage === 0 ? "pointer-events-none opacity-50" : ""}`}
                />
              </PaginationItem>
              {buildPageLinks()}
              <PaginationItem>
                <PaginationNext
                  onClick={() => goToPage(currentPage + 1)}
                  className={`cursor-pointer select-none h-7 text-xs px-2 ${currentPage === totalPages - 1 ? "pointer-events-none opacity-50" : ""}`}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setViewMode((m) => m === "single" ? "scroll" : "single")}
          title={viewMode === "single" ? "Scroll view" : "Single page"}
        >
          {viewMode === "single" ? <IconLayoutList className="h-3.5 w-3.5" /> : <IconFile className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={exportPdf} disabled={exporting} title="Export PDF">
          <IconDownload className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Canvas */}
      <div ref={canvasRef} className="flex-1 overflow-auto flex justify-center bg-card bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-[length:24px_24px] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:border-[4px] [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:[background-clip:padding-box]">
        {viewMode === "single" ? (
          <div
            className="shrink-0"
            style={{
              width: `calc(210mm * ${scale} + 96px)`,
              height: `calc(297mm * ${scale} + 96px)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <A4Page scale={scale} origin="center center" html={pages[currentPage]?.fragments.join("") ?? ""} />
          </div>
        ) : (
          <div
            className="shrink-0 flex flex-col items-center"
            style={{
              width: `calc(210mm * ${scale} + 96px)`,
              padding: "24px 0",
              gap: "12px",
            }}
          >
            {pages.map((page, i) => (
              <div
                key={i}
                style={{
                  width: `calc(210mm * ${scale})`,
                  height: `calc(297mm * ${scale})`,
                }}
              >
                <A4Page scale={scale} origin="top left" html={page.fragments.join("")} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
