"use client";

import { Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useApp } from "@/components/providers/AppProvider";

// Client-only, code-split: three/r3f never enter the initial chunk.
const Field = dynamic(() => import("./Field").then((m) => m.Field), {
  ssr: false,
});

/**
 * The field is decoration. A refused WebGL context or a chunk that 404s after a
 * redeploy should cost us the ambience, not the page — without this the throw
 * escapes to the route's error boundary and takes the whole site down with it.
 * Deliberately silent: there is nothing for the visitor to do about it.
 */
class FieldBoundary extends Component<{ children: ReactNode }, { dead: boolean }> {
  state = { dead: false };

  static getDerivedStateFromError() {
    return { dead: true };
  }

  render() {
    return this.state.dead ? null : this.props.children;
  }
}

/**
 * Mounts the shared WebGL field once the app is entered and idle. Under reduced
 * motion we skip WebGL entirely (no GPU work, no animation) — gen rows fall back
 * to their designed static amber plate.
 */
export function FieldMount() {
  const { fieldReady, reducedMotion } = useApp();
  if (reducedMotion || !fieldReady) return null;
  return (
    <FieldBoundary>
      <Field />
    </FieldBoundary>
  );
}
