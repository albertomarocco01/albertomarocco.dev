import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/locale";

/**
 * The language is a cookie, not a URL (DECISIONS, I12) — but reading that
 * cookie while rendering made every page dynamic: no CDN copy, a serverless
 * render on every visit and every client navigation, and a cold start on the
 * first one. So the cookie is read here instead, and the request is rewritten
 * to the prerendered copy of its locale: `/about` → `/it/about`. The visitor's
 * URL does not change; the pages under app/[locale] are static.
 */
export function proxy(request: NextRequest) {
  const cookie = request.cookies.get("locale")?.value;
  const locale = isLocale(cookie) ? cookie : DEFAULT_LOCALE;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Pages only. Not Next's own assets, Vercel's analytics endpoint, the public/
  // payloads, the metadata routes at the app root (icon.svg, apple-icon,
  // opengraph-image, manifest.webmanifest, robots.txt, sitemap.xml) — nor
  // anything else with a file extension.
  matcher: [
    "/((?!_next/|_vercel/|mediapipe/|vortex/|apple-icon|opengraph-image|.*\\..*).*)",
  ],
};
