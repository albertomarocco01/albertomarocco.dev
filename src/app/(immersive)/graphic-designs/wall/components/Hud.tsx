import { useCallback } from "react";
import { VARIANT_PALETTE } from "@/components/canvas/aura-material";
import type { WallCopy } from "../copy";
import { LED, LED_CABINETS, LOOP, PRESETS, WALL, type LoopVariant } from "../wall.config";
import type { WallBus } from "./wall-bus";

/**
 * Each palette's accent, as its swatch shows it. `VARIANT_PALETTE` is
 * display-referred — the bytes the home page paints — so it goes to CSS as-is.
 */
const SWATCH = Object.fromEntries(
  LOOP.variants.map((name) => {
    const [r, g, b] = VARIANT_PALETTE[name].hot.map((c) => Math.round(c * 255));
    return [name, `rgb(${r} ${g} ${b})`];
  }),
) as Record<LoopVariant, string>;

/**
 * Everything written over the room: the title cover and its key line (the first
 * idle state only), the spec sheet bottom-left, the two controls
 * bottom-right — the view pager and the palette row, which are the same four
 * keys and the same two arrows, made visible and tappable — and the tour's
 * entry label, a button that stands in the room beside the wall: the camera
 * rig places it every frame through the bus, and hides it while the tour runs
 * or the camera is within arm's reach of the wall.
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
  onLoop,
  onTour,
}: {
  copy: WallCopy;
  bus: WallBus;
  variant: LoopVariant;
  preset: number;
  started: boolean;
  onPreset: (index: number) => void;
  /** a palette by index, and which way the wipe should run to reach it */
  onLoop: (index: number, sweep: number) => void;
  /** the label beside the wall: open the tour */
  onTour: () => void;
}) {
  const distanceRef = useCallback(
    (el: HTMLSpanElement | null) => bus.registerDistance(el, copy.decimal),
    [bus, copy.decimal],
  );
  const labelRef = useCallback((el: HTMLButtonElement | null) => bus.registerLabel(el), [bus]);

  const pitch = LED.pitchMm.toFixed(1).replace(".", copy.decimal);
  const current = LOOP.variants.indexOf(variant);

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
        <span className="wall-spec-wide">{copy.spec.rig}</span>
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

        {/* the tour's label: in the DOM here so it follows the pager in the Tab
            order, on screen wherever the rig puts it (it is fixed-positioned) */}
        <button
          ref={labelRef}
          type="button"
          className="wall-tour-label is-hidden"
          aria-keyshortcuts="i"
          onClick={onTour}
        >
          {copy.tour.label}
        </button>

        {/* one lamp per palette, lit in its own accent, its name under it */}
        <div className="wall-palette" role="group" aria-label={copy.loopAria}>
          {LOOP.variants.map((name, index) => (
            <button
              key={name}
              type="button"
              className={`wall-key wall-swatch${index === current ? " is-on" : ""}`}
              aria-pressed={index === current}
              onClick={() => onLoop(index, Math.sign(index - current))}
            >
              <span
                className="wall-swatch-lamp"
                style={{ backgroundColor: SWATCH[name] }}
                aria-hidden="true"
              />
              {name}
            </button>
          ))}
        </div>
      </div>

      <span className="wall-sr" aria-live="polite">
        {copy.spec.loop} {variant} · {copy.viewsAria} {copy.views[PRESETS[preset].id]}
      </span>
    </>
  );
}
