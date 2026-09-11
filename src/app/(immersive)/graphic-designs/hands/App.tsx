import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { LEGEND_MS } from "./hands.config";
import { createInput } from "./engine/input";
import type { Body, World, WorldEvent } from "./engine/world";
import { useHandTracker, type TrackerError } from "./hooks/useHandTracker";
import { usePointerHands } from "./hooks/usePointerHands";
import { useKeyboardHands } from "./hooks/useKeyboardHands";
import { HandsScene, type ReticleHandles } from "./components/HandsScene";
import { Reticles } from "./components/Reticles";
import { Gate } from "./components/Gate";
import { DebugSkeleton } from "./components/DebugSkeleton";
import type { HandsCopy } from "./copy";

/**
 * Mani — Hands. The prints drift behind a veil while the gate asks for the
 * camera; once the hands (or the pointer) are in, the veil lifts and the whole
 * vocabulary is hold, tear, push. Every source writes into one input bus that
 * the scene's frame loop reads; React state here changes only on phase,
 * errors, the legend and screen-reader announcements.
 */

type Phase = "gate" | "starting" | "running";
type Mode = "camera" | "pointer";
type LegendKind = "hidden" | "mode" | "keys";

/** "a · b · c" → segments that only wrap at the separators. */
function segments(text: string) {
  return text.split(" · ").map((part, i, all) => (
    <span key={i} className="hands-legend-seg">
      {part}
      {i < all.length - 1 && <span className="hands-legend-sep"> · </span>}
    </span>
  ));
}

