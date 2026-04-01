"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScroll } from "@/lib/hooks/use-scroll";
import { cn } from "@/lib/utils";

export function Nav() {
  const scrolled = useScroll(10);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 mx-auto w-full max-w-5xl border-transparent border-b md:rounded-md md:border md:transition-all md:ease-out",
        {
          "border-border bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50 md:top-2 md:max-w-4xl md:shadow":
            scrolled,
        }
      )}
    >
      <nav
        className={cn(
          "flex h-14 w-full items-center justify-between px-8 md:h-12 md:transition-all md:ease-out",
          {
            "md:px-4": scrolled,
          }
        )}
      >
        <Link href="/" className="rounded-md p-2 hover:bg-muted/50">
          <div className="h-8 w-32" style={{ backgroundColor: "var(--accent-display)", mask: "url(/logo-app-name.svg) no-repeat center / contain", WebkitMask: "url(/logo-app-name.svg) no-repeat center / contain" }} />
        </Link>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => document.getElementById("intro")?.scrollIntoView({ behavior: "smooth" })}>
            <span className="font-mono-display uppercase text-sm tracking-tight">
              Features
            </span>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="https://github.com/user/neupaper" className="font-mono-display uppercase text-sm tracking-tight">
              GitHub
            </Link>
          </Button>
          <Button size="sm" className="rounded-full text-xs font-medium tracking-tight uppercase font-mono-display">
            <Link href="/vault" className="group flex items-center gap-1.5">
              Open Vault
              <ArrowUpRight className="size-3.5 group-hover:rotate-45 transition-transform duration-200" strokeWidth={2} />
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
