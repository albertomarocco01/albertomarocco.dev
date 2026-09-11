"use client";

import dynamic from "next/dynamic";
import type { WallCopy } from "./copy";
import "./wall.css";

// The experience is browser-only (WebGL, sensors, rAF loops). ssr:false keeps
// the whole tree — three/r3f/drei and anything heavier — off the server and out
// of every shared chunk. Next 16 forbids ssr:false inside a Server Component, so
// this dynamic() lives here, in a "use client" file.
const App = dynamic(() => import("./App"), { ssr: false });

// `.wall` scopes the demo's stylesheet and restores a normal cursor over the
// site-wide `body { cursor: none }` (the immersive route group has no Cursor,
// topbar, footer or loader veil).
export function WallClient({ copy }: { copy: WallCopy }) {
  return (
    <div className="wall">
      <App copy={copy} />
    </div>
  );
}
