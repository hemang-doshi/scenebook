import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

import "./globals.css";

const headingFont = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
});

const bodyFont = Manrope({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SceneBook",
  description: "A calm studio workspace for short-form creators.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        <div className="studio-noise pointer-events-none fixed inset-0 opacity-60" />
        <div className="relative flex min-h-full flex-col">{children}</div>
      </body>
    </html>
  );
}
