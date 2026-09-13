import { useCallback, useEffect, useRef } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import {
  CONSOLE_FILTER_GRACE_MS,
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
 * The webcam source, in two halves that no longer wait for each other:
 *
 * - The **model** (the MediaPipe wasm, ~12 MB, and the hand landmarker task,
 *   ~8 MB) needs no permission, so it starts loading when the gate mounts —
 *   `warm()`, from an effect — and lives for the life of the mount, shared by
 *   every camera start. The task file is fetched here with a progress count
 *   (`onProgress`, whole percent) and streamed into the landmarker; the gate
 *   shows the count if the visitor clicks before it has landed. A browser
 *   asking to save data waits for the click instead.
 * - The **camera**: `start()` must be called synchronously inside the gate
 *   click (getUserMedia runs in the user-gesture window — iOS is strict). The
 *   8 s timeout covers the camera alone: permission, stream, first frame.
 *   Then the session waits for the model, however long the network takes, and
 *   a rAF loop feeds `detectForVideo` at ~30 Hz — only when the video frame has
 *   advanced, only while the tab is visible — writing viewport-normalised
 *   landmarks into the input bus. Nothing per frame touches React.
 *
 * Teardown: `stop()` (and on unmount) cancels the rAF, stops every track and
 * removes the video — the camera light must be off within a second of leaving.
 * The landmarker is closed on unmount; a load still in flight is aborted and
 * released when it settles.
 */

export type TrackerError = "denied" | "timeout" | "unsupported" | "model";

interface Options {
  input: HandsInput;
  onReady: () => void;
  onError: (reason: TrackerError) => void;
  /** whole percent of the model download, null once it is done (or unknown) */
  onProgress: (pct: number | null) => void;
}

/* ---- console filter ------------------------------------------------------ */

// MediaPipe / TFLite route benign INFO lines through console.error (Emscripten's
// printErr), which Next's dev overlay counts as issues. Filter only these known
// markers while a landmarker is loading or alive; everything else passes.
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

// One patch for the page, reference-counted: a load still settling from a
// previous mount and a new mount's load share it, so neither can restore the
// console from under the other. Restored when the last lease is released.
let filterLeases = 0;
let unpatchConsole: (() => void) | null = null;

function leaseConsoleFilter(): () => void {
  if (filterLeases++ === 0) {
    const o = { error: console.error, warn: console.warn, info: console.info, log: console.log };
    console.error = (...a: unknown[]) => { if (!isMpNoise(a[0])) o.error(...a); };
    console.warn = (...a: unknown[]) => { if (!isMpNoise(a[0])) o.warn(...a); };
    console.info = (...a: unknown[]) => { if (!isMpNoise(a[0])) o.info(...a); };
    console.log = (...a: unknown[]) => { if (!isMpNoise(a[0])) o.log(...a); };
    unpatchConsole = () => {
      console.error = o.error;
      console.warn = o.warn;
      console.info = o.info;
      console.log = o.log;
    };
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--filterLeases === 0) {
      unpatchConsole?.();
      unpatchConsole = null;
    }
  };
}

/* ---- the model ----------------------------------------------------------- */

interface Warm {
  promise: Promise<HandLandmarker>;
  landmarker: HandLandmarker | null;
  settled: boolean;
  failed: boolean;
  /** the mount is gone: whatever resolves now is closed at once */
  disposed: boolean;
  abort: AbortController;
  releaseConsole: () => void;
}

/**
 * The task file, fetched with a byte count and re-streamed for MediaPipe: the
 * download runs in parallel with the wasm load (which reads the stream only
 * once the runtime is up), and the count is exact. A content-encoded response
 * (rare for a .task) would make the encoded length undershoot: the percent is
 * clamped under 100 until the stream ends.
 */
