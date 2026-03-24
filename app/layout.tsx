import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neupaper",
  description: "Dynamic documents that think",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
    >
      <body className="h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
