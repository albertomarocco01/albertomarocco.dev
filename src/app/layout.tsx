import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { getLocale } from "@/lib/i18n";

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
    default: "Alberto Marocco.dev — Creative Technologist",
    template: "%s — Alberto Marocco.dev",
  },
  description: DESCRIPTION,
  applicationName: "Alberto Marocco.dev",
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
    siteName: "Alberto Marocco.dev",
    title: "Alberto Marocco.dev — Creative Technologist",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Alberto Marocco.dev — Creative Technologist",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  colorScheme: "dark",
};

// Root layout holds only the document shell (html/body), fonts, metadata and
// analytics. The site chrome (cursor, loader, Lenis, WebGL field, topbar) lives
// in (site)/layout.tsx so immersive route groups can opt out of it entirely.
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={fraunces.variable}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
