import { useEffect } from "react";
import type { HandsInput } from "../engine/input";

/**
 * The keyboard path, always armed while the piece runs: Tab / Shift+Tab cycle
 * the focused print (and leave the stage past the last one, so the exit link
 * stays reachable), Space holds / releases it, the arrows move a held print,
 * T tears it, P pushes from the centre, `?` shows the legend, Escape exits.
 * `d` toggles the development-only skeleton overlay.
 *
 * Commands are queued on the input bus and consumed by the frame loop.
 */
interface Options {
  input: HandsInput;
  enabled: boolean;
  /** {n, total} of the focused print; n = 0 when none is focused */
  focusState: () => { n: number; total: number };
  onLegend: () => void;
  onExit: () => void;
  onDebug?: () => void;
}

export function useKeyboardHands({
  input,
  enabled,
  focusState,
  onLegend,
  onExit,
  onDebug,
}: Options): void {
  useEffect(() => {
    if (!enabled) return;
    const move = input.kbdMove;
    const isChrome = (e: KeyboardEvent) =>
      !!(e.target as HTMLElement | null)?.closest?.("a, button, input, textarea, select");

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onExit();
        return;
      }
      if (e.key === "?") {
        input.lastDevice = "keyboard";
        onLegend();
        return;
      }
      if (isChrome(e)) return;
      // Browser chords are not ours: Alt+Arrow is history, Ctrl/Cmd+key is
      // the browser's (tabs, print, find).
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      switch (e.key) {
        case "Tab": {
          const { n, total } = focusState();
          // Past the last (or before the first) print — or with nothing to
          // focus yet — let focus leave the stage: the exit link stays reachable.
          if (total === 0) return;
          if (!e.shiftKey && n >= total && n > 0) return;
          if (e.shiftKey && n <= 1) return;
          e.preventDefault();
          input.lastDevice = "keyboard";
          input.commands.push({ type: e.shiftKey ? "focusPrev" : "focusNext" });
          break;
        }
        case " ":
        case "Spacebar":
          e.preventDefault();
          if (e.repeat) return;
          input.lastDevice = "keyboard";
          input.commands.push({ type: "toggleHold" });
          break;
        case "t":
        case "T":
          if (e.repeat) return;
          input.lastDevice = "keyboard";
          input.commands.push({ type: "tear" });
          break;
        case "p":
        case "P":
          if (e.repeat) return;
          input.lastDevice = "keyboard";
          input.commands.push({ type: "push" });
          break;
        case "d":
          if (process.env.NODE_ENV === "development" && !e.repeat) onDebug?.();
          break;
        case "ArrowLeft":
          e.preventDefault();
          input.lastDevice = "keyboard";
          move.x = -1;
          break;
        case "ArrowRight":
          e.preventDefault();
          input.lastDevice = "keyboard";
          move.x = 1;
          break;
        case "ArrowUp":
          e.preventDefault();
          input.lastDevice = "keyboard";
          move.y = -1;
          break;
        case "ArrowDown":
          e.preventDefault();
          input.lastDevice = "keyboard";
          move.y = 1;
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          if (move.x < 0) move.x = 0;
          break;
        case "ArrowRight":
          if (move.x > 0) move.x = 0;
          break;
        case "ArrowUp":
          if (move.y < 0) move.y = 0;
          break;
        case "ArrowDown":
          if (move.y > 0) move.y = 0;
          break;
      }
    };
    // keyup never fires if the window loses focus mid-press.
    const release = () => {
      move.x = 0;
      move.y = 0;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", release);
      release();
    };
  }, [input, enabled, focusState, onLegend, onExit, onDebug]);
}
