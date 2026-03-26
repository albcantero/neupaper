import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Bento } from "@/components/landing/Bento";
import { Footer } from "@/components/landing/Footer";
import { SectionIntro } from "@/components/landing/SectionIntro";
import { HBorder, VBordersFade } from "@/components/landing/SectionBorder";

export default function Home() {
  return (
    <div className="min-h-full overflow-y-auto relative font-[family-name:var(--font-display)]">
      <VBordersFade>
        <Hero />
      </VBordersFade>

      <SectionIntro />

      <HBorder />
        <VBordersFade>
          <Features />
        </VBordersFade>
      <HBorder />
      
      <Bento />
      <HBorder />

      <VBordersFade>
        <Footer />
      </VBordersFade>
    </div>
  );
}
