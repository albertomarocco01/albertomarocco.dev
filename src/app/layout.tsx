import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { getDictionary, getLocale, OG_LOCALE } from "@/lib/i18n";
import { CONTACT } from "@/lib/contact";

// Distinctive display serif — variable, with italic + optical size. Not Inter.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

// A real mono, self-hosted, so the site's whole meta/nav/ticker/loader register
// looks identical on every OS instead of degrading to Consolas/SF Mono/Android
// mono. Variable weight axis — no `weight` needed.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

const SITE = "https://albertomarocco.dev";

// `generateMetadata`, not a static `metadata` object: the description and
// `og:locale` follow the `locale` cookie, so they have to be resolved per
// request. The whole tree is already dynamic (the layout below awaits
// `cookies()`), so this costs nothing extra. The titles are brand tokens and
// "Creative Technologist" is the same in both locales — the site's own Italian
// copy uses it verbatim — so they stay as they are.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const description = getDictionary(locale).meta.description;
  return {
    metadataBase: new URL(SITE),
    title: {
      default: "Alberto Marocco.dev — Creative Technologist",
      template: "%s — Alberto Marocco.dev",
    },
    description,
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
      locale: OG_LOCALE[locale],
      url: SITE,
      siteName: "Alberto Marocco.dev",
      title: "Alberto Marocco.dev — Creative Technologist",
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: "Alberto Marocco.dev — Creative Technologist",
      description,
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  colorScheme: "dark",
};

// Person structured data — lets search/AI surface who this is, role, place and
// socials as an entity, not just page text. Rendered once in the document body.
const personLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Alberto Marocco",
  url: SITE,
  jobTitle: "Creative Technologist",
  email: `mailto:${CONTACT.email}`,
  telephone: CONTACT.telDisplay,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Turin",
    addressCountry: "IT",
  },
  sameAs: [CONTACT.instagram],
};

// Root layout holds only the document shell (html/body), fonts, metadata and
// analytics. The site chrome (cursor, loader, Lenis, WebGL field, topbar) lives
// in (site)/layout.tsx so immersive route groups can opt out of it entirely.
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${fraunces.variable} ${jetbrainsMono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
