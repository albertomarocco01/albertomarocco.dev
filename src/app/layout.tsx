import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { getDictionary, getLocale, OG_LOCALE, type Locale } from "@/lib/i18n";
import { CONTACT } from "@/lib/contact";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

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

// The bare title, once: the site's name is a brand token (seo.ts spells out
// which spelling goes where) and "Creative Technologist" is the same in both
// locales — the site's own Italian copy uses it verbatim.
const TITLE = `${SITE_NAME} — Creative Technologist`;

// `generateMetadata`, not a static `metadata` object: the description and
// `og:locale` follow the `locale` cookie, so they have to be resolved per
// request. The whole tree is already dynamic (the layout below awaits
// `cookies()`), so this costs nothing extra. Child pages replace the title,
// description, canonical, Open Graph and Twitter blocks through `pageMetadata`
// (seo.ts); what stays from here is the base URL, the title template, the
// icons/manifest links Next adds from the file conventions, and the OG image.
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const description = getDictionary(locale).meta.description;
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: TITLE,
      template: `%s — ${SITE_NAME}`,
    },
    description,
    applicationName: SITE_NAME,
    authors: [{ name: "Alberto Marocco", url: SITE_URL }],
    creator: "Alberto Marocco",
    // No "webgpu": the site ships WebGL2 and DECISIONS lists WebGPU as
    // deliberately not attempted — a keyword should not promise otherwise.
    keywords: [
      "creative technologist",
      "full-stack developer",
      "generative visuals",
      "webgl",
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
      url: SITE_URL,
      siteName: SITE_NAME,
      title: TITLE,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description,
    },
    robots: { index: true, follow: true },
  };
}

// `viewportFit: "cover"` is what makes iOS report real `env(safe-area-inset-*)`
// values — without it every inset the CSS reads is 0 and the footer and the
// demos' bottom HUDs sit under the home indicator.
export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  colorScheme: "dark",
  viewportFit: "cover",
};

// Person structured data — lets search/AI surface who this is, role, place and
// socials as an entity, not just page text. Rendered once in the document body.
// schema.org wants the bare address in `email` (no `mailto:`), and the town is
// spelled in the page's language; the job title is the same in both.
const personLd = (locale: Locale) => ({
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Alberto Marocco",
  url: SITE_URL,
  jobTitle: "Creative Technologist",
  email: CONTACT.email,
  telephone: CONTACT.telDisplay,
  address: {
    "@type": "PostalAddress",
    addressLocality: locale === "it" ? "Torino" : "Turin",
    addressCountry: "IT",
  },
  sameAs: [CONTACT.instagram],
});

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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd(locale)) }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
