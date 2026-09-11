import { useCallback } from "react";
import type { WallCopy } from "../copy";
import { LED, LED_CABINETS, PRESETS, WALL, type LoopVariant } from "../wall.config";
import type { WallBus } from "./wall-bus";

/**
 * Everything written over the room: the title cover and its key line (the first
 * idle state only), the spec sheet bottom-left, and the two controls
 * bottom-right — the view pager and the loop switcher, which are the same three
 * keys and the same two arrows, made visible and tappable.
 *
 * The spec line is a spec sheet on purpose: pitch and viewing distance are the
 * pair a client actually asks about, so the distance is live. It is written
 * straight into its span by the camera rig through the bus — a number that
 * changes while you move must not cost a React render.
 */
export function Hud({
  copy,
  bus,
  variant,
  preset,
  started,
  onPreset,
  onLoopStep,
}: {
  copy: WallCopy;
  bus: WallBus;
  variant: LoopVariant;
  preset: number;
  started: boolean;
  onPreset: (index: number) => void;
  onLoopStep: (step: number) => void;
}) {
  const distanceRef = useCallback(
    (el: HTMLSpanElement | null) => bus.registerDistance(el, copy.decimal),
    [bus, copy.decimal],
  );

  const pitch = LED.pitchMm.toFixed(1).replace(".", copy.decimal);

  return (
    <>
      <div className={`wall-title${started ? " is-hidden" : ""}`} aria-hidden="true">
        <span className="wall-title-main">Parete</span>
        <span className="wall-title-sub">led wall</span>
        <span className="wall-title-keys">{copy.keyboardHint}</span>
      </div>

      {/* readable, not decorative: the size, the pitch and the cabinet count are
          the piece's actual content, and the distance is not a live region, so
          it is read on arrival rather than announced as it changes */}
      <div className="wall-spec">
        <span>{copy.spec.wall}</span>
        <span>
          {WALL.width} × {WALL.height} m
        </span>
        <span>
          {copy.spec.pitch} {pitch} mm
        </span>
        <span className="wall-spec-wide">
          {LED_CABINETS[0]} × {LED_CABINETS[1]} {copy.spec.cabinets}
        </span>
        <span className="wall-spec-wide">
          {copy.spec.loop}: {copy.loopTitle} / {variant}
        </span>
        <span>
          {copy.spec.distance}{" "}
          <span className="wall-spec-value" ref={distanceRef}>
            —
          </span>{" "}
          m
        </span>
      </div>

      <div className="wall-controls">
        <div className="wall-pager" role="group" aria-label={copy.viewsAria}>
          {PRESETS.map((p, index) => (
            <button
              key={p.id}
              type="button"
              className={`wall-key${index === preset ? " is-on" : ""}`}
              aria-pressed={index === preset}
              onClick={() => onPreset(index)}
            >
              {copy.views[p.id]}
            </button>
          ))}
        </div>

        <div className="wall-loop" role="group" aria-label={copy.loopAria}>
          <button
            type="button"
            className="wall-key wall-arrow"
            aria-label={copy.prevLoop}
            onClick={() => onLoopStep(-1)}
          >
            ←
          </button>
          <span className="wall-loop-name">{variant}</span>
          <button
            type="button"
            className="wall-key wall-arrow"
            aria-label={copy.nextLoop}
            onClick={() => onLoopStep(1)}
          >
            →
          </button>
        </div>
      </div>

      <span className="wall-sr" aria-live="polite">
        {copy.spec.loop} {variant} · {copy.viewsAria} {copy.views[PRESETS[preset].id]}
      </span>
    </>
  );
}
