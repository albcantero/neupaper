import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroGrid } from "@/components/landing/HeroGrid";

export function Hero() {
  return (
    <section className="max-w-5xl mx-auto relative overflow-clip">
      <HeroGrid />
      <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 120px 60px black" }} />
      <div className="relative flex flex-col items-center justify-center gap-8 px-8 py-44 text-center font-[family-name:var(--font-sans)]">
        <p className="text-base font-medium tracking-widest uppercase text-muted-foreground">Neupaper</p>
        <h1 className="text-7xl font-bold tracking-tight max-w-3xl bg-gradient-to-r from-white from-30% to-neutral-500 bg-clip-text text-transparent">
          A better way to build documents
        </h1>
        <p className="text-xl text-muted-foreground">
          Finally, a typesetting system built on Markdown.
        </p>
        <Button asChild size="lg">
          <Link href="/vault">Abrir vault</Link>
        </Button>
      </div>
    </section>
  );
}
