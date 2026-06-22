"use client";

import { useApp } from "@/components/providers/AppProvider";

/**
 * The intro / loading veil: a fixed full-screen dark plate (var(--void)) that
 * covers the hero on load while the WebGL bubble field plays energetically above
 * it (the canvas is raised over this veil via `html.intro-playing` — see
 * globals.css). Once the intro is done (min hold elapsed + field live) the
 * `lift` class fades it out, revealing the static hero underneath with the
 * bubbles continuing behind it.
 *
 * Stays mounted across the lift so the 0.8s opacity transition can play; after
 * that it rests at opacity 0, pointer-inert, behind nothing it can block. Hidden
 * outright under reduced motion (CSS `display:none`), where introDone is true
 * from the start anyway.
 */
export function Intro() {
  const { introDone } = useApp();
  return (
    <div className={`intro${introDone ? " lift" : ""}`} aria-hidden="true" />
  );
}
