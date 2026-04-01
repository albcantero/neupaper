import { IconFileExport, IconMathFunction, IconChartDots, IconGitBranch } from "@tabler/icons-react";

export function Bento() {
  return (
    <section id="bento" className="max-w-5xl mx-auto px-8 py-24">
      <div className="grid grid-cols-3 grid-rows-2 gap-4 h-[420px]">

        {/* Bento 1 — large, top-left (col-span-2) */}
        <div className="col-span-2 row-span-1 rounded-2xl p-8 grid grid-cols-2 gap-6 border border-border bg-card">
          <div className="flex flex-col justify-center">
            <h3 className="text-2xl font-semibold tracking-tight leading-tight">
              PDF that matches<br />your preview. Always.
            </h3>
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              A4 canvas with real page breaks. Export and it looks exactly like the screen.
            </p>
          </div>
        </div>

        {/* Bento 2 — tall, right (col-span-1, row-span-2) */}
        <div className="col-span-1 row-span-2 rounded-2xl p-8 border border-border bg-card flex flex-col justify-between overflow-hidden">
          <img src="/ball.svg" alt="" className="w-full invert" />
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold tracking-tight leading-tight">
              Open source. Local-first.
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              No account. No cloud. Your documents never leave your browser.
            </p>
          </div>
        </div>

        {/* Bento 3 — small, bottom-left */}
        <div className="col-span-1 row-span-1 rounded-2xl p-8 border border-border bg-card flex flex-col justify-center">
          <div className="flex items-center gap-2 text-accent-display mb-3">
            <IconMathFunction className="size-5" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight leading-tight">
            LaTeX compatible
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Full KaTeX support. Inline and display math, rendered at native quality.
          </p>
        </div>

        {/* Bento 4 — small, bottom-middle */}
        <div className="col-span-1 row-span-1 rounded-2xl p-8 border border-border bg-card flex flex-col justify-center">
          <div className="flex items-center gap-2 text-accent-display mb-3">
            <IconChartDots className="size-5" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight leading-tight">
            Mermaid compatible
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Latest Mermaid with ZenUML. Gantt charts, ER diagrams, flowcharts — all in Markdown.
          </p>
        </div>

      </div>
    </section>
  );
}
