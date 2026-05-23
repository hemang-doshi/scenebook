import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";

import "./globals.css";

const bodyFont = Geist({
  variable: "--font-body",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SceneBook Cinematic OS",
  description: "A command-center workspace for creator planning, production, and editing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground font-sans">
        <div className="cmd-noise pointer-events-none fixed inset-0" />
        <div className="cmd-radial pointer-events-none fixed inset-0" />
        <div className="relative flex min-h-full flex-col">{children}</div>
      </body>
    </html>
  );
}
