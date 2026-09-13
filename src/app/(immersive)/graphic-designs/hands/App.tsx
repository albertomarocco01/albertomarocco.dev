import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { ONBOARDING_MS, OPEN } from "./hands.config";
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
 * vocabulary is hold, tear, push — and close a hand on a print to open it.
 * Every source writes into one input bus that the scene's frame loop reads;
 * React state here changes only on phase, errors, the guide, the caption and
 * screen-reader announcements.
 */

type Phase = "gate" | "starting" | "running";
type Mode = "camera" | "pointer";
type Device = "hand" | "pointer" | "touch";
/** the onboarding card: after the gate, and with the keys on `?` */
type GuideKind = "hidden" | "auto" | "keys";

/** "a · b · c" → segments that only wrap at the separators. */
function segments(text: string) {
  return text.split(" · ").map((part, i, all) => (
    <span key={i} className="hands-legend-seg">
      {part}
      {i < all.length - 1 && <span className="hands-legend-sep"> · </span>}
    </span>
  ));
}

type Timer = ReturnType<typeof setTimeout> | null;
const clear = (ref: { current: Timer }) => {
  if (ref.current) clearTimeout(ref.current);
  ref.current = null;
};

export default function App({ copy }: { copy: HandsCopy }) {
  const router = useRouter();
  const input = useMemo(() => createInput("pointer"), []);
  const stageRef = useRef<HTMLDivElement>(null);
  const reticles = useRef<ReticleHandles>({ els: [null, null] });
  const worldRef = useRef<World | null>(null);
  const guideTimer = useRef<Timer>(null);
  const captionTimer = useRef<Timer>(null);
  const hintTimer = useRef<Timer>(null);

  const [phase, setPhase] = useState<Phase>("gate");
  const [mode, setMode] = useState<Mode>("pointer");
  const [error, setError] = useState<TrackerError | null>(null);
  const [guide, setGuide] = useState<GuideKind>("hidden");
  const [guideDevice, setGuideDevice] = useState<Device>("pointer");
  // The caption under an opened print: the text stays while it fades out.
  const [caption, setCaption] = useState({ text: "", on: false, top: 0.82 });
  const [hint, setHint] = useState({ text: "", on: false });
  const hintShown = useRef(false);
  const lastCaption = useRef(-1);
  // Keyed so a repeated identical status (P, P) still mutates the live region.
  const [announce, setAnnounce] = useState({ n: 0, text: "" });
  const say = useCallback((text: string) => setAnnounce((a) => ({ n: a.n + 1, text })), []);
  const [debug, setDebug] = useState(false);
  const reducedMotion = useReducedMotion();

  // Which wording: the running mode decides between the hands and the pointer
  // (`?` makes the keyboard the last device, and would otherwise mislabel the
  // camera); the last pointer event decides between mouse and touch.
  const device = useCallback((): Device => {
    const d = input.lastDevice;
    return input.mode === "camera" ? "hand"
      : d === "touch" || (d !== "pointer" && window.matchMedia?.("(hover: none)").matches) ? "touch"
      : "pointer";
  }, [input]);

  // The guide stays until the first gesture succeeds or ONBOARDING_MS.
  const showGuide = useCallback(
    (withKeys: boolean) => {
      setGuideDevice(device());
      setGuide(withKeys ? "keys" : "auto");
      clear(guideTimer);
      guideTimer.current = setTimeout(() => setGuide("hidden"), ONBOARDING_MS);
    },
    [device],
  );
  const hideGuide = useCallback(() => {
    clear(guideTimer);
    setGuide("hidden");
  }, []);
  useEffect(
    () => () => {
      clear(guideTimer);
      clear(captionTimer);
      clear(hintTimer);
    },
    [],
  );

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
      showGuide(false);
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
    showGuide(false);
    focusStage();
  }, [input, tracker, showGuide, focusStage]);

  const exit = useCallback(() => router.push("/graphic-designs"), [router]);

  // Escape leaves from the gate too; while running the keyboard hook owns it.
  useEffect(() => {
    if (phase === "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.repeat && !e.altKey && !e.ctrlKey && !e.metaKey) exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, exit]);

  usePointerHands(stageRef, input, phase === "running" && mode === "pointer");

  const focusState = useCallback(
    () => worldRef.current?.focusState() ?? { n: 0, total: 0 },
    [],
  );
  const isOpen = useCallback(() => worldRef.current?.isOpen() ?? false, []);
  const onLegend = useCallback(() => showGuide(true), [showGuide]);
  const onDebug = useCallback(() => setDebug((d) => !d), []);
  useKeyboardHands({
    input,
    enabled: phase === "running",
    focusState,
    isOpen,
    onLegend,
    onExit: exit,
    onDebug,
  });

  // A caption under the opened print, a beat after it settles; the hint on
  // how to close it once per visit. Cleared by the close.
  const openCaption = useCallback(
    (bottom: number) => {
      clear(captionTimer);
      clear(hintTimer);
      const top = Math.min(0.86, bottom);
      const d = device();
      const hintText = d === "hand" ? copy.hintCloseHand : d === "touch" ? copy.hintCloseTouch : copy.hintClosePointer;
      captionTimer.current = setTimeout(() => {
        const n = copy.captions.length;
        let i = Math.floor(Math.random() * n);
        if (n > 1 && i === lastCaption.current) i = (i + 1) % n; // never the same twice in a row
        lastCaption.current = i;
        setCaption({ text: copy.captions[i], on: true, top });
        if (!hintShown.current) {
          hintShown.current = true;
          setHint({ text: hintText, on: true });
          hintTimer.current = setTimeout(() => setHint((h) => ({ ...h, on: false })), OPEN.hintMs);
        }
      }, OPEN.captionDelayMs);
    },
    [copy, device],
  );
  const closeCaption = useCallback(() => {
    clear(captionTimer);
    clear(hintTimer);
    setCaption((c) => ({ ...c, on: false }));
    setHint((h) => ({ ...h, on: false }));
  }, []);

  // World events: the guide goes on the first success, the caption follows
  // the opened print, and the keyboard path gets a voice — the hands need none.
  const onEvent = useCallback(
    (e: WorldEvent) => {
      if (e.type === "held" || e.type === "torn" || e.type === "pushed" || e.type === "opened") hideGuide();
      if (e.type === "opened") openCaption(e.bottom);
      if (e.type === "closed") closeCaption();
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
        case "opened":
          say(`${label(e.body)} · ${copy.srOpened}`);
          break;
        case "closed":
          say(`${label(e.body)} · ${copy.srClosed}`);
          break;
      }
    },
    [copy, input, say, hideGuide, openCaption, closeCaption],
  );

  const guideLines =
    guideDevice === "hand" ? copy.guideHand
    : guideDevice === "touch" ? copy.guideTouch
    : copy.guidePointer;

  return (
    <div
      ref={stageRef}
      className={`hands-stage is-${phase}${guide !== "hidden" ? " is-guide" : ""}`}
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

      {/* Under the opened print: one line at random, and — once — how to close it. */}
      <div
        className={`hands-caption${caption.on ? " is-on" : ""}`}
        style={{ top: `${(caption.top * 100).toFixed(1)}%` }}
        aria-hidden="true"
      >
        <span className="hands-caption-text">{caption.text}</span>
        <span className={`hands-caption-hint${hint.on ? " is-on" : ""}`}>{hint.text}</span>
      </div>

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

      {/* The onboarding card: two lines for the device, the keys on `?`. */}
      <div className={`hands-legend${guide !== "hidden" ? " is-on" : ""}`} aria-hidden="true">
        {guideLines.map((line, i) => (
          <span key={i} className="hands-legend-line">{segments(line)}</span>
        ))}
        {guide === "keys" && <span className="hands-legend-keys">{segments(copy.keyboardHint)}</span>}
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
