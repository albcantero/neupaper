"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight">Neupaper</h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Dynamic documents that think.
          <br />
          <span className="text-sm italic">
            Small islands of logic in a sea of Markdown.
          </span>
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/vault">Abrir vault</Link>
      </Button>
    </div>
  );
}
