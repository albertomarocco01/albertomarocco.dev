"use client";

import { useCallback, useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useApp } from "@/components/providers/AppProvider";
import {
  registerGsap,
  FIELD_EASE,
  fieldEasing,
  NAV_SCROLL_DURATION,
  TOPBAR_REVEAL_TOP,
} from "@/lib/motion";

/**
 * Page chrome: the fixed top bar and the content wrap, both of which fade in
 * once the gate is passed. Server-rendered page content is passed through as
 * children so the hero paints as static HTML.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const { entered, reducedMotion } = useApp();
  const lenis = useLenis();
  const topbarRef = useRef<HTMLDivElement>(null);
  // Last applied tuck state, held in a ref so the scroll subscription can toggle
  // the class without ever calling setState in the hot loop (same hot-path
  // discipline as Cursor.tsx).
  const tuckedRef = useRef(false);

  // The entrance: a short, orchestrated "opening" into the home. The gate
  // name/CTA lift and fade, the white field blooms briefly to carry through
  // (a CSS brightness pulse on the canvas, see globals.css), then the home
  // rises in — eyebrow → name → lede — and the topbar eases in. All on the
  // signature `field` ease, slow and settling. GSAP owns these opacities here
  // (the matching CSS transitions were removed so they don't double-animate);
  // the `.in`/aria states remain as the no-motion final state. Under reduced
  // motion this is skipped entirely — content is shown instantly by CSS.
  useGSAP(
    () => {
      if (!entered || reducedMotion) return;
      registerGsap();
      const root = document.documentElement;
      root.classList.add("entering");

      const tl = gsap.timeline({
        defaults: { ease: FIELD_EASE },
        onComplete: () => root.classList.remove("entering"),
      });

      tl.to(
        ".gate > *",
        { y: -14, autoAlpha: 0, duration: 0.8, stagger: 0.07 },
        0,
      )
        .set(".gate", { autoAlpha: 0, pointerEvents: "none" }, 0.95)
        .from(
          ".hero .eyebrow, .hero .name, .hero .lede",
          { y: 22, autoAlpha: 0, duration: 1.1, stagger: 0.22 },
          0.6,
        )
        .from(".topbar", { autoAlpha: 0, duration: 1.2 }, 0.85);
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
        skip to work
      </a>
      <div ref={topbarRef} className={`topbar${entered ? " in" : ""}`}>
        <a href="#top" onClick={onNavClick}>
          alberto marocco
        </a>
        <nav aria-label="primary">
          <a href="#work" onClick={onNavClick}>
            work
          </a>
          <a href="#about" onClick={onNavClick}>
            about
          </a>
          <a href="mailto:albertomarocco.dev@gmail.com">contact</a>
        </nav>
      </div>
      <div className={`wrap${entered ? " in" : ""}`}>{children}</div>
    </>
  );
}
