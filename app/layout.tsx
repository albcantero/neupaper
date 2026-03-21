import type { Metadata } from "next";
import { Inter, Victor_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const victorMono = Victor_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

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
      className={`${inter.variable} ${victorMono.variable} h-full antialiased dark`}
    >
      <body className="h-full flex flex-col overflow-hidden">
        {children}
      </body>
    </html>
  );
}
