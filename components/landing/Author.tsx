"use client";

import { IconBrandX } from "@tabler/icons-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Autoplay, EffectCards } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-cards";

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

export function Author() {
  return (
    <section className="max-w-[1250px] mx-auto px-8 bg-card">
      <div className="flex flex-col md:flex-row">
        <div className="flex-1 flex flex-col gap-4 pt-10 md:pr-12">
          <h2 className="text-2xl font-semibold">Meet the team behind Neupaper.</h2>
          <p className="text-muted-foreground">
            A one-person studio with some furry assistants and a reliable coffee machine.
          </p>
          <div className="mt-4 flex-1 flex items-center justify-center overflow-visible">
            <Swiper
              effect="cards"
              grabCursor={true}
              loop={false}
              autoplay={false}
              className="!overflow-visible w-64 h-[340px]"
              modules={[EffectCards, Autoplay]}
            >
              {team.map((member, index) => (
                <SwiperSlide key={index} className="rounded-xl overflow-hidden">
                  <div className="h-full shadow-lg rounded-xl flex flex-col border border-border overflow-hidden relative">
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
                    <Card className="border-none gap-0 py-4 rounded-none -mt-4 relative z-10">
                      <CardHeader className="text-center">
                        <CardTitle className="text-sm">{member.name}</CardTitle>
                        <CardDescription className="text-xs">{member.role}</CardDescription>
                      </CardHeader>
                    </Card>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
        <div className="hidden md:block w-px bg-input" />
        <div className="flex-1 flex flex-col gap-4 pt-10 md:pl-12">
          <h2 className="text-2xl font-semibold">Built for the indie developer. <span className="text-muted-foreground">By one of us.</span></h2>
          <p className="text-muted-foreground">
            The story behind Neupaper, in the author&apos;s own words.
          </p>
          <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-muted-foreground">
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
          </div>

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
      </div>
    </section>
  );
}
