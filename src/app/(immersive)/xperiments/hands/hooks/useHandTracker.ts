import { useCallback, useEffect, useRef } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import {
  DETECT_INTERVAL_MS,
  HAND_MODEL,
  INIT_TIMEOUT_MS,
  MEDIAPIPE_WASM,
  REACH_GAIN,
  VIDEO_ASPECT,
  VIDEO_CONSTRAINTS,
  WARMUP_MS,
} from "../hands.config";
import type { HandsInput } from "../engine/input";

/**
 * The webcam source. `start()` must be called synchronously inside the gate
 * click: getUserMedia runs first, in the user-gesture window (iOS is strict),
 * then the MediaPipe HandLandmarker loads from /public, then a rAF loop feeds
 * `detectForVideo` at ~30 Hz — only when the video frame has advanced, only
 * while the tab is visible — and writes viewport-normalised landmarks into the
 * input bus. Nothing per frame touches React.
 *
 * Teardown (`stop()`, and on unmount): cancel the rAF, close the task, stop
 * every track, remove the video, restore the console. The camera light must be
 * off within a second of leaving.
 */

export type TrackerError = "denied" | "timeout" | "unsupported";

interface Options {
  input: HandsInput;
  onReady: () => void;
  onError: (reason: TrackerError) => void;
}

// MediaPipe / TFLite route benign INFO lines through console.error (Emscripten's
// printErr), which Next's dev overlay counts as issues. Filter only these known
// markers for the sensor's lifetime; everything else passes straight through.
const MP_NOISE = [
  "TensorFlow Lite XNNPACK",
  "Created TensorFlow Lite",
  "OpenGL error checking is disabled",
  "NORM_RECT without IMAGE_DIMENSIONS",
  "gl_context.cc",
  "landmark_projection_calculator",
  "Graph successfully started",
  "GL version:",
  "hand_landmarker_graph",
  "Graph finished closing",
  "gl_context_webgl.cc",
  "Successfully destroyed",
  "W0000",
  "I0000",
];
const isMpNoise = (a: unknown) =>
  typeof a === "string" && MP_NOISE.some((m) => a.includes(m));

interface Session {
  alive: boolean;
  stream: MediaStream | null;
  video: HTMLVideoElement | null;
  landmarker: HandLandmarker | null;
  raf: number;
  timer: ReturnType<typeof setTimeout> | null;
  restoreConsole: (() => void) | null;
  /** loadModel() cannot be cancelled: the console stays patched until it settles */
  modelSettled: boolean;
}

export function useHandTracker({ input, onReady, onError }: Options) {
  const session = useRef<Session | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  }, [onReady, onError]);

  const stop = useCallback(() => {
    const s = session.current;
    if (!s) return;
    session.current = null;
    s.alive = false;
    if (s.timer) clearTimeout(s.timer);
    cancelAnimationFrame(s.raf);
    s.stream?.getTracks().forEach((t) => t.stop());
    if (s.video) {
      s.video.pause();
      s.video.srcObject = null;
      s.video.remove();
    }
    s.landmarker?.close();
    // The model load cannot be cancelled and keeps logging through
    // console.error until it settles; restore only once it has (see start()).
    if (s.modelSettled) s.restoreConsole?.();
    input.clearHands();
  }, [input]);

  const start = useCallback(() => {
    if (session.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      onErrorRef.current("unsupported");
      return;
    }
    const s: Session = {
      alive: true,
      stream: null,
      video: null,
      landmarker: null,
      raf: 0,
      timer: null,
      restoreConsole: null,
      modelSettled: false,
    };
    session.current = s;

    const fail = (reason: TrackerError) => {
      if (!s.alive) return;
      stop();
      onErrorRef.current(reason);
    };

    // getUserMedia FIRST, straight off the click (the permission prompt must
    // open inside the user-gesture window). The model loads in parallel — it
    // needs no stream — so the wait is the longer of the two, not their sum.
    const stream = navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS, audio: false });
    patchConsole(s);
    const model = loadModel(s);
    model
      .catch((e: unknown) => {
        // A stopped session throws on purpose; anything else is the model.
        if (s.alive) fail("unsupported");
        throw e;
      })
      .finally(() => {
        s.modelSettled = true;
        if (!s.alive) s.restoreConsole?.();
      })
      .catch(() => {});

    stream
      .catch((e: unknown) => {
        // Every getUserMedia rejection — denied, no device, busy (NotReadable),
        // aborted, insecure origin — means the camera is not available now.
        throw Object.assign(new Error("camera"), { reason: "denied" as TrackerError, cause: e });
      })
      .then((granted) => {
        if (!s.alive) {
          granted.getTracks().forEach((t) => t.stop());
          return;
        }
        s.stream = granted;
        // The track ending mid-run (permission revoked, device unplugged) is
        // not a stall to wait out: hand back the gate with the pointer.
        for (const t of granted.getVideoTracks()) {
          t.onended = () => {
            if (!s.alive) return;
            input.clearHands();
            fail("denied");
          };
        }
        // Everything after the grant — video, model, first frame — within 8 s.
        s.timer = setTimeout(() => fail("timeout"), INIT_TIMEOUT_MS);
        return Promise.all([attachVideo(s, granted), model]).then(() => true as const);
      })
      .then((ok) => {
        if (ok === undefined || !s.alive) return;
        if (s.timer) clearTimeout(s.timer);
        s.timer = null;
        loop(s, input);
        // A short warm-up while the reticles find the hands.
        s.timer = setTimeout(() => {
          s.timer = null;
          if (s.alive) onReadyRef.current();
        }, WARMUP_MS);
      })
      .catch((e: unknown) => {
        // "unsupported" is reserved for a missing API and a model that will
        // not load (handled above); everything on the camera side is "denied".
        const reason = (e as { reason?: TrackerError } | null)?.reason;
        fail(reason ?? (s.modelSettled && !s.landmarker ? "unsupported" : "denied"));
      });
  }, [input, stop]);

  useEffect(() => stop, [stop]);

  return { start, stop };
}

