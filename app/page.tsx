import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Bento } from "@/components/landing/Bento";
import { Footer } from "@/components/landing/Footer";
import { GuideLines } from "@/components/landing/GuideLines";

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