async function fetchModel(
  signal: AbortSignal,
  onProgress: (pct: number | null) => void,
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const res = await fetch(HAND_MODEL, { signal });
  if (!res.ok || !res.body) throw new Error(`model ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  const source = res.body.getReader();
  let loaded = 0;
  let last = -1;
  const report = (pct: number | null) => {
    if (pct === last) return;
    last = pct ?? -1;
    onProgress(pct);
  };
  if (total > 0) report(0);
  const out = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (;;) {
          const { done, value } = await source.read();
          if (done) break;
          loaded += value.byteLength;
          controller.enqueue(value);
          if (total > 0) report(Math.min(99, Math.floor((loaded / total) * 100)));
        }
        controller.close();
        report(null);
      } catch (e) {
        controller.error(e);
        report(null);
      }
    },
  });
  return out.getReader();
}

/** The HandLandmarker, self-hosted from /public/mediapipe — no CDN at runtime. */
async function loadLandmarker(w: Warm, onProgress: (pct: number | null) => void): Promise<HandLandmarker> {
  // forVisionTasks only resolves paths (and probes SIMD); the wasm itself is
  // fetched by createFromOptions, alongside the model stream started here.
  const [vision, model] = await Promise.all([
    FilesetResolver.forVisionTasks(MEDIAPIPE_WASM),
    fetchModel(w.abort.signal, onProgress),
  ]);
  const create = (delegate: "GPU" | "CPU", modelAssetBuffer: ReadableStreamDefaultReader<Uint8Array>) =>
    HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetBuffer, delegate },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
  try {
    return await create("GPU", model);
  } catch (e) {
    // No usable WebGL for the delegate (software GL, blocked GPU): the CPU
    // path is slower but works. The stream was consumed: fetch again (the
    // browser cache has it now).
    if (w.abort.signal.aborted) throw e;
    return create("CPU", await fetchModel(w.abort.signal, onProgress));
  }
}

function startWarm(onProgress: (pct: number | null) => void): Warm {
  const w: Warm = {
    promise: null as unknown as Promise<HandLandmarker>,
    landmarker: null,
    settled: false,
    failed: false,
    disposed: false,
    abort: new AbortController(),
    releaseConsole: leaseConsoleFilter(),
  };
  w.promise = loadLandmarker(w, onProgress).then(
    (lm) => {
      w.settled = true;
      if (w.disposed) {
        lm.close();
        w.releaseConsole();
        throw new Error("disposed");
      }
      w.landmarker = lm;
      return lm;
    },
    (e: unknown) => {
      // Nothing is loading any more: the filter goes now, not at unmount (a
      // retry replaces this warm-up, which would otherwise never be released).
      w.settled = true;
      w.failed = true;
      w.releaseConsole();
      throw e;
    },
  );
  w.promise.catch(() => {}); // observed by start(); never unhandled
  return w;
}

/** Unmount: close the landmarker, or abort the load and release once it settles. */
function disposeWarm(w: Warm): void {
  w.disposed = true;
  if (w.settled) {
    // The graph logs its own closing lines: release right after.
    w.landmarker?.close();
    w.landmarker = null;
    w.releaseConsole();
    return;
  }
  w.abort.abort();
  // A wasm load that never settles must not keep the console patched forever.
  const grace = setTimeout(w.releaseConsole, CONSOLE_FILTER_GRACE_MS);
  w.promise.catch(() => {}).finally(() => clearTimeout(grace));
}

/* ---- the camera session -------------------------------------------------- */

interface Session {
  alive: boolean;
  stream: MediaStream | null;
  video: HTMLVideoElement | null;
  landmarker: HandLandmarker | null;
  raf: number;
  timer: ReturnType<typeof setTimeout> | null;
}

export function useHandTracker({ input, onReady, onError, onProgress }: Options) {
  const session = useRef<Session | null>(null);
  const warmRef = useRef<Warm | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
    onProgressRef.current = onProgress;
  }, [onReady, onError, onProgress]);

  // The model, once per mount; a failed load is replaced on the next start().
  const warm = useCallback((): Warm => {
    const current = warmRef.current;
    if (current && !current.failed) return current;
    const w = startWarm((pct) => onProgressRef.current(pct));
    warmRef.current = w;
    return w;
  }, []);

  useEffect(() => {
    // No permission needed: start now unless the visitor asked to save data,
    // in which case the ~20 MB wait for the click.
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (!saveData && typeof WebAssembly !== "undefined") warm();
    return () => {
      if (warmRef.current) disposeWarm(warmRef.current);
      warmRef.current = null;
    };
  }, [warm]);

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
    // The landmarker belongs to the mount (warm), not the session.
    s.landmarker = null;
    input.clearHands();
  }, [input]);

  const start = useCallback(() => {
    if (session.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      onErrorRef.current("unsupported");
      return;
    }
    const s: Session = { alive: true, stream: null, video: null, landmarker: null, raf: 0, timer: null };
    session.current = s;

    const fail = (reason: TrackerError) => {
      if (!s.alive) return;
      stop();
      onErrorRef.current(reason);
    };

    // getUserMedia FIRST, straight off the click (the permission prompt must
    // open inside the user-gesture window). The model is already loading —
    // since the gate mounted, or from here after a failure / under save-data.
    const stream = navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS, audio: false });
    const model = warm().promise;
    // The camera alone — permission, stream, first frame — within 8 s. The
    // model has no clock: its progress shows in the gate while it downloads.
    s.timer = setTimeout(() => fail("timeout"), INIT_TIMEOUT_MS);

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
        return attachVideo(s, granted).then(() => true as const);
      })
      .then((ok) => {
        if (ok === undefined || !s.alive) return;
        // The camera is up: the timeout is met. Now the model, however long.
        if (s.timer) clearTimeout(s.timer);
        s.timer = null;
        return model.then(
          (lm) => lm,
          (e: unknown) => {
            throw Object.assign(new Error("model"), { reason: "model" as TrackerError, cause: e });
          },
        );
      })
      .then((lm) => {
        if (!lm || !s.alive) return;
        s.landmarker = lm;
        loop(s, input);
        // A short warm-up while the reticles find the hands.
        s.timer = setTimeout(() => {
          s.timer = null;
          if (s.alive) onReadyRef.current();
        }, WARMUP_MS);
      })
      .catch((e: unknown) => {
        // The camera side is "denied", the model side "model"; anything else
        // (a video that will not play) reads as the camera not responding.
        const reason = (e as { reason?: TrackerError } | null)?.reason;
        fail(reason ?? "timeout");
      });
  }, [input, stop, warm]);

  useEffect(() => stop, [stop]);

  return { start, stop };
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

/** The detection loop. Results go into the input bus; React never sees them. */
function loop(s: Session, input: HandsInput): void {
  const video = s.video!;
  const landmarker = s.landmarker!;
  const buffers = [new Float32Array(42), new Float32Array(42)];
  // The mapped detections, reused every detection (≤ 2 hands).
  const mapped = [
    { pts: new Float32Array(42), u: 0, v: 0 },
    { pts: new Float32Array(42), u: 0, v: 0 },
  ];
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

    const count = Math.min(2, hands.length);
    for (let h = 0; h < count; h++) {
      const lm = hands[h];
      const m = mapped[h];
      for (let i = 0; i < 21; i++) {
        const p = lm[i];
        m.pts[i * 2] = 0.5 + (1 - p.x - 0.5) * gx;
        m.pts[i * 2 + 1] = 0.5 + (p.y - 0.5) * gy;
      }
      m.u = m.pts[0];
      m.v = m.pts[1];
    }

    // Assign detections to slots: keep each hand where it was.
    const assignment: (number | null)[] = [null, null];
    if (count === 2 && prev[0] && prev[1]) {
      const d = (i: number, j: number) => Math.hypot(mapped[i].u - prev[j]!.u, mapped[i].v - prev[j]!.v);
      const straight = d(0, 0) + d(1, 1);
      const swapped = d(0, 1) + d(1, 0);
      if (straight <= swapped) { assignment[0] = 0; assignment[1] = 1; }
      else { assignment[0] = 1; assignment[1] = 0; }
    } else {
      const free = [true, true];
      const pending: number[] = [];
      for (let i = 0; i < count; i++) {
        const m = mapped[i];
        let best = -1;
        let bestD = 0.3;
        for (let j = 0; j < 2; j++) {
          if (!free[j] || !prev[j]) continue;
          const dd = Math.hypot(m.u - prev[j]!.u, m.v - prev[j]!.v);
          if (dd < bestD) { bestD = dd; best = j; }
        }
        if (best >= 0) { assignment[best] = i; free[best] = false; }
        else pending.push(i);
      }
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
