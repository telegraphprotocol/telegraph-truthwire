import type { Metadata } from "next";

const runtimeGlobal = globalThis as typeof globalThis & {
  localStorage?: { getItem?: unknown };
};
const runtimeGlobalMutable = runtimeGlobal as { localStorage?: { getItem?: unknown } };

if (runtimeGlobal.localStorage && !runtimeGlobal.localStorage.getItem) {
  delete runtimeGlobalMutable.localStorage;
}
import { Orbitron, Space_Grotesk } from "next/font/google";
import { Providers } from "@/providers";

import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Telegraph Sniper Bot | Advanced Polymarket Trading AI",
  description: "Gain a competitive edge in prediction markets with AI-driven signals and ultra-low latency execution via Telegraph Subnets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${orbitron.variable} ${spaceGrotesk.variable} dark antialiased`}
      >
        <Providers
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
