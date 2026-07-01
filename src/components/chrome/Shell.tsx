"use client";

import { useCallback, useEffect, useRef } from "react";
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
export function Shell({
  children,
  dict,
  locale,
}: {
  children: React.ReactNode;
  dict: Dictionary;
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

      // Only the topbar fades in; the hero is untouched.
      tl.from(".topbar", { autoAlpha: 0, duration: 1.2, ease: FIELD_EASE })
        // Hold the timeline open for the full 1.8s field bloom so removing
        // `entering` never cuts the brightness pulse short.
        .to({}, { duration: 0.6 });
    },
    { dependencies: [entered, reducedMotion] },
  );

  // Smooth, slow scroll for in-page nav anchors via the shared Lenis instance.
  // The anchors keep their real `href`; under reduced motion (or no Lenis) we
  // fall through to the native instant jump, preserving anchor semantics.
  const onNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (reducedMotion || !lenis) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = e.currentTarget.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      e.preventDefault();
      // `#top` is the document top (no such element to query) — scroll to 0;
      // section anchors scroll to their selector. Same duration/easing.
      lenis.scrollTo(href === "#top" ? 0 : href, {
        duration: NAV_SCROLL_DURATION,
        easing: fieldEasing,
      });
    },
    [lenis, reducedMotion],
  );

  // Wordmark: real link to "/" so it navigates home from any route. Only when
  // already on the home page do we intercept it for the smooth Lenis
  // scroll-to-top instead of a same-page reload.
  const onWordmarkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (pathname !== "/" || reducedMotion || !lenis) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      lenis.scrollTo(0, { duration: NAV_SCROLL_DURATION, easing: fieldEasing });
    },
    [pathname, reducedMotion, lenis],
  );

  // Auto-hide the (transparent, scrim-free) topbar so it never collides with
  // the "selected work" label and the ghosted row titles below: tuck it away on
  // scroll down, reveal it on scroll up, always show it near the very top.
  // Driven off the shared Lenis instance and applied as a single class toggle
  // through `topbarRef` — no setState on the scroll tick. CSS owns the cheap
  // transform transition; GSAP still owns the entrance opacity, so the two
  // compose without fighting. Skipped under reduced motion: the bar stays
  // statically visible, exactly as before.
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
      <a href="#work" className="sr-only">
        {dict.nav.skip}
      </a>
      <div ref={topbarRef} className={`topbar${entered ? " in" : ""}`}>
        <div className="topbar-left">
          <a href="/" onClick={onWordmarkClick}>
            alberto marocco
          </a>
          <LocaleToggle locale={locale} labels={dict.locale} />
        </div>
        <nav aria-label="primary">
          <a href="#work" onClick={onNavClick}>
            {dict.nav.work}
          </a>
          <a href="#about" onClick={onNavClick}>
            {dict.nav.about}
          </a>
          <a href="mailto:albertomarocco.dev@gmail.com">{dict.nav.contact}</a>
        </nav>
      </div>
      <div className={`wrap${entered ? " in" : ""}`}>{children}</div>
    </>
  );
}
