"use client";

import { useCallback } from "react";
import { useLenis } from "lenis/react";
import { useApp } from "@/components/providers/AppProvider";
import { fieldEasing, NAV_SCROLL_DURATION } from "@/lib/motion";

/**
 * Page chrome: the fixed top bar and the content wrap, both of which fade in
 * once the gate is passed. Server-rendered page content is passed through as
 * children so the hero paints as static HTML.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const { entered, reducedMotion } = useApp();
  const lenis = useLenis();

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
      lenis.scrollTo(href, {
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
        <span>alberto marocco</span>
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
