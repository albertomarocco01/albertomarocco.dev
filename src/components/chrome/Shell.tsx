"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useApp } from "@/components/providers/AppProvider";
import { LocaleToggle } from "@/components/chrome/LocaleToggle";
import type { Dictionary, Locale } from "@/lib/i18n";
import {
  registerGsap,
  FIELD_EASE,
  fieldEasing,
  NAV_SCROLL_DURATION,
  TOPBAR_REVEAL_TOP,
} from "@/lib/motion";

/**
 * Page chrome: the fixed top bar (faded in as the entrance auto-plays on load)
 * and the content wrap (visible from first paint). Server-rendered page content
 * is passed through as children so the hero paints as static HTML.
 */

/**
 * The primary nav. Every entry is a real route now — the home page carries the
 * opening and nothing else, so there are no in-page section anchors left to
 * smooth-scroll to and no `/#work`-style cross-route hrefs to special-case.
 * `key` indexes the active dictionary's `nav` block.
 */
const NAV = [
  { href: "/websites", key: "websites" },
  { href: "/graphic-designs", key: "graphic" },
  { href: "/xperiments", key: "xperiments" },
  { href: "/about", key: "about" },
] as const;

export function Shell({
  children,
  nav,
  localeLabels,
  locale,
}: {
  children: React.ReactNode;
  /** the topbar's own strings — not the whole dictionary: props to a client
   *  component are serialised into every page's RSC payload */
  nav: Dictionary["nav"];
  localeLabels: Dictionary["locale"];
  locale: Locale;
}) {
  const { entered, reducedMotion } = useApp();
  const lenis = useLenis();
  const pathname = usePathname();
  const topbarRef = useRef<HTMLDivElement>(null);
  // Last applied tuck state, held in a ref so the scroll subscription can toggle
  // the class without ever calling setState in the hot loop (same hot-path
  // discipline as Cursor.tsx).
  const tuckedRef = useRef(false);

  // The entrance now auto-plays on load (no gate to click). The white field
  // blooms once via CSS (`html.entering`, a 1.8s brightness pulse — see
  // globals.css) and the topbar eases in over it on the signature `field` ease.
  // The hero is deliberately NOT animated: it paints as static server HTML and
  // stays visible from first paint, so the opening never costs LCP. Skipped
  // entirely under reduced motion — content is shown instantly by CSS.
  useGSAP(
    () => {
      if (!entered || reducedMotion) return;
      registerGsap();
      const root = document.documentElement;
      root.classList.add("entering");

      const tl = gsap.timeline({
        onComplete: () => root.classList.remove("entering"),
      });

      // The topbar now arrives *after* the hero name has finished generating
      // (eyebrow at 0s, "Alberto" at 0.12s, "Marocco." at 0.36s + 0.95s — see
      // the `hero-in` rules in globals.css), so the opening reads as one
      // sequence instead of everything landing at once. `from` renders its
      // start value immediately, so the bar stays hidden through the delay.
      // The 2.35s total also outlasts the 1.8s field bloom, so removing
      // `entering` never cuts the brightness pulse short.
      tl.from(".topbar", {
        autoAlpha: 0,
        duration: 1.2,
        delay: 1.15,
        ease: FIELD_EASE,
      });
    },
    { dependencies: [entered, reducedMotion] },
  );

  // Wordmark: real link to "/" so it navigates home from any route. On the home
  // page itself it is swallowed rather than followed — that page owns the
  // viewport and never scrolls (HomeSequence.tsx), so there is nothing to
  // navigate to and a same-page reload would be the only visible effect. The
  // scrollTo is what makes it a no-op on every other path through this branch —
  // except the home's flow mode (phones, narrow windows), where the page does
  // scroll once composed and the wordmark eases it back to the top.
  const onWordmarkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (pathname !== "/" || reducedMotion || !lenis) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      lenis.scrollTo(0, { duration: NAV_SCROLL_DURATION, easing: fieldEasing });
    },
    [pathname, reducedMotion, lenis],
  );

  // Auto-hide the (transparent, scrim-free) topbar so it never collides with the
  // page titles and ghosted row titles below: tuck it away on scroll down,
  // reveal it on scroll up, always show it near the very top. Driven off the
  // shared Lenis instance and applied as a single class toggle through
  // `topbarRef` — no setState on the scroll tick. CSS owns the cheap transform
  // transition; GSAP still owns the entrance opacity, so the two compose without
  // fighting. Skipped under reduced motion: the bar stays statically visible,
  // exactly as before.
  useLenis(
    (instance) => {
      if (reducedMotion) return;
      const bar = topbarRef.current;
      if (!bar) return;
      // 1 = scrolling down, -1 = up. Tuck only while actively scrolling down
      // past the threshold; anything else (top of page, scrolling up) shows it.
      const tucked =
        instance.scroll > TOPBAR_REVEAL_TOP && instance.direction === 1;
      if (tucked === tuckedRef.current) return;
      tuckedRef.current = tucked;
      bar.classList.toggle("is-tucked", tucked);
    },
    [reducedMotion],
  );

  // Keyboard access: if focus moves into the topbar while it's tucked, reveal it
  // so every nav link stays reachable. `focusin` bubbles (the native `focus`
  // event does not), so one listener on the bar covers all its descendants.
  useEffect(() => {
    const bar = topbarRef.current;
    if (!bar) return;
    const reveal = () => {
      if (!tuckedRef.current) return;
      tuckedRef.current = false;
      bar.classList.remove("is-tucked");
    };
    bar.addEventListener("focusin", reveal);
    return () => bar.removeEventListener("focusin", reveal);
  }, []);

  return (
    <>
      {/* A plain <a>, not `Link`: the target is a fragment on the page already
          being viewed, on every route — there is nothing to route to, and Lenis
          re-syncs from the native scroll the jump produces. */}
      <a href="#main" className="sr-only">
        {nav.skip}
      </a>
      <div ref={topbarRef} className={`topbar${entered ? " in" : ""}`}>
        <div className="topbar-left">
          <Link href="/" className="wordmark" onClick={onWordmarkClick}>
            alberto marocco
          </Link>
          <LocaleToggle locale={locale} labels={localeLabels} />
        </div>
        <nav aria-label={nav.primary}>
          {NAV.map((item) => {
            // Exact match is enough: the only deeper /xperiments/* routes are the
            // immersive demos, which render outside this shell entirely.
            const current = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={current ? "is-current" : undefined}
                aria-current={current ? "page" : undefined}
              >
                {nav[item.key]}
              </Link>
            );
          })}
        </nav>
      </div>
      {/* `tabIndex={-1}` so the skip link can actually move focus here; the
          outline is suppressed in CSS since this is a programmatic target, not
          an interactive control. */}
      <div id="main" tabIndex={-1} className={`wrap${entered ? " in" : ""}`}>
        {children}
      </div>
    </>
  );
}
