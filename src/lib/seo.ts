// Site identity + per-route head metadata. Server-only (reads the locale cookie
// through ./i18n).
//
// Brand spelling, one rule: "Alberto Marocco.dev" is the site's *name* (titles,
// og:site_name, application name); "albertomarocco.dev" is the *domain*, set
// lowercase wherever it is shown as an address (footer, OG image).

import type { Metadata } from "next";
import { getLocale, OG_LOCALE } from "./i18n";

export const SITE_URL = "https://albertomarocco.dev";
export const SITE_NAME = "Alberto Marocco.dev";

// app/opengraph-image.tsx, by URL. A page that sets `openGraph` loses the file
// image the root segment would otherwise lend it (measured: no og:image at all),
// so the card is named again explicitly.
const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — Creative Technologist`,
};

/**
 * The head of one route: title, description and canonical, repeated into Open
 * Graph and Twitter so a shared link previews the page and not the home. A
 * page's `openGraph` replaces the layout's whole object (it is not merged), so
 * site name, type, locale and image are set again here. `title` is the bare page
 * title — the layout template adds " — Alberto Marocco.dev" to `<title>`, and
 * the same suffix is written out for the social cards, which the template does
 * not reach.
 */
export async function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Promise<Metadata> {
  const locale = await getLocale();
  const full = `${title} — ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      url: path,
      title: full,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: full,
      description,
      images: [OG_IMAGE],
    },
  };
}
