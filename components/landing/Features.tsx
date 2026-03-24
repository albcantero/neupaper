"use client";

import { Lora, Geist, Nunito, EB_Garamond, IBM_Plex_Mono } from "next/font/google";
import { FileHeart, Brain, Check, CaseSensitive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const lora = Lora({ subsets: ["latin"], style: ["italic"], weight: ["400"] });
const geist = Geist({ subsets: ["latin"], weight: ["400"] });
const nunito = Nunito({ subsets: ["latin"], weight: ["400"] });
const ebGaramond = EB_Garamond({ subsets: ["latin"], weight: ["400"] });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400"] });
const names = ["John Doe", "Acme Corp.", "Jane Smith", "Globex Inc.", "María López", "Bob Martin", "Fintech LLC"];

const loopNames = [...names, names[0]];

const cards = [
  { id: "1", title: "Neupaper Default", fontLabel: "Geist", fontClass: geist.className, color: "#171717", muted: "#a3a3a3", bg: "#ffffff", accent: "#3b82f6" },
  { id: "2", title: "Serif Classic", fontLabel: "EB Garamond", fontClass: ebGaramond.className, color: "#292524", muted: "#a8a29e", bg: "#fafaf9", accent: "#b45309" },
  { id: "3", title: "Mono Technical", fontLabel: "IBM Plex Mono", fontClass: ibmPlexMono.className, color: "#e2e8f0", muted: "#64748b", bg: "#0f172a", accent: "#38bdf8" },
  { id: "4", title: "Swiss Clean", fontLabel: "Nunito", fontClass: nunito.className, color: "#fafafa", muted: "#a3a3a3", bg: "#171717", accent: "#e11d48" },
  { id: "5", title: "Editorial Warm", fontLabel: "Lora", fontClass: lora.className, color: "#451a03", muted: "#d6d3d1", bg: "#fffbeb", accent: "#d97706" },
  { id: "6", title: "Blueprint", fontLabel: "Geist", fontClass: geist.className, color: "#0f172a", muted: "#64748b", bg: "#f1f5f9", accent: "#1d4ed8" },
  { id: "7", title: "Paper Ivory", fontLabel: "Lora", fontClass: lora.className, color: "#1c1917", muted: "#78716c", bg: "#faf5ef", accent: "#92400e" },
];

function CardCarousel({ tick }: { tick: number }) {
  const index = (2 + tick) % cards.length;

  const visible = [
    cards[(index - 2 + cards.length) % cards.length],
    cards[(index - 1 + cards.length) % cards.length],
    cards[index],
  ];

  return (
    <div className="relative flex flex-col items-center h-32 w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background to-transparent z-10" />
      <AnimatePresence initial={false}>
        {visible.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ y: 130, opacity: 0, scale: 0.9 }}
            animate={{
              y: 12 + i * 38,
              scale: i === 1 ? 1 : 0.9,
              opacity: i === 1 ? 1 : 0.18,
            }}
            exit={{ y: -40, opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="absolute left-1/2 -translate-x-1/2 w-36 px-2 py-2 rounded-md border border-foreground flex items-center justify-between bg-neutral-950"
          >
            <span className="font-medium leading-normal select-none text-[10px]">
              {item.title}
            </span>
            <AnimatePresence>
              {i === 1 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.25, duration: 0.2 }}
                >
                  <Check className="size-3 shrink-0" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}


export function Features() {
  const [tick, setTick] = useState(0);
  const [nameIndex, setNameIndex] = useState(0);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setNameIndex((i) => i + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (nameIndex === loopNames.length - 1) {
      const timeout = setTimeout(() => {
        setAnimate(false);
        setNameIndex(0);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setAnimate(true));
        });
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [nameIndex]);

  return (
    <section className="max-w-5xl mx-auto px-8">
      <div className="flex flex-col md:flex-row">
        <div className="flex-1 flex flex-col gap-4 pt-10 md:pr-12">
          <Badge variant="outline" className="w-fit gap-1.5 font-normal">
            <FileHeart className="size-3" />
            Beautiful output from Markdown
          </Badge>
          <h2 className="text-2xl font-semibold">Meet Neupaper. <span className="text-muted-foreground">A minimalist open-source text editor.</span></h2>
          <p className="text-muted-foreground">
            Write Markdown and get pixel-perfect PDFs with our professional templates.
          </p>
          <div className="mt-4 flex-1 flex rounded-t-lg border border-b-0 border-border overflow-hidden select-none bg-neutral-950">
            <div className="flex-1 flex items-center justify-center">
              <CardCarousel tick={tick} />
            </div>
            {(() => {
              const activeTheme = cards[(1 + tick) % cards.length];
              return (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <div className="flex h-6 w-28 rounded-sm overflow-hidden border border-border">
                    {[activeTheme.color, activeTheme.bg, activeTheme.muted, activeTheme.accent].map((c, i) => (
                      <div
                        key={i}
                        className="flex-1 transition-colors duration-500"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTheme.fontLabel}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Badge variant="outline" className={`${activeTheme.fontLabel === "IBM Plex Mono" ? "text-[11px]" : "text-[12px]"} font-normal py-0 px-2 rounded-sm gap-1.5 h-6 ${activeTheme.fontClass}`}><CaseSensitive className="size-3" />{activeTheme.fontLabel}</Badge>
                    </motion.div>
                  </AnimatePresence>
                </div>
              );
            })()}
          </div>
        </div>
        <div className="hidden md:block w-px bg-border" />
        <div className="flex-1 flex flex-col gap-4 pt-10 md:pl-12">
          <Badge variant="outline" className="w-fit gap-1.5 font-normal">
            <Brain className="size-3" />
            Dynamic documents that think
          </Badge>
          <h2 className="text-2xl font-semibold">Markdown Isles. <span className="text-muted-foreground">Small islands of logic in a sea of Markdown.</span></h2>
          <p className="text-muted-foreground">
            Add variables, loops, conditionals, and reusable components with small blocks of code.
          </p>
          <div className="mt-4 flex-1 flex rounded-t-lg border border-b-0 border-border overflow-hidden select-none">
            {/* Mini editor */}
            <div className="flex-1 bg-neutral-950 p-3 flex items-center justify-center">
              <div className="bg-neutral-950 border border-border rounded p-3 w-full font-[family-name:var(--font-mono)] leading-4 text-[10px]">
                <div className="flex">
                  <div className="select-none text-[#555] pr-3 text-right">
                    <div>1</div>
                    <div>2</div>
                    <div>3</div>
                    <div>4</div>
                  </div>
                  <div className="text-muted-foreground">
                    <div>&nbsp;</div>
                    <div>Dear <span className="text-pink-400">{"${"}<span className="bg-pink-400/15 rounded-[4px] py-[2px]">{" @customer "}</span>{"}"}</span>,</div>
                    <div className="whitespace-nowrap">Thanks for your purchase.</div>
                    <div>&nbsp;</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-px bg-border" />
            {/* Mini preview */}
            <div className="flex-1 bg-neutral-950 bg-[radial-gradient(#333_0.75px,transparent_0.75px)] bg-[length:10px_10px] p-5 pb-0 flex flex-col items-center justify-end">
              <div className="bg-background border border-border border-b-0 pt-6 px-3 pb-[38px] text-foreground w-2/3 mt-auto" style={{ fontSize: "10px", lineHeight: "16px" }}>
                <div className="whitespace-nowrap">Dear{" "}
                  <span className="relative inline-block overflow-hidden align-bottom" style={{ height: "16px", width: "9rem" }}>
                    <span
                      className={`absolute left-0 bottom-0 flex flex-col-reverse ${animate ? "transition-transform duration-500 ease-in-out" : ""}`}
                      style={{ transform: `translateY(${nameIndex * 16}px)` }}
                    >
                      {loopNames.map((name, i) => (
                        <span key={`${name}-${i}`} className="whitespace-nowrap font-medium">
                          {name},
                        </span>
                      ))}
                    </span>
                  </span>
                </div>
                <div>Thanks for your purchase.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
