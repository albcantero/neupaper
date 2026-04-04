"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AuthorAlt() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="max-w-[1250px] mx-auto bg-card">
      <h2 className="text-[28px] font-semibold mb-4 px-16 pt-16">Built for the indie developer. <span className="text-muted-foreground">By one of us.</span></h2>
      <div className={`relative overflow-hidden ${expanded ? "" : "max-h-28"}`}>
        <div className="relative">
          <div className="flex flex-col gap-4 text-base leading-relaxed text-muted-foreground px-16 pb-16">

            <p>Hi there! 👋</p>
            <p>
              I&apos;m a freelance developer. Every month it&apos;s the same thing: open last month&apos;s invoice in Google Docs, duplicate it, change the date, update the line items, hope I didn&apos;t forget to change the invoice number. Excel was worse because no matter what you do, it still looks like a spreadsheet. I tried billing software like Holded, which works fine for invoices but is useless for proposals or reports. And I already write everything else in Markdown. One day I asked myself: why can&apos;t I write my professional documents this way too?
            </p>

            <h3 className="text-lg font-semibold text-foreground mt-4">What it solves</h3>
            <p>
              Neupaper isn&apos;t just another editor. It&apos;s a document engine. The core idea is called Markdown Isles: small islands of logic inside standard Markdown. You write your template once, connect it to your data, and the document builds itself. Change the data, get a new document. Export to PDF and you&apos;re done.
            </p>

            <h3 className="text-lg font-semibold text-foreground mt-4">Why now</h3>
            <p>
              Every tool out there today only solves half the problem. Typst is too academic. Notion can&apos;t export a decent PDF. Google Docs hasn&apos;t changed since 2010. No one is bringing together the simplicity of Markdown, dynamic templates, and professional PDF output in a single place built for developers. That&apos;s the gap we&apos;re filling.
            </p>

            <h3 className="text-lg font-semibold text-foreground mt-4">How it&apos;s built</h3>
            <p>
              Open source, local-first. Your documents live in your browser with no account required. The code is on GitHub and anyone can self-host it. The version at neupaper.app is for those who&apos;d rather pay a few euros a month and not worry about infrastructure. The premium plan is a way of saying thanks, not a paywall.
            </p>

            <h3 className="text-lg font-semibold text-foreground mt-4">Follow along</h3>
            <p>
              I&apos;m building Neupaper in the open. Open the vault and try it yourself. The best way to understand it is to use it.
            </p>

            <span className="text-7xl text-foreground/80 mb-0 pt-2" style={{ fontFamily: "Jalliya" }}>Alberto</span>

            <div className="flex flex-col gap-0.5 -mt-2">
              <span className="text-sm font-medium text-foreground">Alberto Cantero</span>
              <span className="text-sm text-muted-foreground">Founder &amp; CEO, CTO, PM, Head of Design, Head of Marketing, QA Lead, and support team</span>
            </div>
          </div>
        </div>
        {!expanded && (
          <div className="absolute inset-0 flex items-center justify-center pb-4">
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--card), color-mix(in oklab, var(--card) 70%, transparent), transparent)" }} />
            <Button
              variant="outline"
              size="sm"
              className="relative z-10 rounded-lg bg-background text-foreground shadow-none hover:bg-muted dark:bg-background dark:text-foreground dark:hover:bg-muted dark:border-input"
              onClick={() => setExpanded(true)}
            >
              Read more
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
