import type { Metadata } from "next";
import "@/app/vault/themes/neu-document.css";

export const metadata: Metadata = {
  robots: "noindex",
};

export default function PrintPage() {
  return (
    <>
      <style>{`
        html, body {
          height: auto !important;
          overflow: visible !important;
          background: white !important;
          display: block !important;
          color-scheme: light !important;
        }
        /* Hide the dashed visual indicator — Puppeteer's PDF engine
           handles the actual page break via break-before: page */
        .neu-pagebreak {
          border: none !important;
          margin: 0 !important;
        }
      `}</style>
      <article className="neu-document" />
    </>
  );
}
