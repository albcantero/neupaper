"use client";

import { useState } from "react";
import { IconBrandX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

const team = [
  {
    src: "/images/me.png",
    name: "Alberto Cantero",
    role: "Indie developer based in Spain",
    pos: "50% 30%",
  },
  {
    src: "/images/cat1.png",
    name: "Michi",
    role: "Chief Napping Officer",
    pos: "50% 50%",
  },
  {
    src: "/images/cat2.png",
    name: "Gatete",
    role: "Senior Keyboard Blocker",
    pos: "50% 50%",
  },
  {
    src: "/images/coffee.png",
    name: "The Coffee Machine",
    role: "Core Infrastructure",
    pos: "50% 50%",
  },
  {
    src: "/images/keyboard.png",
    name: "Keychron K2 HE",
    role: "Input Engineering",
    pos: "50% 50%",
  },
];

function CardStack() {
  const [active, setActive] = useState(0);

  const next = () => setActive((i) => (i + 1) % team.length);
  const prev = () => setActive((i) => (i - 1 + team.length) % team.length);

  return (
    <div
      className="relative w-64 h-[340px] cursor-grab active:cursor-grabbing"
      onClick={next}
    >
      {team.map((member, index) => {
        const offset = (index - active + team.length) % team.length;
        const isActive = offset === 0;
        const behind = offset > 0 && offset <= 2;
        const hidden = offset > 2;

        return (
          <motion.div
            key={member.name}
            className="absolute inset-0 rounded-xl overflow-hidden border border-border shadow-lg"
            animate={{
              scale: isActive ? 1 : 1 - offset * 0.06,
              y: offset * 12,
              x: offset % 2 === 0 ? offset * 8 : -offset * 8,
              rotateZ: isActive ? 0 : offset % 2 === 0 ? offset * 2 : -offset * 2,
              opacity: hidden ? 0 : 1,
              zIndex: team.length - offset,
            }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            style={{ pointerEvents: isActive ? "auto" : "none" }}
          >
            <div className="h-full flex flex-col relative">
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={member.src}
                  alt=""
                  className="w-full h-full object-cover blur-md scale-125"
                />
              </div>
              <Card className="border-none bg-transparent flex-1 flex items-center justify-center p-8 relative z-10 gap-0">
                <div className="size-44 overflow-hidden shadow-lg">
                  <img
                    src={member.src}
                    alt={member.name}
                    className="w-full h-full object-cover scale-150"
                    style={{ objectPosition: member.pos }}
                  />
                </div>
              </Card>
              <Card className="border-none gap-0 py-4 rounded-none relative z-10">
                <CardHeader className="text-center">
                  <CardTitle className="text-sm">{member.name}</CardTitle>
                  <CardDescription className="text-xs">{member.role}</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function Author() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="max-w-[1250px] mx-auto px-8 pb-10 bg-card">
      <div className="flex flex-col md:flex-row">
        <div className="flex-1 flex flex-col gap-4 pt-10 md:pr-12 relative h-[500px]">
          <h2 className="text-2xl font-semibold relative z-10">Meet the team behind Neupaper.</h2>
          <div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-[length:24px_24px]" style={{ maskImage: "radial-gradient(ellipse at center, black 50%, transparent 90%)", WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 90%)" }} />
          <div className="mt-4 flex-1 flex items-center justify-center overflow-visible relative z-10">
            <CardStack />
          </div>
        </div>
        {/* <div className="hidden md:block w-px bg-input" /> */}
        <div className="flex-1 flex flex-col gap-4 pt-10 md:pl-12 self-start">
          <h2 className="text-2xl font-semibold">Built for the indie developer. <span className="text-muted-foreground">By one of us.</span></h2>
          <div className="relative mt-2">
            <div className={`flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground overflow-hidden transition-all duration-500 ${expanded ? "max-h-[1000px]" : "max-h-80"}`}>
              <p>
                I built Neupaper because every time I needed to send a proposal, an invoice, or a project report, I ended up in the same loop — fighting Word templates that break when you breathe on them, or staring at LaTeX docs trying to remember how to make a table.
              </p>
              <p>
                I already write everything in Markdown. My notes, my READMEs, my docs. Why couldn&apos;t I write my professional documents the same way and get a clean PDF out of it?
              </p>
              <p>
                That&apos;s Neupaper. No new syntax to learn if you know Markdown. No bloated editor. Just write, preview on a real A4 canvas, and export a PDF that looks exactly like what you see. The dynamic bits — variables, loops, reusable components — are there when you need them, invisible when you don&apos;t.
              </p>
              <p>
                It&apos;s open source, local-first, and built for people like me — developers and technical freelancers who want professional output without professional suffering.
              </p>

              <span className="text-7xl text-foreground/80" style={{ fontFamily: "Jalliya" }}>Alberto</span>

              <a
                href="https://x.com/albcantero"
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col gap-0.5"
              >
                <span className="text-sm font-medium text-foreground group-hover:underline">Alberto Cantero</span>
                <span className="text-sm text-muted-foreground">Founder &amp; CEO, CTO, PM, Head of Design, Head of Marketing, QA Lead, and support team</span>
              </a>
            </div>
            {!expanded && (
              <div className="absolute inset-0 flex items-end justify-center pb-2">
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--card), color-mix(in oklab, var(--card) 60%, transparent), transparent)" }} />
                <Button variant="outline" size="sm" className="relative z-10 rounded-lg bg-background shadow-none" onClick={() => setExpanded(true)}>
                  Read manifesto
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
