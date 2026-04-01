"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
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
import { IconPlus, IconMinus, IconDownload, IconPalette, IconFiles, IconFilesOff } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Separator } from "@/components/ui/separator";
import { parseWithConfig } from "@/lib/parser";
import { partitionPages, type PageContent } from "@/lib/page-partitioner";
import { wrapSections, formatPageNumber } from "@/app/vault/themes/theme-utils";

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
    if (className?.includes("language-mermaid")) {
      const code = children != null ? String(children).trim() : "";
      if (!code) return null;
      return <MermaidBlock code={code} />;
    }
    return <code className={className} {...props}>{children}</code>;
  },
};

const remarkPlugins = [remarkGfm, remarkBreaks, remarkMath] as Parameters<typeof ReactMarkdown>[0]["remarkPlugins"];
const rehypePlugins = [rehypeRaw, rehypeKatex, rehypeHighlight] as Parameters<typeof ReactMarkdown>[0]["rehypePlugins"];

// ─── A4 Page ─────────────────────────────────────────────────────

interface A4PageProps {
  scale: number;
  origin: string;
  html: string;
  theme: string;
  pageNumber?: number;
  totalPages?: number;
  header?: string | null;
}

function A4Page({ scale, origin, html, theme, pageNumber, totalPages, header }: A4PageProps) {
  const isMinimal = theme === "modernist";
  let finalHtml = isMinimal ? wrapSections(html) : html;

  // For modernist, inject header/page-number as HTML inside the theme div
  if (isMinimal) {
    const headerHtml = header ? `<div class="neu-header">${header}</div>` : "";
    const pageNumHtml = pageNumber != null && totalPages != null
      ? `<div class="neu-page-number">${formatPageNumber(pageNumber, totalPages!, theme)}</div>`
      : "";
    finalHtml = headerHtml + finalHtml + pageNumHtml;
  }

  return (
    <div
      className="relative w-[210mm] h-[297mm] bg-[#0a0a0a] border border-white/[0.08] shrink-0 break-words shadow-[inset_0_0_1px_1.5px_hsla(0,0%,100%,0.15)]"
      style={{ transform: `scale(${scale})`, transformOrigin: origin }}
    >
      <div className="h-full overflow-hidden [&>.neu-document]:h-full">
        <div className={theme} dangerouslySetInnerHTML={{ __html: finalHtml }} />
      </div>
      {!isMinimal && header && (
        <div className="absolute top-[8mm] left-[16mm] text-[12pt] text-white/30 pointer-events-none font-[family-name:var(--font-geist-mono)] pl-[10pt]">
          {header}
        </div>
      )}
      {!isMinimal && pageNumber != null && totalPages != null && (
        <div className="absolute bottom-[8mm] right-[16mm] text-[12pt] text-white/30 pointer-events-none font-[family-name:var(--font-geist-mono)] pr-[10pt]">
          {formatPageNumber(pageNumber, totalPages, theme)}
        </div>
      )}
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

const DOCUMENT_THEMES = [
  { id: "neu-document", label: "Neu Document" },
  { id: "modernist", label: "Modernist" },
] as const;

interface PreviewProps {
  content: string;
  components?: Record<string, string>;
  dataFiles?: Record<string, string>;
  onContentChange?: (content: string) => void;
}

export function Preview({ content, components = {}, dataFiles = {}, onContentChange }: PreviewProps) {
  const { markdown, pageNumbers, header, theme } = useMemo(() => {
    try {
      const result = parseWithConfig(content, {}, components, dataFiles);
      return {
        markdown: result.html,
        pageNumbers: result.config["page-numbers"] === "yes",
        header: result.config["header"] ?? null,
        theme: result.config["theme"] || "neu-document",
      };
    } catch {
      return { markdown: content, pageNumbers: false, header: null, theme: "neu-document" };
    }
  }, [content, components, dataFiles]);

  const changeTheme = useCallback((themeId: string) => {
    if (!onContentChange) return;
    const configRegex = /^\$\{\s*config\b([^}]*)\}\s*$/m;
    const match = content.match(configRegex);
    if (match) {
      const line = match[0];
      const themeParamRegex = /theme="[^"]*"|theme=\S+/;
      let newLine: string;
      if (themeParamRegex.test(line)) {
        newLine = line.replace(themeParamRegex, `theme="${themeId}"`);
      } else {
        newLine = line.replace(/\}\s*$/, ` theme="${themeId}" }`);
      }
      onContentChange(content.replace(line, newLine));
    } else {
      onContentChange(`\${ config theme="${themeId}" }\n${content}`);
    }
  }, [content, onContentChange]);

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
      // Wrap each page in its own neu-document div (full A4 with guides, page-break between)
      const total = pages.length;
      const fullHtml = pages
        .map((page, i) => {
          const raw = page.fragments.join("");
          const content = theme === "modernist" ? wrapSections(raw) : raw;
          const headerEl = header
            ? `<div class="neu-header">${header}</div>`
            : "";
          const pageNum = pageNumbers
            ? `<div class="neu-page-number">${formatPageNumber(i + 1, total, theme)}</div>`
            : "";
          return `<div class="${theme} neu-page"${i > 0 ? ' style="break-before:page"' : ''}>${headerEl}${content}${pageNum}</div>`;
        })
        .join("");

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
    <div className="h-full flex flex-col relative group/preview">
      {/* Hidden measurement container — same width as A4 page */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "210mm",
          visibility: "hidden",
          pointerEvents: "none",
        }}
      >
        <article ref={measureRef} className={theme}>
          <ReactMarkdown
            remarkPlugins={remarkPlugins}
            rehypePlugins={rehypePlugins}
            components={mdComponents}
          >{markdown}</ReactMarkdown>
        </article>
      </div>

      {/* Toolbar — floating on hover */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-3 py-1.5 bg-card border border-border rounded-lg shadow-lg opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut} disabled={zoomPct <= ZOOM_MIN}>
          <IconMinus className="h-4 w-4" />
        </Button>
        <div className="relative flex items-center justify-center w-12">
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
            className="text-xs text-muted-foreground tabular-nums w-6 text-center bg-transparent border-none outline-none focus:text-foreground [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [caret-color:currentColor] p-0"
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn} disabled={zoomPct >= ZOOM_MAX}>
          <IconPlus className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 mx-1" />

        <IconPalette className="h-4 w-4 text-muted-foreground" />
        <Combobox
          items={DOCUMENT_THEMES.map((t) => t.label)}
          value={DOCUMENT_THEMES.find((t) => t.id === theme)?.label ?? null}
          onValueChange={(val) => {
            const t = DOCUMENT_THEMES.find((t) => t.label === val);
            if (t) changeTheme(t.id);
          }}
        >
          <ComboboxInput placeholder="Theme" showClear={false} className="h-7 text-xs w-40" />
          <ComboboxContent>
            <ComboboxEmpty>No themes found.</ComboboxEmpty>
            <ComboboxList>
              {(item) => {
                const t = DOCUMENT_THEMES.find((t) => t.label === item);
                return (
                  <ComboboxItem key={item} value={item}>
                    <span className="flex-1">{item}</span>
                    {t?.id === "modernist" && <span className="ml-auto text-[9px] font-mono font-medium text-white border border-white rounded-sm px-1 h-4 inline-flex items-center">BETA</span>}
                  </ComboboxItem>
                );
              }}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        <Separator orientation="vertical" className="data-[orientation=vertical]:h-4 mx-1" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon" className="h-7 w-7"
                onClick={() => setViewMode((m) => m === "single" ? "scroll" : "single")}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={viewMode}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.05 }}
                    className="flex items-center justify-center"
                  >
                    {viewMode === "single" ? <IconFiles className="h-4 w-4" /> : <IconFilesOff className="h-4 w-4" />}
                  </motion.span>
                </AnimatePresence>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Scroll view
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5" onClick={exportPdf} disabled={exporting}>
          <IconDownload className="h-4 w-4" />
          Download
        </Button>
      </div>

      {/* Canvas */}
      <div ref={canvasRef} className="flex-1 overflow-auto flex justify-center bg-card bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-[length:24px_24px] pt-2 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:border-[4px] [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:[background-clip:padding-box]">
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
            <A4Page scale={scale} origin="center center" html={pages[currentPage]?.fragments.join("") ?? ""} theme={theme} pageNumber={pageNumbers ? currentPage + 1 : undefined} totalPages={pageNumbers ? pages.length : undefined} header={header} />
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
                <A4Page scale={scale} origin="top left" html={page.fragments.join("")} theme={theme} pageNumber={pageNumbers ? i + 1 : undefined} totalPages={pageNumbers ? pages.length : undefined} header={header} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom toolbar — pagination */}
      {viewMode === "single" && totalPages > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-3 py-1.5 bg-card border border-border rounded-lg shadow-lg opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200">
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
        </div>
      )}
    </div>
  );
}
