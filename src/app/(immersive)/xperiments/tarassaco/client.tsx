"use client";

import dynamic from "next/dynamic";
import "./tarassaco.css";

// The whole experience is browser-only: getUserMedia (camera + mic), AudioContext,
// MediaPipe WASM and a requestAnimationFrame physics loop. ssr:false keeps the
// tree off the server entirely. Next 16 forbids ssr:false inside a Server
// Component, so this dynamic() must live here, in a 'use client' file.
const App = dynamic(() => import("./App"), { ssr: false });

// `.tarassaco` scopes the ported stylesheet (a hand-written subset of the utility
// classes the original Vite app used via Tailwind) so none of it leaks into the
// site's hand-authored design system, and restores a normal cursor over the
// site-wide `cursor: none`.
export function TarassacoClient() {
  return (
    <div className="tarassaco">
      <App />
    </div>
  );
}