export default function App({ copy }: { copy: HandsCopy }) {
  const router = useRouter();
  const input = useMemo(() => createInput("pointer"), []);
  const stageRef = useRef<HTMLDivElement>(null);
  const reticles = useRef<ReticleHandles>({ els: [null, null] });
  const worldRef = useRef<World | null>(null);
  const legendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<Phase>("gate");
  const [mode, setMode] = useState<Mode>("pointer");
  const [error, setError] = useState<TrackerError | null>(null);
  const [legend, setLegend] = useState<LegendKind>("hidden");
  const [legendDevice, setLegendDevice] = useState<"hand" | "pointer" | "touch">("pointer");
  // Keyed so a repeated identical status (P, P) still mutates the live region.
  const [announce, setAnnounce] = useState({ n: 0, text: "" });
  const say = useCallback((text: string) => setAnnounce((a) => ({ n: a.n + 1, text })), []);
  const [debug, setDebug] = useState(false);
  const reducedMotion = useReducedMotion();

  const showLegend = useCallback(
    (withKeys: boolean) => {
      const d = input.lastDevice;
      setLegendDevice(
        d === "hand" ? "hand"
        : d === "touch" || (d !== "pointer" && window.matchMedia?.("(hover: none)").matches) ? "touch"
        : "pointer",
      );
      setLegend(withKeys ? "keys" : "mode");
      if (legendTimer.current) clearTimeout(legendTimer.current);
      legendTimer.current = setTimeout(() => setLegend("hidden"), LEGEND_MS);
    },
    [input],
  );
  useEffect(() => () => { if (legendTimer.current) clearTimeout(legendTimer.current); }, []);

  const registerReticles = useCallback((els: (HTMLDivElement | null)[]) => {
    reticles.current.els = els;
  }, []);

  const focusStage = useCallback(() => {
    stageRef.current?.focus({ preventScroll: true });
  }, []);

  const tracker = useHandTracker({
    input,
    onReady: () => {
      setPhase("running");
      showLegend(false);
      focusStage();
    },
    onError: (reason) => {
      // Back to the gate under the dialog: the camera button is live again
      // for a retry, and the pointer is one click away.
      setError(reason);
      setPhase("gate");
    },
  });

  const startCamera = useCallback(() => {
    input.setMode("camera", "hand");
    setMode("camera");
    setPhase("starting");
    tracker.start(); // getUserMedia inside the click
  }, [input, tracker]);

  const retryCamera = useCallback(() => {
    setError(null);
    startCamera();
  }, [startCamera]);

  const startPointer = useCallback(() => {
    tracker.stop();
    const coarse = window.matchMedia?.("(hover: none)").matches;
    input.setMode("pointer", coarse ? "touch" : "pointer");
    setMode("pointer");
    setError(null);
    setPhase("running");
    showLegend(false);
    focusStage();
  }, [input, tracker, showLegend, focusStage]);

  const exit = useCallback(() => router.push("/graphic-designs"), [router]);

  // Escape leaves from the gate too; while running the keyboard hook owns it.
  useEffect(() => {
    if (phase === "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, exit]);

  usePointerHands(stageRef, input, phase === "running" && mode === "pointer");

  const focusState = useCallback(
    () => worldRef.current?.focusState() ?? { n: 0, total: 0 },
    [],
  );
  const onLegend = useCallback(() => showLegend(true), [showLegend]);
  const onDebug = useCallback(() => setDebug((d) => !d), []);
  useKeyboardHands({
    input,
    enabled: phase === "running",
    focusState,
    onLegend,
    onExit: exit,
    onDebug,
  });

  // Screen-reader status for the keyboard path only — the hands need no voice.
  const onEvent = useCallback(
    (e: WorldEvent) => {
      if (input.lastDevice !== "keyboard") return;
      const w = worldRef.current;
      const label = (body: Body) => {
        const { n, total } = w ? w.focusIndex(body) : { n: 0, total: 0 };
        return copy.srCard.replace("{n}", String(n)).replace("{total}", String(total));
      };
      switch (e.type) {
        case "focus":
          say(e.body ? label(e.body) : "");
          break;
        case "held":
          say(`${label(e.body)} · ${copy.srHeld}`);
          break;
        case "released":
          say(`${label(e.body)} · ${copy.srReleased}`);
          break;
        case "torn":
          say(`${label(e.body)} · ${copy.srTorn}`);
          break;
        case "pushed":
          say(copy.srPushed);
          break;
      }
    },
    [copy, input, say],
  );

  const legendText =
    legendDevice === "hand" ? copy.legend
    : legendDevice === "touch" ? copy.legendTouch
    : copy.legendPointer;

  return (
    <div
      ref={stageRef}
      className={`hands-stage is-${phase}`}
      role="application"
      aria-label={copy.aria}
      tabIndex={0}
    >
      <HandsScene
        copy={copy}
        input={input}
        reticles={reticles}
        worldRef={worldRef}
        reducedMotion={reducedMotion}
        onEvent={onEvent}
      />
      <Reticles register={registerReticles} />

      {phase !== "running" && (
        <Gate
          copy={copy}
          starting={phase === "starting"}
          onCamera={startCamera}
          onPointer={startPointer}
        />
      )}

      <Link href="/graphic-designs" className="hands-exit">
        {copy.exit}
      </Link>

      {/* Sensor failure: explain, offer the pointer — never a dead gate. */}
      {error && (
        <div className="hands-error" role="alertdialog" aria-modal="true" aria-labelledby="hands-error-title">
          <div className="hands-error-card">
            <p id="hands-error-title" className="hands-error-title">
              {error === "timeout" ? copy.errTimeout : error === "unsupported" ? copy.errUnsupported : copy.errDenied}
            </p>
            <p className="hands-error-body">{copy.errBody}</p>
            <div className="hands-error-actions">
              <button type="button" className="hands-error-btn" onClick={startPointer} autoFocus>
                {copy.errButton}
              </button>
              {error !== "unsupported" && (
                <button type="button" className="hands-error-alt" onClick={retryCamera}>
                  {copy.errRetry}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`hands-legend${legend !== "hidden" ? " is-on" : ""}`} aria-hidden="true">
        <span className="hands-legend-line">{segments(legendText)}</span>
        {legend === "keys" && <span className="hands-legend-keys">{segments(copy.keyboardHint)}</span>}
      </div>

      {/* The live region itself stays mounted; a keyed child is replaced on
          every status, so an identical repeat is still a childList mutation
          the region reports. */}
      <p className="sr-only" aria-live="polite">
        <span key={announce.n}>{announce.text}</span>
      </p>

      {debug && process.env.NODE_ENV === "development" && <DebugSkeleton input={input} />}
    </div>
  );
}
