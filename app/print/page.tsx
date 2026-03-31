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
          background: #0a0a0a !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        }
        article.neu-document {
          min-height: 297mm;
          -webkit-box-decoration-break: clone;
          box-decoration-break: clone;
        }
        .neu-pagebreak {
          border: none !important;
          margin: 0 !important;
        }
      `}</style>
      <article className="neu-document" />
    </>
  );
}
