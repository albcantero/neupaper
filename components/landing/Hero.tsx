import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ArrowDownAnimated } from "@/components/ui/arrow-down-animated";
import { Button } from "@/components/ui/button";
import { HeroGrid } from "@/components/landing/HeroGrid";

export function Hero() {
  return (
    <section className="max-w-5xl mx-auto relative overflow-clip">
      <HeroGrid />
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 120px 60px var(--background)" }} />
      <div className="relative flex flex-col items-center justify-center gap-8 px-8 py-44 text-center ">
        <p className="text-base font-medium tracking-widest uppercase text-muted-foreground">Neupaper</p>
        <h1 className="text-7xl font-bold tracking-tight max-w-3xl bg-gradient-to-r from-foreground from-30% to-muted-foreground bg-clip-text text-transparent">
          A better way to build documents
        </h1>
        <p className="text-xl text-muted-foreground">
          Finally, a typesetting system built on Markdown.
        </p>
        <div className="flex items-center gap-6">
          <Button className="rounded-full text-sm font-medium tracking-tighter uppercase font-mono-display">
            <Link href="/vault" className="group flex items-center gap-1.5">
              Open Vault
              <ArrowUpRight className="size-4 group-hover:rotate-45 transition-transform duration-200" strokeWidth={2} />
            </Link>
          </Button>
          <Button variant="outline" className="rounded-full text-sm font-base tracking-tighter uppercase font-mono-display">
            <Link href="#bento" className="group flex items-center gap-1.5">
              Explore
              <ArrowDownAnimated className="size-4" strokeWidth={2} />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
