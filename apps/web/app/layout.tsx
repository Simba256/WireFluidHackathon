import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, Manrope, Oxanium } from "next/font/google";
import "../styles/globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { Providers } from "@/components/providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const oxanium = Oxanium({
  subsets: ["latin"],
  variable: "--font-scoreboard",
  weight: ["700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BoundaryLine | PSL 2026 Fantasy League",
  description:
    "Free-to-play fantasy PSL on WireFluid. Draft your squad, earn BNDY, claim real prizes with soulbound trophies.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${manrope.variable} ${oxanium.variable}`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-primary selection:text-on-primary overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
