import type { Metadata } from "next";
import { Victor_Mono } from "next/font/google";
import "./globals.css";

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
      className={`${victorMono.variable} h-full antialiased dark`}
    >
      <body className="h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
