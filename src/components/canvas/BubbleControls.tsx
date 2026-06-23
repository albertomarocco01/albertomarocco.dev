"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import {
  BUBBLE_CONTROLS,
  getBubbleParams,
  resetBubbleParams,
  setBubbleParam,
  subscribeBubbleParams,
  type BubbleParams,
} from "./bubble-params";

// Opt-in gate as an external-store snapshot: false on the server and during
// hydration (so SSR/first paint render null with no mismatch), then the real
// client value. Doing it this way — rather than setState-in-effect — keeps the
// component free of cascading-render lint and matches React's intended pattern.
const noopSubscribe = () => () => {};
function tunerEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    new URLSearchParams(window.location.search).has("tune") ||
    window.location.hash === "#tune"
  );
}

/**
 * A tiny live tuner for the ambient white bubble field — the in-house version of
 * the AI-Studio simulator's control panel. Drag the sliders and the field
 * updates instantly (the Aura reads bubble-params.ts every frame); values are
 * persisted to localStorage so they survive reloads. "copy" dumps the current
 * params as JSON (to bake them into BUBBLE_DEFAULTS), "reset" restores defaults.
 *
 * Opt-in so it never shows for visitors: it renders only in `next dev`, or when
 * the URL carries `?tune` (or `#tune`) — e.g. albertomarocco.dev/?tune in prod.
 * Mounted unconditionally in the layout; returns null until it decides it's on,
 * so SSR/first-paint stay null and there's no hydration mismatch.
 */
export function BubbleControls() {
  const params = useSyncExternalStore(
    subscribeBubbleParams,
    getBubbleParams,
    getBubbleParams,
  );
  const enabled = useSyncExternalStore(noopSubscribe, tunerEnabled, () => false);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(params, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard blocked — no-op */
    }
  }, [params]);

  if (!enabled) return null;

  return (
    <div className={`bubble-ctl${open ? " open" : ""}`}>
      <button
        type="button"
        className="bubble-ctl-head"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="bubble-ctl-title">✦ bubbles</span>
        <span className="bubble-ctl-toggle">{open ? "–" : "+"}</span>
      </button>

      {open && (
        <div className="bubble-ctl-body">
          {BUBBLE_CONTROLS.map((c) => {
            const value = params[c.key as keyof BubbleParams];
            return (
              <label key={c.key} className="bubble-ctl-row">
                <span className="bubble-ctl-label">{c.label}</span>
                <input
                  type="range"
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  value={value}
                  onChange={(e) =>
                    setBubbleParam(c.key, parseFloat(e.target.value))
                  }
                />
                <span className="bubble-ctl-val">{value.toFixed(2)}</span>
              </label>
            );
          })}
          <div className="bubble-ctl-actions">
            <button type="button" onClick={resetBubbleParams}>
              reset
            </button>
            <button type="button" onClick={copy}>
              {copied ? "copied" : "copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
