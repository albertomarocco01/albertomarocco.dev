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

/**
 * The tuner's UI — sliders, copy, reset. Only ever loaded through the gate in
 * BubbleControls.tsx (next dev, `?tune`, `#tune`), as its own chunk: visitors
 * never download it. Drag a slider and the field updates instantly (Aura reads
 * bubble-params.ts every frame); values persist in localStorage so a tuning
 * session survives reloads. "copy" dumps the current params as JSON (to bake
 * into BUBBLE_DEFAULTS), "reset" restores the defaults.
 */
export function BubblePanel() {
  const params = useSyncExternalStore(
    subscribeBubbleParams,
    getBubbleParams,
    getBubbleParams,
  );
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
