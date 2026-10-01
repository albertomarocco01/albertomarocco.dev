import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { FONT_VARIABLES } from "./fonts";

import { Footer } from "@/components/Footer";
import { DEFAULT_LOCALE, getDictionary, isLocale } from "@/lib/dictionary";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} — Creative Technologist`,
};

/**
 * The site's own 404 — every URL no route claims lands here. A
 * `global-not-found` (next.config `experimental.globalNotFound`) rather than a
 * `not-found`: the root layout sits under the dynamic `[locale]` segment, and
 * src/proxy.ts prefixes every path with a locale, so there is no layout above
 * an unmatched URL to render a `not-found` in — a catch-all throwing
 * `notFound()` instead reached the browser as Next's empty error shell, painted
 * only after hydration. So this is its own document: html/body, the fonts, the
 * stylesheet and analytics, as the root layout has them. The chrome — topbar
 * shell, loading veil, Lenis, the WebGL field, the custom cursor — belongs to
 * (site)/layout.tsx and is not mounted here on purpose, so a mistyped address
 * never boots three.js. The page carries the little chrome it needs itself, in
 * the section pages' own classes (the topbar's wordmark, the mono label, the
 * serif title, two ways onward, the footer). The `.notfound` block in
 * globals.css gives the pointer back — the site hides it for a custom cursor
 * that is not here — and its two `.gd-back` links the section pages' hit box.
 * Next stamps the response 404 + noindex.
 *
 * Locale straight from the cookie — there is no `[locale]` here to read — so
 * the words are right from the first byte, no fallback flash.
 */
export default async function GlobalNotFound() {
  const cookie = (await cookies()).get("locale")?.value;
  const locale = isLocale(cookie) ? cookie : DEFAULT_LOCALE;
  const dict = getDictionary(locale);
  const { notFound } = dict;
  return (
    <html lang={locale} className={FONT_VARIABLES}>
      <body>
        <div className="notfound">
          {/* `.in` is the topbar's settled state; the GSAP entrance that normally
              fades it in lives in Shell, which is not mounted here. */}
          <div className="topbar in">
            <div className="topbar-left">
              <Link href="/" className="wordmark">
                alberto marocco
              </Link>
            </div>
          </div>
          <div className="wrap">
            <main className="page">
              <header className="page-head">
                <span className="sect-label">
                  <span>{notFound.label}</span>
                </span>
                <h1 className="page-title">{notFound.title}</h1>
                <p className="page-lede">{notFound.body}</p>
              </header>
              {/* `.gd-back` is the section pages' small mono control; the pointer
                  it hides for the custom cursor comes back through `.notfound`. */}
              <nav
                aria-label={notFound.navAria}
                style={{ display: "flex", flexWrap: "wrap", gap: "2rem 2.4rem" }}
              >
                <Link href="/" className="gd-back">
                  {notFound.home}
                </Link>
                <Link href="/graphic-designs" className="gd-back">
                  {notFound.demos}
                </Link>
              </nav>
            </main>
            <Footer footer={dict.footer} />
          </div>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
