import { useSyncExternalStore } from "react";
import type { DarkroomCopy } from "../copy";
import type { DarkroomMode, TrayBus } from "./tray-bus";

/**
 * Only the photograph: nothing is written over the running tray. What remains
 * is the title cover and the idle hint on the very first idle state (both go
 * at the first input, or when the current takes over), a visually hidden live
 * region that announces a fix, and — on the brush path, once the print is
 * fixed — the advance control. Subscribes to the bus itself so the engine's
 * snapshots never re-render the Canvas above it.
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

  return (
    <>
      <div className={`darkroom-title${s.started ? " is-hidden" : ""}`} aria-hidden="true">
        <span className="darkroom-title-main">Camera Oscura</span>
        <span className="darkroom-title-sub">darkroom</span>
      </div>

      <div className={`darkroom-hint${!ready || s.started ? " is-hidden" : ""}`} aria-hidden="true">
        <span className="darkroom-hint-main">{copy.hint}</span>
        <span className="darkroom-hint-keys">{copy.keyboardHint}</span>
      </div>

      {/* the percentage changes many times a second — only the fix is announced */}
      <span className="sr-only" aria-live="polite">
        {s.phase === "fixed" ? `${copy.print} ${s.index + 1} ${copy.fixed}` : ""}
      </span>

      {mode === "brush" && s.phase === "fixed" && (
        <button type="button" className="darkroom-next" onClick={onNext} aria-label={copy.nextPrintAria}>
          {copy.nextPrint}
        </button>
      )}
    </>
  );
}
