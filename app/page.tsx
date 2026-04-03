import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { TabPreview } from "@/components/landing/TabPreview";
import { Features } from "@/components/landing/Features";
import { Bento } from "@/components/landing/Bento";
import { Footer } from "@/components/landing/Footer";
import { Author } from "@/components/landing/Author";
import { SectionIntro } from "@/components/landing/SectionIntro";
import { HBorder, VBordersFade, VBordersFadeFooter } from "@/components/landing/SectionBorder";

export default function Home() {
  return (
    <div className="min-h-full relative font-[family-name:var(--font-display)]">
      <Nav />
      <div className="h-14" />
      <VBordersFade>
        <Hero />
      </VBordersFade>

      <TabPreview />

      <SectionIntro
        label="// Features"
        title="Write once, export everywhere"
        description="A Markdown editor with professional PDF output, dynamic templates, and a canvas that feels like a design tool."
      />

      <HBorder />
        <VBordersFade>
          <Features />
        </VBordersFade>
      <HBorder />

      <Bento />

      <SectionIntro label="// Author" title="Who is making Neupaper?" />

      <HBorder />
      <VBordersFade>
        <Author />
      </VBordersFade>
      <HBorder />

      <VBordersFadeFooter>
        <Footer />
      </VBordersFadeFooter>
    </div>
  );
}
