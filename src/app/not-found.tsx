import Link from "next/link";

import { Footer } from "@/components/Footer";
import { getDictionary, getLocale } from "@/lib/i18n";

/**
 * The site's own 404 — every URL no route claims lands here (the root
 * `not-found` handles unmatched paths for the whole app). It renders inside the
 * root layout only: the chrome — topbar shell, loading veil, Lenis, the WebGL
 * field, the custom cursor — belongs to (site)/layout.tsx and is not mounted
 * here on purpose, so a mistyped address never boots three.js. The page carries
 * the little chrome it needs itself, in the section pages' own classes (the
 * topbar's wordmark, the mono label, the serif title, two ways onward, the
 * footer). The `.notfound` block in globals.css gives the pointer back — the
 * site hides it for a custom cursor that is not here — and its two `.gd-back`
 * links the section pages' hit box. Next stamps the response 404 + noindex.
 *
 * Locale from the cookie, like the layout: `not-found` takes no props but can
 * be async, so the words are right from the first byte — no fallback flash.
 */
export default async function NotFound() {
  const dict = getDictionary(await getLocale());
  const { notFound } = dict;
  return (
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
  );
}