function patchConsole(s: Session): void {
  const originals = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    log: console.log,
  };
  console.error = (...a: unknown[]) => { if (!isMpNoise(a[0])) originals.error(...a); };
  console.warn = (...a: unknown[]) => { if (!isMpNoise(a[0])) originals.warn(...a); };
  console.info = (...a: unknown[]) => { if (!isMpNoise(a[0])) originals.info(...a); };
  console.log = (...a: unknown[]) => { if (!isMpNoise(a[0])) originals.log(...a); };
  s.restoreConsole = () => {
    console.error = originals.error;
    console.warn = originals.warn;
    console.info = originals.info;
    console.log = originals.log;
  };
}

/** The 1 px off-screen video. Resolves once it plays. */
function attachVideo(s: Session, stream: MediaStream): Promise<void> {
  // Off-screen but renderable: display:none / zero size can stall decoding.
  const video = document.createElement("video");
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true;
  video.setAttribute("aria-hidden", "true");
  video.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(video);
  s.video = video;
  return new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => {
      video.play().then(resolve).catch(reject);
    };
  });
}

/** The HandLandmarker, self-hosted from /public/mediapipe — no CDN at runtime. */
async function loadModel(s: Session): Promise<void> {
  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
  if (!s.alive) throw new Error("stopped");
  const create = (delegate: "GPU" | "CPU") =>
    HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: HAND_MODEL, delegate },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
  let landmarker: HandLandmarker;
  try {
    landmarker = await create("GPU");
  } catch {
    // No usable WebGL for the delegate (software GL, blocked GPU): the CPU
    // path is slower but works.
    landmarker = await create("CPU");
  }
  if (!s.alive) {
    landmarker.close();
    throw new Error("stopped");
  }
  s.landmarker = landmarker;
}

/** The detection loop. Results go into the input bus; React never sees them. */
function loop(s: Session, input: HandsInput): void {
  const video = s.video!;
  const landmarker = s.landmarker!;
  const buffers = [new Float32Array(42), new Float32Array(42)];
  // Per-slot wrist position (viewport-normalised) from the last frame, for
  // keeping a hand in the slot it had — MediaPipe's result order can swap.
  const prev: ({ u: number; v: number } | null)[] = [null, null];
  let lastVideoTime = -1;
  let lastDetect = 0;

  const tick = () => {
    if (!s.alive) return;
    s.raf = requestAnimationFrame(tick);
    if (document.visibilityState !== "visible") return;
    const now = performance.now();
    if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
    if (now - lastDetect < DETECT_INTERVAL_MS) return;
    lastVideoTime = video.currentTime;
    lastDetect = now;

    let result;
    try {
      result = landmarker.detectForVideo(video, now);
    } catch {
      return;
    }
    const hands = result.landmarks ?? [];

    // Mirror (selfie) + "cover"-map the 4:3 frame onto the viewport aspect.
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const A = vw / Math.max(1, vh);
    const Av = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : VIDEO_ASPECT;
    const gx = (A >= Av ? 1 : Av / A) * REACH_GAIN;
    const gy = (A >= Av ? A / Av : 1) * REACH_GAIN;

    const mapped = hands.slice(0, 2).map((lm) => {
      const pts = new Float32Array(42);
      for (let i = 0; i < 21; i++) {
        const p = lm[i];
        pts[i * 2] = 0.5 + (1 - p.x - 0.5) * gx;
        pts[i * 2 + 1] = 0.5 + (p.y - 0.5) * gy;
      }
      return { pts, u: pts[0], v: pts[1] };
    });

    // Assign detections to slots: keep each hand where it was.
    const assignment: (number | null)[] = [null, null];
    if (mapped.length === 2 && prev[0] && prev[1]) {
      const d = (i: number, j: number) => Math.hypot(mapped[i].u - prev[j]!.u, mapped[i].v - prev[j]!.v);
      const straight = d(0, 0) + d(1, 1);
      const swapped = d(0, 1) + d(1, 0);
      if (straight <= swapped) { assignment[0] = 0; assignment[1] = 1; }
      else { assignment[0] = 1; assignment[1] = 0; }
    } else {
      const free = [true, true];
      const pending: number[] = [];
      mapped.forEach((m, i) => {
        let best = -1;
        let bestD = 0.3;
        for (let j = 0; j < 2; j++) {
          if (!free[j] || !prev[j]) continue;
          const dd = Math.hypot(m.u - prev[j]!.u, m.v - prev[j]!.v);
          if (dd < bestD) { bestD = dd; best = j; }
        }
        if (best >= 0) { assignment[best] = i; free[best] = false; }
        else pending.push(i);
      });
      for (const i of pending) {
        const j = free.indexOf(true);
        if (j >= 0) { assignment[j] = i; free[j] = false; }
      }
    }

    for (let j = 0; j < 2; j++) {
      const i = assignment[j];
      if (i === null) {
        input.slots[j] = null;
        input.debugHands[j] = null;
        prev[j] = null;
        continue;
      }
      buffers[j].set(mapped[i].pts);
      input.slots[j] = { kind: "landmarks", pts: buffers[j], t: now };
      input.debugHands[j] = buffers[j];
      prev[j] = { u: mapped[i].u, v: mapped[i].v };
    }
    if (hands.length) input.lastDevice = "hand";
  };
  s.raf = requestAnimationFrame(tick);
}
