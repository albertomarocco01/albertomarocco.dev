import { useSyncExternalStore } from "react";
import type { DarkroomCopy } from "../copy";
import type { DarkroomMode, TrayBus } from "./tray-bus";

const two = (n: number) => String(n).padStart(2, "0");

/**
 * Everything written over the tray: the title cover (first idle state only),
 * the idle hint on a fresh print, the two HUD corners and, under the brush
 * path, the visible advance control. Subscribes to the bus itself so the
 * engine's snapshots never re-render the Canvas above it.
 */
export function Hud({
  bus,
  copy,
  mode,
  onNext,
}: {
  bus: TrayBus;
  copy: DarkroomCopy;
  mode: DarkroomMode | null;
  onNext: () => void;
}) {
  const s = useSyncExternalStore(bus.subscribe, bus.getSnapshot, bus.getSnapshot);
  const ready = mode !== null;
  // `fixed` holds through the drain that follows it; a manual drain keeps its percentage
  const fixed = s.phase === "fixed" || s.phase === "fixing" || (s.phase === "draining" && s.coverage >= 1);
  const pct = Math.min(100, Math.max(0, Math.round(s.coverage * 100)));
  // the hint invites a hand on a print that is still developing: gone at the
  // first input, and never over a print that is fixing, fixed or draining
  const hintHidden = !ready || s.touched || s.phase !== "developing";

  return (
    <>
      <div className={`darkroom-title${s.started ? " is-hidden" : ""}`} aria-hidden="true">
        <span className="darkroom-title-main">Camera Oscura</span>
        <span className="darkroom-title-sub">darkroom</span>
      </div>

      <div className={`darkroom-hint${hintHidden ? " is-hidden" : ""}`} aria-hidden="true">
        <span className="darkroom-hint-main">{copy.hint}</span>
        <span className="darkroom-hint-keys">{copy.keyboardHint}</span>
      </div>

      <div className="darkroom-hud darkroom-hud-left">
        {copy.print} {two(s.index + 1)} / {two(s.count)}
      </div>
      <div className="darkroom-hud darkroom-hud-right">
        {fixed ? copy.fixed : `${copy.developing} ${pct} %`}
      </div>
      {/* the percentage changes many times a second — only the fix is announced */}
      <span className="sr-only" aria-live="polite">
        {s.phase === "fixed" ? `${copy.print} ${s.index + 1} ${copy.fixed}` : ""}
      </span>

      {mode === "brush" && (
        <button type="button" className="darkroom-next" onClick={onNext} aria-label={copy.nextPrintAria}>
          {copy.nextPrint}
        </button>
      )}
    </>
  );
}
