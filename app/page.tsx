import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { Bento } from "@/components/landing/bento";
import { Footer } from "@/components/landing/footer";
import { GuideLines } from "@/components/landing/guide-lines";

export default function Home() {
  return (
    <div className="min-h-full overflow-y-auto relative">
      <GuideLines />

      <div className="relative z-10">
        <Hero />
        <div className="w-full h-px bg-border" />
        <Features />
        <div className="w-full h-px bg-border" />
        <Bento />
        <div className="w-full h-px bg-border" />
        <Footer />
      </div>
    </div>
  );
}
