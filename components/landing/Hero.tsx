"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ArrowDownAnimated } from "@/components/ui/arrow-down-animated";
import { Button } from "@/components/ui/button";
import { HeroGrid } from "@/components/landing/HeroGrid";

export function Hero() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="max-w-[1250px] mx-auto relative overflow-clip bg-transparent">
      <HeroGrid />
      <div className="relative flex flex-col items-center justify-center gap-8 px-8 py-44 text-center ">
        <h1 className="text-6xl font-bold tracking-tight max-w-5xl bg-gradient-to-r from-foreground from-30% to-muted-foreground bg-clip-text text-transparent">
          Reusable professional documents written in Markdown
        </h1>
        <div className="flex items-center gap-6">
          <Button size="sm" className="rounded-full text-xs font-medium tracking-tight uppercase font-mono-display">
            <Link href="/vault" className="group flex items-center gap-1.5">
              Open Vault
              <ArrowUpRight className="size-3.5 group-hover:rotate-45 transition-transform duration-200" strokeWidth={2} />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs font-medium tracking-tight uppercase font-mono-display"
            onClick={() => scrollTo("intro")}
          >
            <span className="group flex items-center gap-1.5">
              Explore
              <ArrowDownAnimated className="size-3.5" strokeWidth={2} />
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
}
