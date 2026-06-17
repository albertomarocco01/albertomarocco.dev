"use client";

import { useCallback } from "react";
import { useLenis } from "lenis/react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useApp } from "@/components/providers/AppProvider";
import {
  registerGsap,
  FIELD_EASE,
  fieldEasing,
  NAV_SCROLL_DURATION,
} from "@/lib/motion";

/**
 * Page chrome: the fixed top bar and the content wrap, both of which fade in
 * once the gate is passed. Server-rendered page content is passed through as
 * children so the hero paints as static HTML.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const { entered, reducedMotion } = useApp();
  const lenis = useLenis();

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

  return (
    <>
      <a href="#work" className="sr-only">
        skip to work
      </a>
      <div className={`topbar${entered ? " in" : ""}`}>
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
          <a href="mailto:hello@albertomarocco.dev">contact</a>
        </nav>
      </div>
      <div className={`wrap${entered ? " in" : ""}`}>{children}</div>
    </>
  );
}
