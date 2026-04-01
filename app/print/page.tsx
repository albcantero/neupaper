import type { Metadata } from "next";
import "@/app/vault/themes/neu-document.css";
import "@/app/vault/themes/modernist.css";

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
          background: #0a0a0a !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        }
        article.neu-print {
          margin: 0;
          padding: 0;
        }
        .neu-page {
          width: 210mm;
          height: 297mm;
          overflow: hidden;
        }
      `}</style>
      <article className="neu-print" />
    </>
  );
}
