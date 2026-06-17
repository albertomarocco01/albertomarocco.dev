import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { AppProvider } from "@/components/providers/AppProvider";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { Glow } from "@/components/chrome/Glow";
import { Grain } from "@/components/chrome/Grain";
import { Cursor } from "@/components/chrome/Cursor";
import { Gate } from "@/components/chrome/Gate";
import { Shell } from "@/components/chrome/Shell";
import { FieldMount } from "@/components/canvas/FieldMount";

// Distinctive display serif — variable, with italic + optical size. Not Inter.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const SITE = "https://albertomarocco.dev";
const DESCRIPTION =
  "Creative technologist & full-stack developer in Turin — high-performance web interfaces and real-time generative visuals, for screens and LED walls alike.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Alberto Marocco — Creative Technologist",
    template: "%s — Alberto Marocco",
  },
  description: DESCRIPTION,
  applicationName: "Alberto Marocco",
  authors: [{ name: "Alberto Marocco", url: SITE }],
  creator: "Alberto Marocco",
  keywords: [
    "creative technologist",
    "full-stack developer",
    "generative visuals",
    "webgl",
    "webgpu",
    "touchdesigner",
    "led walls",
    "turin",
    "react three fiber",
    "next.js",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE,
    siteName: "Alberto Marocco",
    title: "Alberto Marocco — Creative Technologist",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Alberto Marocco — Creative Technologist",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fraunces.variable}>
      <body>
        <AppProvider>
          <Glow />
          <FieldMount />
          <Gate />
          <SmoothScroll>
            <Shell>{children}</Shell>
          </SmoothScroll>
          <Grain />
          <Cursor />
        </AppProvider>
        <Analytics />
      </body>
    </html>
  );
}
