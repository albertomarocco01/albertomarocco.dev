"use client";

import { useApp } from "@/components/providers/AppProvider";

/**
 * Page chrome: the fixed top bar and the content wrap, both of which fade in
 * once the gate is passed. Server-rendered page content is passed through as
 * children so the hero paints as static HTML.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  const { entered } = useApp();
  return (
    <>
      <a href="#work" className="sr-only">
        skip to work
      </a>
      <div className={`topbar${entered ? " in" : ""}`}>
        <span>alberto marocco</span>
        <nav aria-label="primary">
          <a href="#work">work</a>
          <a href="#about">about</a>
          <a href="mailto:hello@albertomarocco.dev">contact</a>
        </nav>
      </div>
      <div className={`wrap${entered ? " in" : ""}`}>{children}</div>
    </>
  );
}
